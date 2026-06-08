'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import {
  BarChart3,
  MessageSquare,
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react'

interface Survey {
  id: string
  bookingId: string | null
  customerId: string
  touchpoint: string
  score: number
  scoreType: string
  feedback: string | null
  category: string | null
  sentimentScore: number | null
  sentimentLabel: string | null
  respondedAt: string
  customer?: { id: string; firstName: string; lastName: string }
  booking?: { id: string; service?: { name: string } }
}

interface NPSResponse {
  id: string
  customerId: string
  score: number
  promoterType: string
  reason: string | null
  createdAt: string
  customer?: { id: string; firstName: string; lastName: string }
}

interface SentimentTrend {
  positivePct: number
  neutralPct: number
  negativePct: number
  total: number
  trend: { date: string; score: number }[]
}

interface SentimentCategory {
  category: string
  positiveCount: number
  neutralCount: number
  negativeCount: number
  averageScore: number
  total: number
}

interface TopKeyword {
  keyword: string
  count: number
}

type SentimentLabel = 'positive' | 'neutral' | 'negative'

function sentimentBadge(label: string | null) {
  if (label === 'positive') return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">Positive</Badge>
  if (label === 'negative') return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">Negative</Badge>
  if (label === 'neutral') return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-0">Neutral</Badge>
  return <Badge variant="outline" className="text-gray-400">None</Badge>
}

function scoreBar(value: number, max: number, color: string) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function SatisfactionPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [tab, setTab] = React.useState('surveys')

  const { data: surveysData, isLoading: surveysLoading } = useQuery({
    queryKey: ['satisfaction-surveys'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/surveys')
      return (data.data || data) as Survey[]
    },
  })

  const { data: npsData, isLoading: npsLoading } = useQuery({
    queryKey: ['satisfaction-nps'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/nps')
      return data.data as { nps: number; promoters: number; passives: number; detractors: number; total: number } || data
    },
  })

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['satisfaction-trend'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/trend')
      return (data.data || data) as { month: string; averageScore: number; responses: number }[]
    },
  })

  const { data: feedbackData } = useQuery({
    queryKey: ['satisfaction-feedback'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/feedback')
      return (data.data || data) as { category: string; averageScore: number; feedbackCount: number; totalResponses: number; feedbacks: string[] }[]
    },
  })

  const { data: csatData } = useQuery({
    queryKey: ['satisfaction-csat'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/csat')
      return data.data as { average: number; count: number } || data
    },
  })

  const { data: sentimentTrend, isLoading: sentTrendLoading } = useQuery({
    queryKey: ['sentiment-trend'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/sentiment/trend')
      return (data.data || data) as SentimentTrend
    },
  })

  const { data: sentimentCategories, isLoading: sentCatLoading } = useQuery({
    queryKey: ['sentiment-categories'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/sentiment/categories')
      return (data.data || data) as SentimentCategory[]
    },
  })

  const { data: positiveKeywords, isLoading: posKwLoading } = useQuery({
    queryKey: ['sentiment-keywords-positive'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/sentiment/keywords', { params: { type: 'positive' } })
      return (data.data || data) as TopKeyword[]
    },
  })

  const { data: negativeKeywords, isLoading: negKwLoading } = useQuery({
    queryKey: ['sentiment-keywords-negative'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/sentiment/keywords', { params: { type: 'negative' } })
      return (data.data || data) as TopKeyword[]
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const { data } = await api.post(`/satisfaction/sentiment/analyze/${surveyId}`)
      return data.data || data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentiment-trend'] })
      queryClient.invalidateQueries({ queryKey: ['sentiment-categories'] })
      queryClient.invalidateQueries({ queryKey: ['sentiment-keywords-positive'] })
      queryClient.invalidateQueries({ queryKey: ['sentiment-keywords-negative'] })
      queryClient.invalidateQueries({ queryKey: ['satisfaction-surveys'] })
      addToast('Sentiment analysis complete', 'success')
    },
    onError: () => {
      addToast('Failed to analyze sentiment', 'error')
    },
  })

  const surveys: Survey[] = (surveysData as any) || []
  const nps = npsData as any
  const trend = (trendData as any) || []
  const csat = csatData as any
  const sentTrend = sentimentTrend as SentimentTrend | undefined
  const sentCats = (sentimentCategories as SentimentCategory[]) || []
  const posKw = (positiveKeywords as TopKeyword[]) || []
  const negKw = (negativeKeywords as TopKeyword[]) || []

  const isLoading = surveysLoading || npsLoading

  const getSentimentIcon = (score: number) => {
    if (score > 0.2) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (score < -0.2) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Satisfaction</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track customer satisfaction, NPS scores, and sentiment analysis
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="surveys">
            <Star className="h-4 w-4 mr-2" />
            Surveys
          </TabsTrigger>
          <TabsTrigger value="nps">
            <BarChart3 className="h-4 w-4 mr-2" />
            NPS
          </TabsTrigger>
          <TabsTrigger value="sentiment">
            <MessageSquare className="h-4 w-4 mr-2" />
            Sentiment Analysis
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <ThumbsUp className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="surveys" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">CSAT Average</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{csat?.average?.toFixed(1) || '0'}</p>
                    <p className="text-xs text-gray-400 mt-1">{csat?.count || 0} responses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">NPS Score</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{nps?.nps ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">{nps?.total || 0} responses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Surveys</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{surveys.length}</p>
                    <p className="text-xs text-gray-400 mt-1">All time</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Surveys</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {surveys.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Star className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No surveys yet</p>
                      <p className="text-sm mt-1">Surveys will appear when customers submit feedback</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Touchpoint</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Sentiment</TableHead>
                            <TableHead>Feedback</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {surveys.slice(0, 50).map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="text-sm">{formatDate(s.respondedAt, 'MMM d, yyyy')}</TableCell>
                              <TableCell className="text-sm">{s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">{s.touchpoint}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold">{s.score}</TableCell>
                              <TableCell className="text-xs text-gray-500">{s.scoreType}</TableCell>
                              <TableCell>{sentimentBadge(s.sentimentLabel)}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs text-gray-500">{s.feedback || '—'}</TableCell>
                              <TableCell>
                                {s.feedback && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => analyzeMutation.mutate(s.id)}
                                    disabled={analyzeMutation.isPending}
                                    title="Re-analyze sentiment"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="nps" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">NPS Score</p>
                <p className={`text-3xl font-bold ${(nps?.nps ?? 0) >= 50 ? 'text-green-600' : (nps?.nps ?? 0) >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{nps?.nps ?? '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-green-600">Promoters</p>
                <p className="text-3xl font-bold text-green-600">{nps?.promoters ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-amber-600">Passives</p>
                <p className="text-3xl font-bold text-amber-600">{nps?.passives ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-red-600">Detractors</p>
                <p className="text-3xl font-bold text-red-600">{nps?.detractors ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Satisfaction Trend</CardTitle></CardHeader>
            <CardContent>
              {trend.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No trend data available</div>
              ) : (
                <div className="space-y-3">
                  {trend.map((t: any) => (
                    <div key={t.month} className="flex items-center gap-4">
                      <span className="text-sm font-mono w-20 text-gray-500">{t.month}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full"
                              style={{ width: `${Math.min(100, (t.averageScore / 5) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-10 text-right">{t.averageScore.toFixed(1)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-20 text-right">{t.responses} resp.</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4 mt-4">
          {sentTrend && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Analyzed</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{sentTrend.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-green-600">Positive</p>
                  <p className="text-3xl font-bold text-green-600">{sentTrend.positivePct.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Neutral</p>
                  <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">{sentTrend.neutralPct.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-red-600">Negative</p>
                  <p className="text-3xl font-bold text-red-600">{sentTrend.negativePct.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sentiment Trend</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['sentiment-trend'] })
                    queryClient.invalidateQueries({ queryKey: ['sentiment-categories'] })
                    queryClient.invalidateQueries({ queryKey: ['sentiment-keywords-positive'] })
                    queryClient.invalidateQueries({ queryKey: ['sentiment-keywords-negative'] })
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sentTrendLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : !sentTrend || sentTrend.trend.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No sentiment data available yet</div>
              ) : (
                <div className="space-y-2">
                  {sentTrend.trend.map((point) => (
                    <div key={point.date} className="flex items-center gap-3 py-1.5">
                      <span className="text-xs font-mono text-gray-500 w-24">{point.date}</span>
                      {getSentimentIcon(point.score)}
                      <div className="flex-1">
                        {scoreBar(
                          point.score > 0 ? point.score * 100 : 0,
                          100,
                          point.score > 0.2 ? 'bg-green-500' : point.score < -0.2 ? 'bg-red-500' : 'bg-gray-400'
                        )}
                      </div>
                      <span className={`text-sm font-mono w-16 text-right ${
                        point.score > 0.2 ? 'text-green-600' : point.score < -0.2 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {point.score > 0 ? '+' : ''}{point.score.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sentiment by Category</CardTitle></CardHeader>
            <CardContent className="p-0">
              {sentCatLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : sentCats.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No category data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Positive</TableHead>
                        <TableHead>Neutral</TableHead>
                        <TableHead>Negative</TableHead>
                        <TableHead>Avg Score</TableHead>
                        <TableHead>Sentiment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentCats.map((cat) => {
                        const label: SentimentLabel = cat.averageScore > 0.2 ? 'positive' : cat.averageScore < -0.2 ? 'negative' : 'neutral'
                        return (
                          <TableRow key={cat.category}>
                            <TableCell className="font-medium">{cat.category}</TableCell>
                            <TableCell>{cat.total}</TableCell>
                            <TableCell className="text-green-600">{cat.positiveCount}</TableCell>
                            <TableCell className="text-gray-500">{cat.neutralCount}</TableCell>
                            <TableCell className="text-red-600">{cat.negativeCount}</TableCell>
                            <TableCell className="font-mono">{cat.averageScore.toFixed(3)}</TableCell>
                            <TableCell>{sentimentBadge(label)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top Keywords</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">Positive Keywords</h3>
                  </div>
                  {posKwLoading ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : posKw.length === 0 ? (
                    <p className="text-sm text-gray-400">No positive keywords found</p>
                  ) : (
                    <div className="space-y-2">
                      {posKw.map((kw) => (
                        <div key={kw.keyword} className="flex items-center justify-between py-1.5 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="text-sm text-green-800 dark:text-green-300 capitalize">{kw.keyword}</span>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-0 text-xs">{kw.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Negative Keywords</h3>
                  </div>
                  {negKwLoading ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : negKw.length === 0 ? (
                    <p className="text-sm text-gray-400">No negative keywords found</p>
                  ) : (
                    <div className="space-y-2">
                      {negKw.map((kw) => (
                        <div key={kw.keyword} className="flex items-center justify-between py-1.5 px-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <span className="text-sm text-red-800 dark:text-red-300 capitalize">{kw.keyword}</span>
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0 text-xs">{kw.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Feedback by Category</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!feedbackData ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (feedbackData as any[]).length === 0 ? (
                <div className="text-center py-8 text-gray-400">No feedback data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Avg Score</TableHead>
                        <TableHead>Responses</TableHead>
                        <TableHead>With Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(feedbackData as any[]).map((fb: any) => (
                        <TableRow key={fb.category}>
                          <TableCell className="font-medium capitalize">{fb.category}</TableCell>
                          <TableCell>{fb.averageScore?.toFixed(1) ?? '—'}</TableCell>
                          <TableCell>{fb.totalResponses}</TableCell>
                          <TableCell>{fb.feedbackCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Feedback</CardTitle></CardHeader>
            <CardContent>
              {surveys.filter((s) => s.feedback).length === 0 ? (
                <div className="text-center py-8 text-gray-400">No feedback text available</div>
              ) : (
                <div className="space-y-3">
                  {surveys.filter((s) => s.feedback).slice(0, 20).map((s) => (
                    <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : 'Anonymous'}</span>
                        {sentimentBadge(s.sentimentLabel)}
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(s.respondedAt, 'MMM d, yyyy')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{s.feedback}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}