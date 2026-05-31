// ─── Enums ───────────────────────────────────────────────────────────────────

export enum Plan {
  FREE = "FREE",
  STARTER = "STARTER",
  PRO = "PRO",
  TEAM = "TEAM",
}

export enum Platform {
  CHATGPT = "CHATGPT",
  CLAUDE = "CLAUDE",
  GEMINI = "GEMINI",
  OTHER = "OTHER",
}

export enum ConnectionStatus {
  ACTIVE = "ACTIVE",
  DISCONNECTED = "DISCONNECTED",
  ERROR = "ERROR",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  PAST_DUE = "PAST_DUE",
  INCOMPLETE = "INCOMPLETE",
  TRIALING = "TRIALING",
  UNPAID = "UNPAID",
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  plan: Plan;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConnection {
  id: string;
  userId: string;
  platform: Platform;
  accessToken: string;
  status: ConnectionStatus;
  lastSyncAt: Date | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  platform: Platform;
  title: string;
  summary: string | null;
  tags: string[];
  messageCount: number;
  createdAt: Date;
  importedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
  tokenCount: number | null;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  plan: Plan;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Import Types ────────────────────────────────────────────────────────────

export interface ImportedMessage {
  role: string;
  content: string;
  createdAt?: string;
}

export interface ImportedConversation {
  platform: Platform;
  title: string;
  createdAt: string;
  messages: ImportedMessage[];
}
