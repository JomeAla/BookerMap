'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Star, MessageSquare, ThumbsUp, ThumbsDown, BarChart3 } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface FeedbackStats {
  totalRated: number
  avgRating: number
  percentPositive: number
  percentNegative: number
  ratingBreakdown: Record<number, number>
}

interface RatedMessage {
  id: string
  contentSnippet: string
  rating: number
  feedback: string | null
  ratedAt: string
  createdAt: string
  intent: string | null
  sessionId: string
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AiFeedbackPage() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['ai-feedback-stats'],
    queryFn: async () => {
      const { data } = await api.get('/ai/analytics/feedback')
      return data.data as FeedbackStats
    },
  })

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['ai-rated-messages'],
    queryFn: async () => {
      const { data } = await api.get('/ai/analytics/messages?limit=20')
      return (data.data as RatedMessage[]) ?? []
    },
  })

  if (loadingStats || loadingMessages) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Feedback</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor how users rate your AI assistant responses
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Total Rated"
          value={stats?.totalRated ?? 0}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={stats?.avgRating ?? 0}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={ThumbsUp}
          label="% Positive (4-5)"
          value={`${stats?.percentPositive ?? 0}%`}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={ThumbsDown}
          label="% Negative (1-2)"
          value={`${stats?.percentNegative ?? 0}%`}
          color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        />
      </div>

      {stats && stats.totalRated > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rating Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingBreakdown?.[star] ?? 0
                const pct = stats.totalRated > 0 ? (count / stats.totalRated) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm w-6 text-right text-gray-500 dark:text-gray-400">{star}</span>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Rated Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {!messages || messages.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No rated messages yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Message</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Rating</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Feedback</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-2 px-3 max-w-xs truncate text-gray-700 dark:text-gray-300">{msg.contentSnippet}</td>
                      <td className="py-2 px-3"><Stars rating={msg.rating} /></td>
                      <td className="py-2 px-3 max-w-xs truncate text-gray-500 dark:text-gray-400">{msg.feedback || '—'}</td>
                      <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{msg.ratedAt ? timeAgo(msg.ratedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
