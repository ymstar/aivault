import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const result = await auth();
  return NextResponse.json({
    userId: result.userId,
    sessionId: result.sessionId,
    hasUserId: !!result.userId,
    env: {
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      secretKeyLen: process.env.CLERK_SECRET_KEY?.length || 0,
      hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    }
  });
}
