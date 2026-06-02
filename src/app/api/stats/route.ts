import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const supabase = createServerClient();
    
    // Get user
    const { data: user } = await supabase
      .from("users").select("id, plan").eq("clerk_id", userId).single();
    
    if (!user) return NextResponse.json({ totalConversations: 0, totalMessages: 0, platforms: [], plan: "FREE" });
    
    // Count conversations
    const { count: totalConversations } = await supabase
      .from("conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    
    // Sum message counts
    const { data: convData } = await supabase
      .from("conversations").select("message_count").eq("user_id", user.id);
    const totalMessages = convData?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0;
    
    // Distinct platforms
    const { data: platformData } = await supabase
      .from("conversations").select("platform").eq("user_id", user.id);
    const platforms = [...new Set(platformData?.map(p => p.platform) || [])];
    
    return NextResponse.json({
      totalConversations: totalConversations || 0,
      totalMessages,
      platforms,
      plan: user.plan || "FREE",
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
