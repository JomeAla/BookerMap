import Link from 'next/link'
import { Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

interface PlanPricing {
  plan: string
  billingCycle: string
  price: number
  smsCredits: number
  whatsappCredits: number
  features: string[]
  isActive: boolean
}

const defaultPlans = [
  {
    name: 'Free', price: '0', period: 'forever', desc: 'Get started with essential features.',
    features: ['Up to 25 bookings/month', '1 technician', 'Basic booking page', 'Email notifications', 'Community support'],
    cta: 'Start Free', href: '/register', featured: false,
  },
  {
    name: 'Basic', price: '9,900', period: 'month', desc: 'For growing service businesses.',
    features: ['Up to 200 bookings/month', '5 technicians', 'Custom booking page', 'SMS & email notifications', 'Payment processing (Paystack)', 'Basic reports', 'Priority support'],
    cta: 'Start Free Trial', href: '/register', featured: true,
  },
  {
    name: 'Pro', price: '29,900', period: 'month', desc: 'For established businesses with teams.',
    features: ['Unlimited bookings', '25 technicians', 'Custom booking page + widget', 'SMS, email & WhatsApp', 'Paystack + Flutterwave payments', 'Advanced reports & analytics', 'AI chat assistant', 'Route optimization', 'Priority support'],
    cta: 'Start Free Trial', href: '/register', featured: false,
  },
  {
    name: 'Enterprise', price: '99,900', period: 'month', desc: 'For large operations needing full power.',
    features: ['Unlimited everything', 'Unlimited technicians', 'White-label booking page', 'All notification channels', 'All payment methods + POS', 'Custom reports + API access', 'AI + flow builder + escalations', 'Multi-location management', 'Dedicated account manager'],
    cta: 'Contact Sales', href: 'mailto:sales@bookermap.com', featured: false,
  },
]

function mapApiToDisplay(plans: PlanPricing[]) {
  return plans.filter(p => p.isActive).map((p) => {
    const priceStr = p.price >= 1000 ? (p.price / 100).toLocaleString() : String(p.price)
    const period = p.billingCycle === 'forever' ? 'forever' : p.billingCycle
    const featured = p.plan.toLowerCase() === 'basic'
    const cta = p.plan.toLowerCase() === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'
    const href = p.plan.toLowerCase() === 'enterprise' ? 'mailto:sales@bookermap.com' : '/register'
    const descMap: Record<string, string> = {
      free: 'Get started with essential features.',
      basic: 'For growing service businesses.',
      pro: 'For established businesses with teams.',
      enterprise: 'For large operations needing full power.',
    }
    return {
      name: p.plan,
      price: priceStr,
      period,
      desc: descMap[p.plan.toLowerCase()] || '',
      features: p.features,
      cta,
      href,
      featured,
    }
  })
}

async function getPlans() {
  try {
    const { data } = await api.get('/plan-pricing')
    const apiPlans = data?.data ?? data
    if (Array.isArray(apiPlans) && apiPlans.length > 0) {
      const mapped = mapApiToDisplay(apiPlans)
      if (mapped.length > 0) return mapped
    }
  } catch {}
  return defaultPlans
}

export default async function PricingPage() {
  const plans = await getPlans()
  return (
    <div className="min-h-screen bg-surface text-text">
      <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-text transition-colors text-sm font-medium"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <Link href="/login" className="text-sm text-text-muted hover:text-text transition-colors font-medium">Login</Link>
        </div>
      </div>

      <section className="pt-24 pb-10 md:pt-28 md:pb-14">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text">Simple, transparent <span className="text-accent">pricing</span></h1>
          <p className="mt-3 text-lg text-text-secondary max-w-lg mx-auto">Start free, upgrade as you grow. All plans include a 14-day free trial of the Basic plan.</p>
        </div>
      </section>

      <section className="pb-14 md:pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p, idx) => (
              <div key={p.name} className={`relative rounded-2xl p-6 flex flex-col bg-white border border-gray-300 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${p.featured ? '!border-accent shadow-[0_4px_16px_rgba(5,150,105,0.15)] ring-2 ring-accent/10' : ''}`}>
                {p.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-bold">Most Popular</div>}
                <h3 className="text-lg font-bold text-text">{p.name}</h3>
                <div className="mt-2"><span className="text-3xl font-extrabold text-text">&#8358;{p.price}</span><span className="text-text-muted text-sm">/{p.period}</span></div>
                <p className="mt-2 text-sm text-text-secondary">{p.desc}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary"><Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />{f}</li>
                  ))}
                </ul>
                <Link href={p.href} className={`mt-6 block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${p.featured ? 'bg-accent text-white hover:bg-accent-dark shadow-md' : 'border border-gray-300 text-text hover:border-accent hover:text-accent hover:bg-accent-subtle/30'}`}>
                  {p.cta} <ArrowRight className="inline h-4 w-4 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
