import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isApiPublicRoute = createRouteMatcher([
  "/api/stripe/webhook(.*)",
  "/api/collector(.*)",  // Collector uses API key auth, not Clerk
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // For API routes, allow public API routes without auth
  if (pathname.startsWith("/api/")) {
    if (isApiPublicRoute(request)) {
      return NextResponse.next();
    }
    // All other API routes require authentication
    await auth.protect();
    return NextResponse.next();
  }

  // All other routes (including /dashboard) require authentication
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
