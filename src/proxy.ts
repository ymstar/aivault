import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isApiPublicRoute = createRouteMatcher([
  "/api/stripe/webhook(.*)",
  "/api/collector(.*)",
]);

const clerkProxy = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (isApiPublicRoute(request)) {
      return NextResponse.next();
    }
    await auth.protect();
    return NextResponse.next();
  }

  await auth.protect();
  return NextResponse.next();
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
