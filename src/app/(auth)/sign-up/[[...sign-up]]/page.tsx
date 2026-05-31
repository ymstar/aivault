import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-zinc-100">Create an account</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Start organizing your AI conversations today
        </p>
      </div>

      <SignUp routing="hash" />

      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-600">
        <div className="h-px flex-1 bg-zinc-800" />
        <span>or continue with</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <p className="mt-3 text-center text-xs text-zinc-600">
        Google &amp; GitHub sign-up available via the buttons above
      </p>
    </div>
  )
}
