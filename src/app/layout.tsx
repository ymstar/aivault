import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIVault — AI Data Sovereignty Platform",
  description:
    "Take control of your AI conversation data. Import, search, and manage conversations from ChatGPT, Claude, Gemini, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
        <body className="min-h-full flex flex-col font-sans bg-zinc-950 text-zinc-50">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
