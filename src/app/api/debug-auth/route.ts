import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { getDbUserId } from "@/lib/auth";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "No clerk session" }, { status: 401 });

  const supabase = createServerClient();

  // Step 1: Try to find user
  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_id, email")
    .eq("clerk_id", clerkId)
    .single();

  // Step 2: Try getDbUserId
  const dbUserId = await getDbUserId();

  return NextResponse.json({
    clerkId,
    queryResult: { data, errorCode: error?.code, errorMessage: error?.message },
    dbUserId,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKeyLen: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
  });
}
