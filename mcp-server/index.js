#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://wovrscfgjnbfncemptrf.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.AIVAULT_USER_ID;

if (!SUPABASE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY env var is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Resolve the user ID: use env var or fetch the first user
async function getUserId() {
  if (USER_ID) return USER_ID;
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error("No user found in AIVault database. Set AIVAULT_USER_ID env var.");
  }
  return data.id;
}

const server = new McpServer({
  name: "aivault",
  version: "1.0.0",
});

// a) search_conversations
server.tool(
  "search_conversations",
  "Search conversations by keyword in title or message content",
  {
    query: z.string().describe("Search keyword to find in conversation titles or message content"),
    platform: z.string().optional().describe("Filter by platform (e.g. chatgpt, claude, gemini)"),
    limit: z.number().optional().default(10).describe("Max results to return (default 10)"),
  },
  async ({ query, platform, limit }) => {
    try {
      const uid = await getUserId();
      // Search in conversation titles
      let titleQuery = supabase
        .from("conversations")
        .select("id, title, platform, message_count, created_at")
        .eq("user_id", uid)
        .ilike("title", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (platform) titleQuery = titleQuery.eq("platform", platform);
      const { data: titleMatches } = await titleQuery;

      // Search in message content
      const { data: msgMatches } = await supabase
        .from("messages")
        .select("conversation_id, conversations!inner(id, title, platform, message_count, created_at, user_id)")
        .ilike("content", `%${query}%`)
        .eq("conversations.user_id", uid)
        .limit(limit * 3);

      let convMap = new Map();
      for (const c of titleMatches || []) convMap.set(c.id, c);
      for (const m of msgMatches || []) {
        const c = m.conversations;
        if (c && !convMap.has(c.id)) convMap.set(c.id, c);
      }

      const results = [...convMap.values()].slice(0, limit);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// b) get_conversation
server.tool(
  "get_conversation",
  "Get full conversation details with all messages",
  {
    conversationId: z.string().describe("The conversation ID to retrieve"),
  },
  async ({ conversationId }) => {
    try {
      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      if (cErr) throw cErr;

      const { data: messages } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      return {
        content: [{ type: "text", text: JSON.stringify({ ...conv, messages: messages || [] }, null, 2) }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// c) list_conversations
server.tool(
  "list_conversations",
  "List recent conversations",
  {
    platform: z.string().optional().describe("Filter by platform"),
    limit: z.number().optional().default(20).describe("Max results (default 20)"),
  },
  async ({ platform, limit }) => {
    try {
      const uid = await getUserId();
      let q = supabase
        .from("conversations")
        .select("id, title, platform, message_count, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (platform) q = q.eq("platform", platform);
      const { data, error } = q;
      if (error) throw error;
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// d) get_stats
server.tool(
  "get_stats",
  "Get user's AIVault statistics",
  {},
  async () => {
    try {
      const uid = await getUserId();
      const { count: convCount } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid);
      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversations.user_id", uid);
      const { data: platforms } = await supabase
        .from("conversations")
        .select("platform")
        .eq("user_id", uid);
      const uniquePlatforms = [...new Set((platforms || []).map((p) => p.platform))];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ total_conversations: convCount || 0, total_messages: msgCount || 0, platforms: uniquePlatforms }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
