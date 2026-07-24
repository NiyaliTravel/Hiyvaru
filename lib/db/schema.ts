import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Hiyvaru schema (spec §6). Written once for all phases so migrations stay
// boring. Safety-critical columns are commented — do not change them casually.
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role", { enum: ["member", "listener", "moderator", "admin"] })
      .notNull()
      .default("member"),
    // SAFETY: phone stored ONLY as HMAC hash — never plaintext. Lookup at
    // login re-hashes the typed number. Admin cannot read numbers back.
    phoneHash: text("phone_hash"),
    email: text("email"),
    // SAFETY: 16+ rule. Full DOB is validated at signup then discarded;
    // only the birth YEAR is stored (anonymity/data-minimalism).
    birthYear: integer("birth_year").notNull(),
    displayName: text("display_name").notNull(),
    lang: text("lang", { enum: ["dv", "en", "both"] }).notNull().default("dv"),
    status: text("status", {
      enum: ["active", "suspended", "banned", "pending_verification"],
    })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_phone_hash_idx").on(t.phoneHash),
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_display_name_idx").on(t.displayName),
  ],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(token) — raw token only in the cookie
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // destination is phoneHash or lowercased email
    destination: text("destination").notNull(),
    channel: text("channel", { enum: ["sms", "email"] }).notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("otp_destination_idx").on(t.destination)],
);

export const listenerProfiles = pgTable("listener_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // SAFETY: a listener may take chats ONLY when verifiedAt is set (admin ID
  // review) AND trainingCompletedAt is set (100% quiz). Enforced in matching.
  verifiedAt: timestamp("verified_at"),
  docType: text("doc_type", { enum: ["national_id", "passport"] }),
  docExpiry: text("doc_expiry"), // ISO date string; only retained metadata
  trainingCompletedAt: timestamp("training_completed_at"),
  level: text("level", { enum: ["applicant", "probation", "full", "mentor"] })
    .notNull()
    .default("applicant"),
  probationChatsLeft: integer("probation_chats_left").notNull().default(10),
  dailyCapMinutes: integer("daily_cap_minutes").notNull().default(240),
  available: boolean("available").notNull().default(false),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ID documents held ONLY between application and admin decision, then purged.
export const idDocuments = pgTable("id_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["id_front", "selfie"] }).notNull(),
  // SAFETY: AES-256-GCM ciphertext of the image, key = ID_DOC_MASTER_KEY.
  // Purged (row hard-deleted) immediately after the approve/reject decision.
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id),
    listenerId: uuid("listener_id")
      .notNull()
      .references(() => users.id),
    lang: text("lang", { enum: ["dv", "en"] }).notNull(),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    // SAFETY: member hard-delete removes message rows AND the wrapped key
    // below, making any stray ciphertext undecryptable. deletedAt is the only
    // trace that a conversation existed (no content, for stats/abuse windows).
    deletedAt: timestamp("deleted_at"),
    // Per-conversation AES-256 key, wrapped by MESSAGE_MASTER_KEY.
    wrappedKey: text("wrapped_key"),
    keyIv: text("key_iv"),
    escalated: boolean("escalated").notNull().default(false),
    moderatorUnlocked: boolean("moderator_unlocked").notNull().default(false),
  },
  (t) => [
    index("conversations_member_idx").on(t.memberId),
    index("conversations_listener_idx").on(t.listenerId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    // SAFETY: AES-256-GCM ciphertext only; plaintext never touches the DB.
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    flagged: boolean("flagged").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId)],
);

export const escalations = pgTable("escalations", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  trigger: text("trigger", { enum: ["listener_button", "keyword_confirmed", "member_button"] }).notNull(),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  moderatorId: uuid("moderator_id").references(() => users.id),
  actionsTaken: text("actions_taken"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id),
  targetId: uuid("target_id")
    .notNull()
    .references(() => users.id),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["open", "reviewing", "actioned", "dismissed"] })
    .notNull()
    .default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  memberId: uuid("member_id")
    .notNull()
    .references(() => users.id),
  listenerId: uuid("listener_id")
    .notNull()
    .references(() => users.id),
  stars: integer("stars").notNull(), // 1..5, validated in app code
  flag: boolean("flag").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// favourite = member wants this listener again; blocked = never match again
export const matchPreferences = pgTable(
  "match_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listenerId: uuid("listener_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["favourite", "never_again"] }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("match_pref_unique").on(t.memberId, t.listenerId)],
);

export const keywordFlags = pgTable("keyword_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => messages.id, {
    onDelete: "set null",
  }),
  matchedTerm: text("matched_term").notNull(),
  lexicon: text("lexicon", { enum: ["risk", "contact_info"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Editable config (risk lexicons, caps, announcement banner)
export const config = pgTable("config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    subjectType: text("subject_type"),
    subjectId: text("subject_id"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_action_idx").on(t.action)],
);

// Listener training progress (Phase C)
export const trainingProgress = pgTable(
  "training_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleSlug: text("module_slug").notNull(),
    quizScore: integer("quiz_score"), // percent; 100 required to pass
    completedAt: timestamp("completed_at"),
  },
  (t) => [uniqueIndex("training_user_module").on(t.userId, t.moduleSlug)],
);

// Listener Lounge posts (Phase D)
export const loungePosts = pgTable("lounge_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  body: text("body").notNull(),
  kind: text("kind", { enum: ["post", "debrief"] }).notNull().default("post"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subscription: jsonb("subscription").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
