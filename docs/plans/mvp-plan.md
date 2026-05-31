# AIVault MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a working MVP that lets users import AI conversations, browse them, and search across platforms.

**Architecture:** Next.js 14 App Router with Supabase, Clerk auth, Stripe billing, and Tailwind/shadcn UI.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Supabase, Clerk, Stripe

---

## Phase 1: Foundation (Agent-Backend)

### Task 1.1: Install Core Dependencies

**Objective:** Set up all required packages

**Commands:**
```bash
cd /home/ubuntu/aivault
npm install @clerk/nextjs @supabase/supabase-js stripe @stripe/stripe-js prisma @prisma/client zod date-fns lucide-react clsx tailwind-merge class-variance-authority
npm install -D @types/node
npx prisma init
```

### Task 1.2: Prisma Schema

**Objective:** Define the database schema

**Files:**
- Create: `prisma/schema.prisma`

**Schema:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  plan      Plan     @default(FREE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  connections    PlatformConnection[]
  conversations  Conversation[]
  subscription   Subscription?
}

enum Plan {
  FREE
  STARTER
  PRO
  TEAM
}

model PlatformConnection {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform    Platform
  accessToken String?
  status      ConnectionStatus @default(ACTIVE)
  lastSyncAt  DateTime?
  createdAt   DateTime @default(now())
}

enum Platform {
  CHATGPT
  CLAUDE
  GEMINI
  OTHER
}

enum ConnectionStatus {
  ACTIVE
  DISCONNECTED
  ERROR
}

model Conversation {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform     Platform
  title        String
  summary      String?
  tags         String[]
  messageCount Int      @default(0)
  createdAt    DateTime
  importedAt   DateTime @default(now())

  messages Message[]

  @@index([userId, platform])
  @@index([userId, createdAt])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String   // "user" | "assistant" | "system"
  content        String
  createdAt      DateTime
  tokenCount     Int?

  @@index([conversationId])
}

model Subscription {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeCustomerId   String   @unique
  stripeSubscriptionId String? @unique
  status             String   // "active" | "canceled" | "past_due"
  plan               Plan     @default(FREE)
  currentPeriodEnd   DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

### Task 1.3: Environment Configuration

**Objective:** Set up environment variables template

**Files:**
- Create: `.env.example`

**Content:**
```
# Database
DATABASE_URL="postgresql://..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase (for vector search later)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Task 1.4: Utility Libraries

**Objective:** Create shared utility files

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/lib/validators.ts`
- Create: `src/types/index.ts`

**`src/lib/utils.ts`:**
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
```

**`src/types/index.ts`:**
```typescript
export type Platform = "chatgpt" | "claude" | "gemini" | "other";

export interface ImportedConversation {
  platform: Platform;
  title: string;
  createdAt: string;
  messages: ImportedMessage[];
}

export interface ImportedMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface ConversationWithPreview {
  id: string;
  title: string;
  platform: Platform;
  messageCount: number;
  preview: string;
  createdAt: string;
  tags: string[];
}
```

### Task 1.5: Root Layout with Clerk Provider

**Objective:** Set up authentication in the root layout

**Files:**
- Modify: `src/app/layout.tsx`

**Content:**
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AIVault — Your AI Data. Secured. Unified. Yours.",
  description:
    "All your AI conversations. One place. Yours forever.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

---

## Phase 2: Data Pipeline (Agent-Pipeline)

### Task 2.1: ChatGPT JSON Parser

**Objective:** Parse ChatGPT export format into normalized data

**Files:**
- Create: `src/lib/parsers/chatgpt.ts`
- Create: `src/lib/parsers/index.ts`

**`src/lib/parsers/chatgpt.ts`:**
```typescript
import type { ImportedConversation, ImportedMessage } from "@/types";

interface ChatGPTExport {
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<string, {
    message?: {
      author?: { role?: string };
      content?: { parts?: string[] };
      create_time?: number;
    };
  }>;
}

export function parseChatGPTExport(data: ChatGPTExport[]): ImportedConversation[] {
  return data.map((conv) => {
    const messages: ImportedMessage[] = [];

    if (conv.mapping) {
      for (const node of Object.values(conv.mapping)) {
        if (node.message?.author?.role && node.message?.content?.parts) {
          const role = node.message.author.role;
          if (role === "user" || role === "assistant" || role === "system") {
            messages.push({
              role,
              content: node.message.content.parts.join("\n"),
              createdAt: node.message.create_time
                ? new Date(node.message.create_time * 1000).toISOString()
                : undefined,
            });
          }
        }
      }
    }

    messages.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return {
      platform: "chatgpt" as const,
      title: conv.title || "Untitled Conversation",
      createdAt: conv.create_time
        ? new Date(conv.create_time * 1000).toISOString()
        : new Date().toISOString(),
      messages,
    };
  });
}
```

### Task 2.2: Claude Export Parser

**Objective:** Parse Claude conversation export format

**Files:**
- Create: `src/lib/parsers/claude.ts`

**`src/lib/parsers/claude.ts`:**
```typescript
import type { ImportedConversation, ImportedMessage } from "@/types";

interface ClaudeExport {
  name?: string;
  created_at?: string;
  chat_messages?: Array<{
    sender?: string;
    text?: string;
    created_at?: string;
  }>;
}

export function parseClaudeExport(data: ClaudeExport[]): ImportedConversation[] {
  return data.map((conv) => {
    const messages: ImportedMessage[] = (conv.chat_messages || []).map((msg) => ({
      role: msg.sender === "human" ? "user" as const : "assistant" as const,
      content: msg.text || "",
      createdAt: msg.created_at,
    }));

    return {
      platform: "claude" as const,
      title: conv.name || "Untitled Conversation",
      createdAt: conv.created_at || new Date().toISOString(),
      messages,
    };
  });
}
```

### Task 2.3: Import API Route

**Objective:** API endpoint to handle file uploads and import

**Files:**
- Create: `src/app/api/import/route.ts`

**`src/app/api/import/route.ts`:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseChatGPTExport } from "@/lib/parsers/chatgpt";
import { parseClaudeExport } from "@/lib/parsers/claude";
import type { Platform } from "@/types";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const platform = formData.get("platform") as Platform;

    if (!file || !platform) {
      return NextResponse.json(
        { error: "Missing file or platform" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const data = JSON.parse(text);

    let conversations;
    switch (platform) {
      case "chatgpt":
        conversations = parseChatGPTExport(Array.isArray(data) ? data : [data]);
        break;
      case "claude":
        conversations = parseClaudeExport(Array.isArray(data) ? data : [data]);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
    }

    const totalMessages = conversations.reduce(
      (sum, c) => sum + c.messages.length,
      0
    );

    return NextResponse.json({
      success: true,
      conversations: conversations.length,
      messages: totalMessages,
      data: conversations,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}
```

### Task 2.4: Conversations API Route

**Objective:** CRUD API for conversations

**Files:**
- Create: `src/app/api/conversations/route.ts`
- Create: `src/app/api/conversations/[id]/route.ts`

---

## Phase 3: Frontend (Agent-Frontend)

### Task 3.1: Landing Page

**Objective:** Build the marketing landing page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/features.tsx`
- Create: `src/components/landing/pricing.tsx`
- Create: `src/components/landing/navbar.tsx`
- Create: `src/components/landing/footer.tsx`

### Task 3.2: Dashboard Layout

**Objective:** Create the authenticated dashboard shell

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/dashboard/sidebar.tsx`
- Create: `src/app/(dashboard)/dashboard/page.tsx`

### Task 3.3: Conversation Browser

**Objective:** List and browse imported conversations

**Files:**
- Create: `src/app/(dashboard)/conversations/page.tsx`
- Create: `src/components/dashboard/conversation-list.tsx`
- Create: `src/components/dashboard/conversation-card.tsx`
- Create: `src/app/(dashboard)/conversations/[id]/page.tsx`
- Create: `src/components/dashboard/message-viewer.tsx`

### Task 3.4: Import Page

**Objective:** File upload UI for importing conversations

**Files:**
- Create: `src/app/(dashboard)/import/page.tsx`
- Create: `src/components/dashboard/import-uploader.tsx`
- Create: `src/components/dashboard/platform-selector.tsx`

### Task 3.5: Search Page

**Objective:** Search across all conversations

**Files:**
- Create: `src/app/(dashboard)/search/page.tsx`
- Create: `src/components/dashboard/search-bar.tsx`
- Create: `src/components/dashboard/search-results.tsx`

### Task 3.6: Settings & Subscription Page

**Objective:** User settings and billing management

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`
- Create: `src/components/dashboard/plan-card.tsx`
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/stripe/webhook/route.ts`

---

## Phase 4: Auth Pages

### Task 4.1: Sign-in / Sign-up Pages

**Objective:** Clerk auth pages

**Files:**
- Create: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
