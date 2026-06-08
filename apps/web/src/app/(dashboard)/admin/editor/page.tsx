'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Save, Globe, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminEditorPage() {
  const { toast } = useToast()

  const [content, setContent] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bm_homepage_content')
      if (saved) return JSON.parse(saved)
    }
    return {
      heroTitle: 'Schedule smarter.',
      heroSubtitle: 'Grow faster.',
      heroDescription: 'The all-in-one booking platform for African home service businesses. Manage bookings, dispatch technicians, and process payments — all in one place.',
      featureSectionTitle: 'Everything you need to run your business',
      featureSectionDesc: 'From booking to payment — the complete service lifecycle.',
      madeForSectionTitle: 'Built for every trade',
      madeForSectionDesc: 'No matter your profession, BookerMap streamlines your operations.',
      howItWorksTitle: 'Get started in minutes',
      howItWorksDesc: 'No technical skills required. Four simple steps.',
      ctaTitle: 'Ready to transform your business?',
      ctaDesc: 'Start your free 14-day trial. No credit card required.',
    }
  })

  const handleSave = () => {
    localStorage.setItem('bm_homepage_content', JSON.stringify(content))
    toast('Homepage content saved', 'success')
  }

  const fields = [
    { key: 'heroTitle', label: 'Hero Title' },
    { key: 'heroSubtitle', label: 'Hero Subtitle (gradient text)' },
    { key: 'heroDescription', label: 'Hero Description' },
    { key: 'featureSectionTitle', label: 'Features Section Title' },
    { key: 'featureSectionDesc', label: 'Features Section Description' },
    { key: 'madeForSectionTitle', label: 'Made For Section Title' },
    { key: 'madeForSectionDesc', label: 'Made For Section Description' },
    { key: 'howItWorksTitle', label: 'How It Works Title' },
    { key: 'howItWorksDesc', label: 'How It Works Description' },
    { key: 'ctaTitle', label: 'CTA Title' },
    { key: 'ctaDesc', label: 'CTA Description' },
  ]

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Homepage Editor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Edit the content displayed on your homepage</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" /> Page Content
            </CardTitle>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{f.label}</label>
              {f.key === 'heroDescription' || f.key === 'featureSectionDesc' || f.key === 'madeForSectionDesc' || f.key === 'howItWorksDesc' || f.key === 'ctaDesc' ? (
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[80px]"
                  value={(content as any)[f.key]}
                  onChange={(e) => setContent({ ...content, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  value={(content as any)[f.key]}
                  onChange={(e) => setContent({ ...content, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" /> Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 rounded-xl bg-surface border">
            <h2 className="text-3xl font-bold">{content.heroTitle}<br /><span className="text-accent">{content.heroSubtitle}</span></h2>
            <p className="mt-2 text-text-secondary">{content.heroDescription}</p>
            <hr className="my-4" />
            <p className="text-xs text-text-muted uppercase font-semibold">Features</p>
            <h3 className="text-xl font-bold mt-1">{content.featureSectionTitle}</h3>
            <p className="text-sm text-text-secondary">{content.featureSectionDesc}</p>
            <hr className="my-4" />
            <p className="text-xs text-text-muted uppercase font-semibold">Made For</p>
            <h3 className="text-xl font-bold mt-1">{content.madeForSectionTitle}</h3>
            <p className="text-sm text-text-secondary">{content.madeForSectionDesc}</p>
            <hr className="my-4" />
            <p className="text-xs text-text-muted uppercase font-semibold">How It Works</p>
            <h3 className="text-xl font-bold mt-1">{content.howItWorksTitle}</h3>
            <p className="text-sm text-text-secondary">{content.howItWorksDesc}</p>
            <hr className="my-4" />
            <div className="bg-accent rounded-xl p-4 text-white">
              <h3 className="text-xl font-bold">{content.ctaTitle}</h3>
              <p className="text-sm text-white/70">{content.ctaDesc}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
