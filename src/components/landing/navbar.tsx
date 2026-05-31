'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Menu } from 'lucide-react'

export default function Navbar() {
  const { isSignedIn } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#pricing', label: 'Pricing' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-white/15 bg-zinc-950/90 backdrop-blur-2xl shadow-lg shadow-black/20'
          : 'border-white/5 bg-zinc-950/50 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 transition-transform duration-200 group-hover:scale-105">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="text-xl font-bold text-white transition-colors group-hover:text-indigo-300">
            AIVault
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button
                variant="default"
                className="hidden bg-indigo-600 hover:bg-indigo-700 sm:inline-flex"
              >
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  className="hidden text-zinc-300 hover:text-white sm:inline-flex"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="hidden bg-indigo-600 hover:bg-indigo-700 sm:inline-flex">
                  Get Started
                </Button>
              </SignUpButton>
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-zinc-300 hover:text-white md:hidden"
                />
              }
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-zinc-800 bg-zinc-950">
              <SheetHeader>
                <SheetTitle className="text-white">Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="my-4 border-t border-zinc-800" />
                {isSignedIn ? (
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SignInButton mode="modal">
                      <Button
                        variant="ghost"
                        className="w-full text-zinc-300 hover:text-white"
                      >
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                        Get Started
                      </Button>
                    </SignUpButton>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
