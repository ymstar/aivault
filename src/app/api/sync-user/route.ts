import { NextResponse } from "next/server";
import { getDbUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST() {
  try {
    const dbUserId = await getDbUserId();
    if (!dbUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: dbUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", dbUserId)
      .single();

    if (error || !dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("Sync user error:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}
