'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, timeAgo } from '@/lib/utils'
import { MessageSquare, ChevronDown, ChevronRight, Bot } from 'lucide-react'
import type { AiConversation, AiMessage } from '@/types'

export default function AiHistoryPage() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const { data } = await api.get('/ai/conversations')
      return data.data as AiConversation[]
    },
  })

  const { data: messages, isFetching: messagesLoading } = useQuery({
    queryKey: ['ai-conversation-messages', expandedId],
    queryFn: async () => {
      if (!expandedId) return []
      const { data } = await api.get(`/ai/conversations/${expandedId}/messages`)
      return data.data as AiMessage[]
    },
    enabled: !!expandedId,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chat History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Past AI conversations</p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>
      ) : !conversations?.length ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Start a chat with the AI assistant to see it here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const isExpanded = expandedId === conv.id
            return (
              <Card key={conv.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                  className="w-full text-left"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Bot className="h-5 w-5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conv.sessionId.length > 12
                              ? `${conv.sessionId.slice(0, 12)}...`
                              : conv.sessionId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {timeAgo(conv.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={conv.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {conv.status}
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {messagesLoading ? (
                        <div className="flex justify-center py-4">
                          <Spinner />
                        </div>
                      ) : !messages?.length ? (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                          No messages in this conversation
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                                }`}
                              >
                                {formatDate(msg.createdAt, 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
