import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/user-sync";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";
    const name = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined;
    
    const dbUser = await getOrCreateUser(userId, email, name);
    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("Sync user error:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}
