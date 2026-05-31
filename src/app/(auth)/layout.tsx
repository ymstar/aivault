import { Shield } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full bg-blue-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and tagline */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">AIVault</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your AI conversations, unified and searchable.
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
