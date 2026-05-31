import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getDbUserId } from "@/lib/auth";

function escapeILIKE(query: string): string {
  return query.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "Missing search query parameter 'q'" }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    // Get user's conversation IDs (limited)
    const { data: userConvs } = await supabase
      .from("conversations").select("id, title, platform").eq("user_id", userId).limit(100);
    
    if (!userConvs || userConvs.length === 0) return NextResponse.json({ results: [], total: 0 });
    
    const convIds = userConvs.map(c => c.id);
    const convMap = Object.fromEntries(userConvs.map(c => [c.id, c]));
    
    // Search messages with escaped ILIKE pattern
    const escaped = escapeILIKE(q);
    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, role, content, created_at")
      .in("conversation_id", convIds)
      .ilike("content", `%${escaped}%`)
      .limit(50);
    
    const results = (messages || []).map(msg => ({
      message_id: msg.id,
      conversation_id: msg.conversation_id,
      conversation_title: convMap[msg.conversation_id]?.title || "Untitled",
      platform: convMap[msg.conversation_id]?.platform || "OTHER",
      message_content: msg.content,
      message_role: msg.role,
      message_created_at: msg.created_at,
    }));
    
    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [], total: 0 });
  }
}
