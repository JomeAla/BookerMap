'use client'

import * as React from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { getSpeechService } from '@/lib/speech-service'

const STORAGE_KEY = 'bm_voice_output_enabled'

interface VoiceOutputToggleProps {
  language?: string
}

export function VoiceOutputToggle({ language }: VoiceOutputToggleProps) {
  const [enabled, setEnabled] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') {
        setEnabled(true)
      }
    } catch {}
  }, [])

  const handleToggle = () => {
    const service = getSpeechService()
    const next = !enabled
    setEnabled(next)
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, 'true')
      } else {
        localStorage.removeItem(STORAGE_KEY)
        service.stopSpeaking()
      }
    } catch {}
  }

  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={enabled ? 'Disable voice output' : 'Enable voice output'}
      title={enabled ? 'Voice output on' : 'Voice output off'}
      className={`p-1.5 rounded-md transition-colors ${
        enabled
          ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  )
}
