'use client'

import * as React from 'react'
import { Mic, MicOff } from 'lucide-react'
import { SpeechService, getSpeechService } from '@/lib/speech-service'

interface VoiceInputButtonProps {
  onResult: (text: string) => void
  disabled?: boolean
  language?: string
}

export function VoiceInputButton({ onResult, disabled = false, language }: VoiceInputButtonProps) {
  const [listening, setListening] = React.useState(false)
  const [supported, setSupported] = React.useState(false)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    setSupported(SpeechService.isSupported())
    return () => { mountedRef.current = false }
  }, [])

  const handleToggle = () => {
    const service = getSpeechService()

    if (listening) {
      service.stopListening()
      setListening(false)
      return
    }

    service.onResult((text: string) => {
      if (mountedRef.current) {
        onResult(text)
        setListening(false)
      }
    })

    service.onError(() => {
      if (mountedRef.current) {
        setListening(false)
      }
    })

    service.onEnd(() => {
      if (mountedRef.current) {
        setListening(false)
      }
    })

    service.startListening(language)
    setListening(true)
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      aria-label={listening ? 'Stop recording' : 'Click to speak'}
      title={listening ? 'Stop recording' : 'Click to speak'}
      className={`p-2 rounded-lg transition-colors ${
        listening
          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {listening ? (
        <span className="relative flex items-center justify-center">
          <MicOff className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />
        </span>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  )
}
