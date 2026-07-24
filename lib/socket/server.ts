import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { sha256 } from "@/lib/auth/crypto";
import {
  appendMessage,
  endConversation,
  getConversation,
  isParticipant,
  listMessages,
} from "@/lib/chat/service";
import { setIo, emitToConversation } from "./registry";

type SocketUser = { id: string; role: string; displayName: string };

async function userFromCookieHeader(cookieHeader: string | undefined): Promise<SocketUser | null> {
  if (!cookieHeader) return null;
  const match = /(?:^|;\s*)hiyvaru_session=([^;]+)/.exec(cookieHeader);
  if (!match) return null;
  const db = getDb();
  const rows = await db
    .select({ user: schema.users, session: schema.sessions })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sha256(decodeURIComponent(match[1]))))
    .limit(1);
  const row = rows[0];
  if (!row || row.session.expiresAt.getTime() < Date.now()) return null;
  if (row.user.status !== "active") return null;
  return { id: row.user.id, role: row.user.role, displayName: row.user.displayName };
}

// live socket count per user — used to flip listeners offline when they vanish
const liveSockets = new Map<string, number>();

export function attachSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer);
  setIo(io);

  io.use(async (socket, next) => {
    const user = await userFromCookieHeader(socket.handshake.headers.cookie);
    if (!user) return next(new Error("unauthorized"));
    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(`user:${user.id}`);
    liveSockets.set(user.id, (liveSockets.get(user.id) ?? 0) + 1);

    socket.on("conv:join", async (convId: string, ack?: (r: unknown) => void) => {
      const conv = await getConversation(String(convId));
      if (!conv || !isParticipant(conv, user.id) || conv.deletedAt) {
        return ack?.({ error: "not_found" });
      }
      socket.join(`conv:${conv.id}`);
      const history = await listMessages(conv);
      // Anonymity: clients only ever see displayName-level identity.
      ack?.({
        ok: true,
        ended: !!conv.endedAt,
        escalated: conv.escalated,
        messages: history.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          text: m.text,
          at: m.createdAt.toISOString(),
        })),
      });
    });

    socket.on(
      "conv:message",
      async (payload: { conversationId: string; text: string }, ack?: (r: unknown) => void) => {
        const text = String(payload?.text ?? "").slice(0, 4000).trim();
        if (!text) return ack?.({ error: "empty" });
        const conv = await getConversation(String(payload.conversationId));
        if (!conv || !isParticipant(conv, user.id) || conv.endedAt || conv.deletedAt) {
          return ack?.({ error: "closed" });
        }
        const id = await appendMessage(conv, user.id, text);
        emitToConversation(conv.id, "conv:message", {
          id,
          senderId: user.id,
          text,
          at: new Date().toISOString(),
        });
        ack?.({ ok: true, id });
      },
    );

    socket.on("conv:typing", async (payload: { conversationId: string; typing: boolean }) => {
      const conv = await getConversation(String(payload?.conversationId));
      if (!conv || !isParticipant(conv, user.id)) return;
      socket.to(`conv:${conv.id}`).emit("conv:typing", { userId: user.id, typing: !!payload.typing });
    });

    socket.on("conv:end", async (convId: string, ack?: (r: unknown) => void) => {
      const conv = await getConversation(String(convId));
      if (!conv || !isParticipant(conv, user.id)) return ack?.({ error: "not_found" });
      await endConversation(conv.id);
      emitToConversation(conv.id, "conv:ended", { by: user.id });
      ack?.({ ok: true });
    });

    socket.on("disconnect", async () => {
      const n = (liveSockets.get(user.id) ?? 1) - 1;
      if (n <= 0) {
        liveSockets.delete(user.id);
        // Listener with no live sockets can't take chats — flip availability
        // off so the matcher never assigns a member to an empty room.
        if (user.role === "listener") {
          await getDb()
            .update(schema.listenerProfiles)
            .set({ available: false })
            .where(eq(schema.listenerProfiles.userId, user.id));
        }
      } else {
        liveSockets.set(user.id, n);
      }
    });
  });

  return io;
}
