'use client'

import * as React from 'react'
import { api } from '@/lib/api'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  quickReplies?: string[]
}

interface ChatResponse {
  reply: string
  intent: string
  entities: Record<string, string>
  conversationId: string
  quickReplies?: string[]
}

const STORAGE_KEY = 'bm_chat_cid'

function getStoredConversationId(tenantSlug: string): string | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${tenantSlug}`)
    return raw || null
  } catch {
    return null
  }
}

function storeConversationId(tenantSlug: string, id: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${tenantSlug}`, id)
  } catch {}
}

function clearConversationId(tenantSlug: string) {
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${tenantSlug}`)
  } catch {}
}

export function ChatWidget({ tenantSlug }: { tenantSlug?: string }) {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (tenantSlug) {
      const stored = getStoredConversationId(tenantSlug)
      if (stored) setConversationId(stored)
    }
    setMessages([
      {
        role: 'assistant',
        content: 'Hi there! How can I help you today?',
        quickReplies: ['Book a service', 'Check my booking', 'See prices'],
      },
    ])
  }, [tenantSlug])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const body: Record<string, any> = { message: text.trim() }
      if (conversationId) body.conversationId = conversationId
      if (tenantSlug) body.tenantSlug = tenantSlug

      const { data } = await api.post('/ai/chat', body)
      const result = data.data as ChatResponse

      setConversationId(result.conversationId)
      if (tenantSlug) storeConversationId(tenantSlug, result.conversationId)

      const assistantMessage: Message = {
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
        content: 'Hi there! How can I help you today?',
        quickReplies: ['Book a service', 'Check my booking', 'See prices'],
      },
    ])
    setConversationId(null)
    if (tenantSlug) clearConversationId(tenantSlug)
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="font-semibold text-sm">BookerMap Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-blue-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px] bg-gray-50 dark:bg-gray-950">
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
                {msg.role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 ml-1">
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
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={startNewChat}
            className="text-xs text-center py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-t border-gray-100 dark:border-gray-800 transition-colors"
          >
            Start new conversation
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
    </>
  )
}
