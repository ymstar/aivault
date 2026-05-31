# AIVault — AI Data Sovereignty Platform

## Architecture
- Next.js 14+ (App Router) with TypeScript
- Supabase (PostgreSQL) for structured data + auth as fallback
- Clerk for authentication
- Stripe for subscriptions
- Tailwind CSS + shadcn/ui for styling
- Deploy on Vercel

## Key Commands
- `npm run dev` — dev server on :3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx prisma generate` — generate Prisma client
- `npx prisma db push` — push schema to database

## Code Standards
- TypeScript strict mode
- Tailwind CSS for all styling (no CSS modules)
- App Router (not Pages Router)
- Server Components by default, Client Components only when needed
- API routes in `src/app/api/`
- Shared types in `src/types/`
- Utility functions in `src/lib/`
- React components in `src/components/`

## Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Base UI components (shadcn)
│   ├── landing/           # Landing page components
│   ├── dashboard/         # Dashboard components
│   └── shared/            # Shared components
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── stripe.ts          # Stripe client
│   ├── clerk.ts           # Clerk utilities
│   ├── utils.ts           # General utilities
│   └── validators.ts      # Zod schemas
├── types/
│   └── index.ts           # Shared types
└── styles/
    └── globals.css         # Global styles + Tailwind
```

## Database Schema (Prisma)
- Users (synced from Clerk)
- PlatformConnections (linked AI platforms)
- Conversations (imported conversations)
- Messages (individual messages)
- Subscriptions (Stripe subscription state)

## Design System
- Primary: Indigo (#4F46E5) / Purple (#7C3AED) gradient
- Dark mode by default
- Clean, minimal, professional
- Font: Inter
