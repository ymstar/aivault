import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getDbUserId } from "@/lib/auth";
import { generateEmbedding, searchSimilar, isEmbeddingReady } from "@/lib/embeddings";

function escapeILIKE(query: string): string {
  return query.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function keywordSearch(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  q: string,
) {
  const userConvs = await supabase
    .from("conversations")
    .select("id, title, platform")
    .eq("user_id", userId)
    .limit(100);

  if (!userConvs.data || userConvs.data.length === 0) return [];

  const convIds = userConvs.data.map((c) => c.id);
  const convMap = Object.fromEntries(userConvs.data.map((c) => [c.id, c]));

  const escaped = escapeILIKE(q);
  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .in("conversation_id", convIds)
    .ilike("content", `%${escaped}%`)
    .limit(50);

  return (messages || []).map((msg) => ({
    message_id: msg.id,
    conversation_id: msg.conversation_id,
    conversation_title: convMap[msg.conversation_id]?.title || "Untitled",
    platform: convMap[msg.conversation_id]?.platform || "OTHER",
    message_content: msg.content,
    message_role: msg.role,
    message_created_at: msg.created_at,
    similarity: null as number | null,
  }));
}

async function semanticSearch(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  q: string,
) {
  const embeddingReady = await isEmbeddingReady();
  if (!embeddingReady) {
    // Fall back to keyword search if embeddings aren't available
    return keywordSearch(supabase, userId, q);
  }

  const queryEmbedding = await generateEmbedding(q);
  const similar = await searchSimilar(queryEmbedding, userId, 20);

  if (similar.length === 0) return [];

  const convIds: string[] = [...new Set(similar.map((r: { conversation_id: string }) => r.conversation_id))] as string[];

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, title, platform")
    .in("id", convIds);

  const convMap = Object.fromEntries((convs || []).map((c) => [c.id, c]));

  // Build a similarity map from message_id to similarity score
  const simMap = new Map<string, number>();
  similar.forEach((r: { message_id: string; similarity: number }) => {
    simMap.set(r.message_id, r.similarity);
  });

  // Fetch the matched messages
  const messageIds = similar.map((r: { message_id: string }) => r.message_id);
  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .in("id", messageIds);

  // Preserve order from similarity results and attach scores
  const msgMap = new Map((messages || []).map((m) => [m.id, m]));
  return similar
    .map((r: { message_id: string }) => {
      const msg = msgMap.get(r.message_id);
      if (!msg) return null;
      return {
        message_id: msg.id,
        conversation_id: msg.conversation_id,
        conversation_title: convMap[msg.conversation_id]?.title || "Untitled",
        platform: convMap[msg.conversation_id]?.platform || "OTHER",
        message_content: msg.content,
        message_role: msg.role,
        message_created_at: msg.created_at,
        similarity: simMap.get(msg.id) ?? null,
      };
    })
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "Missing search query parameter 'q'" }, { status: 400 });
    }

    const mode = request.nextUrl.searchParams.get("mode") || "keyword";
    const supabase = createServerClient();

    const results = mode === "semantic"
      ? await semanticSearch(supabase, userId, q)
      : await keywordSearch(supabase, userId, q);

    return NextResponse.json({ results, total: results.length, mode });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
