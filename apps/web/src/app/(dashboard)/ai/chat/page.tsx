'use client'

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { MessageSquare, Send, Loader2, AlertCircle, X, Star } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { VoiceInputButton } from '@/components/chat/voice-input-button'
import { VoiceOutputToggle } from '@/components/chat/voice-output-toggle'
import { getSpeechService } from '@/lib/speech-service'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  quickReplies?: string[]
  rating?: number | null
}

function StarRating({ messageId, rating, onRate }: { messageId?: string; rating?: number | null; onRate: (id: string, stars: number) => void }) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const current = rating ?? null

  if (!messageId) return null

  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(messageId, star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className="p-0 transition-colors"
        >
          <Star
            className={`h-3.5 w-3.5 transition-colors ${
              ((hovered ?? current) ?? 0) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function AiChatPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [escalationStatus, setEscalationStatus] = React.useState<string | null>(null)
  const [escalating, setEscalating] = React.useState(false)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! How can I help you today? You can book a service, check your appointment, or ask about pricing.',
        quickReplies: ['Book a service', 'Check my booking', 'See prices'],
      },
    ])
  }, [])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('bm_voice_output_enabled')
      setVoiceOutputEnabled(stored === 'true')
    } catch {}
  }, [])

  React.useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last.role === 'assistant' && voiceOutputEnabled && !loading) {
        const service = getSpeechService()
        service.stopSpeaking()
        window.setTimeout(() => {
          service.speak(last.content)
        }, 100)
      }
    }
  }, [messages, voiceOutputEnabled, loading])

  React.useEffect(() => {
    return () => {
      try { getSpeechService().stopSpeaking() } catch {}
    }
  }, [])

  const rateMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      const { data } = await api.post(`/ai/messages/${id}/rate`, { rating })
      return data.data
    },
    onSuccess: (_data, variables) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === variables.id ? { ...m, rating: variables.rating } : m
        )
      )
      addToast('Thanks for your feedback!', 'success')
    },
  })

  const handleRate = (messageId: string, stars: number) => {
    rateMutation.mutate({ id: messageId, rating: stars })
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    getSpeechService().stopSpeaking()

    const userMessage: Message = { role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const body: Record<string, any> = { message: text.trim() }
      if (conversationId) body.conversationId = conversationId

      const { data } = await api.post('/ai/chat', body)
      const result = data.data

      setConversationId(result.conversationId)

      const assistantMessage: Message = {
        id: result.messageId,
        role: 'assistant',
        content: result.reply,
        quickReplies: result.quickReplies,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleEscalate = async () => {
    if (!conversationId) return
    setEscalating(true)
    try {
      await api.post('/ai/escalate', { conversationId, reason: 'Customer requested human agent' })
      setEscalationStatus('PENDING')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I've submitted your request to speak with a human agent. One of our team members will assist you shortly. Thank you for your patience!",
        },
      ])
    } catch {
      setEscalationStatus('FAILED')
    } finally {
      setEscalating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const startNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! How can I help you today? You can book a service, check your appointment, or ask about pricing.',
        quickReplies: ['Book a service', 'Check my booking', 'See prices'],
      },
    ])
    setConversationId(null)
    setEscalationStatus(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant Chat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chat with our AI assistant to manage bookings and inquiries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceOutputToggle />
          {conversationId && !escalationStatus && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEscalate}
              disabled={escalating}
              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-900/20"
            >
              {escalating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-1" />
              )}
              Talk to Human
            </Button>
          )}
          {conversationId && (
            <Button variant="ghost" size="sm" onClick={startNewChat}>
              <X className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {escalationStatus === 'PENDING' && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center gap-2 text-sm text-orange-800 dark:text-orange-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Your request to speak with a human agent has been submitted. A team member will join this conversation shortly.
        </div>
      )}

      <Card className="flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
              {msg.role === 'assistant' && (
                <div className="ml-1">
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr}
                          onClick={() => sendMessage(qr)}
                          disabled={loading}
                          className="text-xs px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                  <StarRating
                    messageId={msg.id}
                    rating={msg.rating}
                    onRate={handleRate}
                  />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <VoiceInputButton onResult={(text) => setInput((prev) => prev + text)} disabled={loading} />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  )
}
