import type { Server } from "socket.io";

// The Socket.IO server lives on the custom server (server.ts). API routes and
// the queue worker emit through this registry. In `next dev`-only runs (no
// custom server) emits become no-ops — real-time features need server.ts.

const g = globalThis as unknown as { __hiyvaruIo?: Server };

export function setIo(io: Server): void {
  g.__hiyvaruIo = io;
}

export function getIo(): Server | null {
  return g.__hiyvaruIo ?? null;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  getIo()?.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(convId: string, event: string, payload: unknown): void {
  getIo()?.to(`conv:${convId}`).emit(event, payload);
}
