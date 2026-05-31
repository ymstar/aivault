'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Upload,
  Search,
  Network,
  Shield,
  Check,
  ArrowRight,
  Download,
  FileSearch,
  GitFork,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Navbar from '@/components/landing/navbar'

const features = [
  {
    icon: Upload,
    title: 'Universal Import',
    description:
      'Import conversations from ChatGPT, Claude, Gemini, and more with a single click. Supports JSON, CSV, and API integrations.',
  },
  {
    icon: Search,
    title: 'Semantic Search',
    description:
      'Find any conversation instantly with AI-powered semantic search. Go beyond keywords to search by meaning and context.',
  },
  {
    icon: Network,
    title: 'Knowledge Graph',
    description:
      'Visualize connections between your conversations, topics, and ideas. Discover patterns across your entire AI history.',
  },
  {
    icon: Shield,
    title: 'End-to-End Security',
    description:
      'Your data is encrypted at rest and in transit. We never train on your data. You own it, period.',
  },
]

const steps = [
  {
    number: '01',
    icon: Download,
    title: 'Export your data',
    description:
      'Export your conversation history from ChatGPT, Claude, Gemini, and other AI platforms in a few clicks.',
  },
  {
    number: '02',
    icon: FileSearch,
    title: 'Import into AIVault',
    description:
      'Upload your exports and AIVault automatically parses, indexes, and organizes every conversation.',
  },
  {
    number: '03',
    icon: GitFork,
    title: 'Discover insights',
    description:
      'Search, explore, and uncover patterns across your entire AI history. Your knowledge, always accessible.',
  },
]

const pricingTiers = [
  {
    name: 'Free',
    monthlyPrice: '$0',
    annualPrice: '$0',
    period: 'forever',
    description: 'Perfect for getting started with personal use.',
    features: [
      '100 conversations',
      '3 platform connections',
      'Basic search',
      '7-day history',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    monthlyPrice: '$19',
    annualPrice: '$15',
    period: '/mo',
    description: 'For power users who want unlimited access.',
    features: [
      'Unlimited conversations',
      'All platform connections',
      'Semantic search',
      'Knowledge graph',
      'Priority support',
      'API access',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Team',
    monthlyPrice: '$49',
    annualPrice: '$39',
    period: '/mo/seat',
    description: 'For teams that share and collaborate on AI insights.',
    features: [
      'Everything in Pro',
      'Team workspaces',
      'Shared knowledge base',
      'Admin controls',
      'SSO & SAML',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

/* Floating particle positions — rendered as absolute CSS-animated dots */
const particles = [
  { size: 3, top: '15%', left: '10%', animation: 'float-1', duration: '12s', delay: '0s', opacity: 0.3 },
  { size: 2, top: '25%', left: '85%', animation: 'float-2', duration: '15s', delay: '2s', opacity: 0.2 },
  { size: 4, top: '60%', left: '20%', animation: 'float-3', duration: '18s', delay: '1s', opacity: 0.15 },
  { size: 2, top: '40%', left: '75%', animation: 'float-4', duration: '14s', delay: '3s', opacity: 0.25 },
  { size: 3, top: '80%', left: '60%', animation: 'float-5', duration: '16s', delay: '0.5s', opacity: 0.2 },
  { size: 2, top: '35%', left: '45%', animation: 'float-6', duration: '20s', delay: '4s', opacity: 0.15 },
  { size: 5, top: '20%', left: '65%', animation: 'float-1', duration: '22s', delay: '5s', opacity: 0.1 },
  { size: 2, top: '70%', left: '35%', animation: 'float-2', duration: '13s', delay: '1.5s', opacity: 0.2 },
  { size: 3, top: '50%', left: '90%', animation: 'float-4', duration: '17s', delay: '2.5s', opacity: 0.18 },
  { size: 4, top: '85%', left: '15%', animation: 'float-5', duration: '19s', delay: '3.5s', opacity: 0.12 },
  { size: 2, top: '10%', left: '50%', animation: 'float-6', duration: '14s', delay: '0.8s', opacity: 0.22 },
  { size: 3, top: '55%', left: '8%', animation: 'float-3', duration: '21s', delay: '6s', opacity: 0.15 },
]

export default function LandingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-3xl" />

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-indigo-400"
              style={{
                width: p.size,
                height: p.size,
                top: p.top,
                left: p.left,
                opacity: p.opacity,
                animation: `${p.animation} ${p.duration} ease-in-out ${p.delay} infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <Shield className="h-4 w-4" />
            Your data. Your vault. Always.
          </div>

          <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
            All your AI conversations.{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              One place.
            </span>{' '}
            Yours forever.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
            Import, search, and organize every conversation you&apos;ve had with
            AI. Stop losing valuable insights in scattered chats. Take control
            of your AI data sovereignty.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-indigo-600 px-8 text-base hover:bg-indigo-700"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button
                variant="outline"
                size="lg"
                className="border-zinc-700 px-8 text-base text-zinc-300 hover:bg-zinc-800"
              >
                Learn More
              </Button>
            </a>
          </div>

          {/* Trusted by badge */}
          <div className="mt-12 inline-flex items-center gap-2 text-sm text-zinc-500">
            <Users className="h-4 w-4" />
            <span>
              Trusted by <span className="font-medium text-zinc-400">2,000+</span> users
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to own your AI history
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Powerful tools to import, search, and understand your AI
              conversations.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-zinc-800 bg-zinc-900/50 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
                    <feature.icon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div className="gradient-separator mb-3 w-12 rounded-full" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-zinc-400">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Get started in three simple steps.
            </p>
          </div>

          <div className="relative grid gap-12 md:grid-cols-3">
            {/* Connecting line (desktop only) */}
            <div className="absolute top-16 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] hidden h-px bg-gradient-to-r from-indigo-500/20 via-indigo-500/40 to-indigo-500/20 md:block" />

            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-zinc-900">
                  <step.icon className="h-7 w-7 text-indigo-400" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Start free. Upgrade when you need more.
            </p>

            {/* Annual / Monthly toggle */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/80 p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  !annual
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  annual
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs text-indigo-300">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative border-zinc-800 bg-zinc-900/50 transition-all duration-300 hover:-translate-y-1 ${
                  tier.popular
                    ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                    : 'hover:border-zinc-700'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="animate-subtle-pulse inline-block rounded-full bg-indigo-600 px-4 py-1 text-xs font-medium text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">
                      {annual ? tier.annualPrice : tier.monthlyPrice}
                    </span>
                    <span className="text-zinc-400">{tier.period}</span>
                  </div>
                  <CardDescription className="text-zinc-400">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="mb-8 space-y-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-3 text-sm text-zinc-300"
                      >
                        <Check className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up">
                    <Button
                      className={`w-full ${
                        tier.popular
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-12 sm:p-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to own your AI data?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
              Join thousands of users who have taken control of their AI
              conversations. Start for free — no credit card required.
            </p>
            <Link href="/sign-up">
              <Button
                size="lg"
                className="mt-8 bg-indigo-600 px-10 text-base hover:bg-indigo-700"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <span className="text-sm font-bold text-white">A</span>
                </div>
                <span className="text-xl font-bold">AIVault</span>
              </div>
              <p className="mt-4 text-sm text-zinc-400">
                Your AI conversations, organized and searchable. Own your data.
              </p>
              {/* Social links */}
              <div className="mt-4 flex items-center gap-3">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-zinc-300">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <a href="#features" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-zinc-300">
                Company
              </h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-zinc-300">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-sm text-zinc-500">
            © {new Date().getFullYear()} AIVault. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
