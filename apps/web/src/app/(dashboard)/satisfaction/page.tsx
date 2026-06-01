'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { formatDate } from '@/lib/utils'
import { Smile, Frown, ThumbsUp, BarChart3, Download, Star } from 'lucide-react'
import type { SatisfactionSurvey, CSATResult, NPSResult, TrendDataPoint, FeedbackByCategory } from '@/types'

const touchpoints = ['', 'BOOKING_CREATED', 'SERVICE_COMPLETED', 'PAYMENT_MADE', 'GENERAL']
const categories = ['cleanliness', 'punctuality', 'quality', 'communication', 'value']

function ScoreCard({ title, value, subtitle, icon: Icon, color }: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${color.replace('text', 'bg').replace('600', '100').replace('500', '100')} dark:opacity-80`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TrendBar({ data }: { data: TrendDataPoint[] }) {
  if (!data || data.length === 0) return <p className="text-gray-400 text-sm py-8 text-center">No trend data available</p>
  const maxScore = Math.max(...data.map(d => d.averageScore), 1)
  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {data.map(point => (
        <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">{point.averageScore.toFixed(1)}</span>
          <div
            className="w-full rounded-t bg-blue-500 dark:bg-blue-400 transition-all"
            style={{ height: `${(point.averageScore / (maxScore || 1)) * 100}%`, minHeight: '4px' }}
          />
          <span className="text-[10px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">
            {point.month}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SatisfactionPage() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [dateRange, setDateRange] = React.useState({ startDate: thirtyDaysAgo, endDate: today })
  const [touchpointFilter, setTouchpointFilter] = React.useState('')

  const { data: csat, isLoading: csatLoading } = useQuery({
    queryKey: ['satisfaction-csat', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/csat', { params: dateRange })
      return data.data as CSATResult
    },
  })

  const { data: nps, isLoading: npsLoading } = useQuery({
    queryKey: ['satisfaction-nps', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/nps', { params: dateRange })
      return data.data as NPSResult
    },
  })

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['satisfaction-trend'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/trend', { params: { months: 6 } })
      return data.data as TrendDataPoint[]
    },
  })

  const { data: feedbackByCategory, isLoading: fbCatLoading } = useQuery({
    queryKey: ['satisfaction-feedback'],
    queryFn: async () => {
      const { data } = await api.get('/satisfaction/feedback')
      return data.data as FeedbackByCategory[]
    },
  })

  const { data: surveys, isLoading: surveysLoading } = useQuery({
    queryKey: ['satisfaction-surveys', touchpointFilter, dateRange],
    queryFn: async () => {
      const params: any = {}
      if (touchpointFilter) params.touchpoint = touchpointFilter
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate
      const { data } = await api.get('/satisfaction/surveys', { params })
      return data.data as SatisfactionSurvey[]
    },
  })

  const handleExport = () => {
    if (!surveys) return
    const headers = ['Date', 'Customer', 'Touchpoint', 'Score', 'Score Type', 'Category', 'Feedback']
    const rows = surveys.map(s => [
      formatDate(s.respondedAt),
      s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : s.customerId,
      s.touchpoint,
      s.score,
      s.scoreType,
      s.category || '-',
      s.feedback || '-',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `satisfaction-surveys-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const scoreColor = (score: number, type: string) => {
    if (type === 'NPS') return score >= 0 ? 'text-green-600' : 'text-red-600'
    if (score >= 4) return 'text-green-600'
    if (score >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const touchpointBadge = (tp: string) => {
    const colors: Record<string, string> = {
      BOOKING_CREATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      SERVICE_COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      PAYMENT_MADE: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      GENERAL: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    }
    return colors[tp] || 'bg-gray-100 text-gray-700'
  }

  if (csatLoading || npsLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Satisfaction</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track CSAT, NPS, and customer feedback</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(p => ({ ...p, startDate: e.target.value }))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(p => ({ ...p, endDate: e.target.value }))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ScoreCard
          title="CSAT Score"
          value={csat?.average?.toFixed(1) ?? '-'}
          subtitle={`${csat?.count ?? 0} responses`}
          icon={Smile}
          color={csat && csat.average >= 4 ? 'text-green-600' : csat && csat.average >= 3 ? 'text-yellow-600' : 'text-red-600'}
        />
        <ScoreCard
          title="NPS Score"
          value={nps?.nps ?? '-'}
          subtitle={`${nps?.total ?? 0} responses`}
          icon={ThumbsUp}
          color={nps && nps.nps >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <ScoreCard
          title="Promoters"
          value={nps?.promoters ?? 0}
          subtitle={`${nps?.total ? Math.round((nps.promoters / nps.total) * 100) : 0}% of responses`}
          icon={Star}
          color="text-green-600"
        />
        <ScoreCard
          title="Detractors"
          value={nps?.detractors ?? 0}
          subtitle={`${nps?.total ? Math.round((nps.detractors / nps.total) * 100) : 0}% of responses`}
          icon={Frown}
          color="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? <PageLoader /> : <TrendBar data={trend || []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {fbCatLoading ? <PageLoader /> : !feedbackByCategory?.length ? (
              <p className="text-gray-400 text-sm py-8 text-center">No categorized feedback yet</p>
            ) : (
              <div className="space-y-3">
                {feedbackByCategory.map(cat => (
                  <div key={cat.category} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div>
                      <p className="font-medium text-sm capitalize text-gray-900 dark:text-white">{cat.category}</p>
                      <p className="text-xs text-gray-500">{cat.totalResponses} responses, {cat.feedbackCount} with feedback</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${scoreColor(cat.averageScore, 'CSAT')}`}>
                        {cat.averageScore.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-400">avg score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Feedback Responses</CardTitle>
            <select
              value={touchpointFilter}
              onChange={(e) => setTouchpointFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
            >
              <option value="">All Touchpoints</option>
              {touchpoints.filter(Boolean).map(tp => (
                <option key={tp} value={tp}>{tp.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {surveysLoading ? <PageLoader /> : !surveys?.length ? (
            <p className="text-gray-400 text-sm py-8 text-center">No survey responses yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Touchpoint</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Score</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Category</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map(survey => (
                    <tr key={survey.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(survey.respondedAt)}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {survey.customer ? `${survey.customer.firstName} ${survey.customer.lastName}` : survey.customerId}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={touchpointBadge(survey.touchpoint)}>
                          {survey.touchpoint.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`font-bold ${scoreColor(survey.score, survey.scoreType)}`}>
                          {survey.score}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">/ {survey.scoreType === 'NPS' ? '10' : '5'}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-400 capitalize">
                        {survey.category || '-'}
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {survey.feedback || '-'}
                      </td>
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
