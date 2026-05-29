import Link from 'next/link'
import { CalendarCheck, Users, Wrench, FileText, ArrowRight } from 'lucide-react'

const features = [
  { icon: CalendarCheck, title: 'Smart Scheduling', description: 'AI-powered booking management with calendar sync and automated reminders.' },
  { icon: Users, title: 'Customer Management', description: 'Centralized customer profiles with booking history and preferences.' },
  { icon: Wrench, title: 'Service Catalog', description: 'Flexible service offerings with modifiers, intake forms, and pricing.' },
  { icon: FileText, title: 'Invoicing & Payments', description: 'Automated invoicing with Paystack and Flutterwave integration.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">BookerMap</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white max-w-3xl mx-auto leading-tight">
          The All-in-One{' '}
          <span className="text-blue-600">Booking Platform</span>{' '}
          for Service Businesses
        </h1>
        <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Manage bookings, customers, team members, and payments from a single dashboard.
          Multi-tenant ready with AI-powered automation.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} BookerMap. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
