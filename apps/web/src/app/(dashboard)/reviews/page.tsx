'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { Star, MessageSquare, ThumbsUp, ThumbsDown, CheckCircle, AlertTriangle } from 'lucide-react'
import type { Review, ReviewStatus } from '@/types'

const statusTabs: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'} ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-none text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [replyDialog, setReplyDialog] = React.useState<{ open: boolean; reviewId: string }>({ open: false, reviewId: '' })
  const [replyText, setReplyText] = React.useState('')

  const { data: allReviews } = useQuery({
    queryKey: ['reviews-all'],
    queryFn: async () => {
      const { data } = await api.get('/reviews')
      return data.data as Review[]
    },
  })

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/reviews', { params })
      return data.data as Review[]
    },
  })

  const stats = React.useMemo(() => {
    if (!allReviews) return { total: 0, avgRating: 0, pending: 0, approved: 0 }
    const total = allReviews.length
    const avgRating = total > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0
    const pending = allReviews.filter((r) => r.status === ReviewStatus.PENDING).length
    const approved = allReviews.filter((r) => r.status === ReviewStatus.APPROVED).length
    return { total, avgRating, pending, approved }
  }, [allReviews])

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reviews/${id}/approve`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      addToast('Review approved', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to approve', 'error'),
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reviews/${id}/reject`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      addToast('Review rejected', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to reject', 'error'),
  })

  const replyMutation = useMutation({
    mutationFn: async ({ id, adminReply }: { id: string; adminReply: string }) => {
      await api.patch(`/reviews/${id}/reply`, { adminReply })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setReplyDialog({ open: false, reviewId: '' })
      setReplyText('')
      addToast('Reply added', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to reply', 'error'),
  })

  const summaryCards = [
    { label: 'Total Reviews', value: stats.total, icon: Star, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Average Rating', value: `${stats.avgRating.toFixed(1)} / 5`, icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { label: 'Pending Reviews', value: stats.pending, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Approved Reviews', value: stats.approved, icon: ThumbsUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and moderate customer reviews</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-1 flex-wrap">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} /></div>
          ) : !reviews?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No reviews found</p>
              <p className="text-sm mt-1">Customer reviews will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rating</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <StarRating rating={r.rating} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {r.customer?.firstName} {r.customer?.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {r.booking?.service?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-xs">
                        <span className="line-clamp-2">
                          {r.comment
                            ? r.comment.length > 100
                              ? r.comment.slice(0, 100) + '...'
                              : r.comment
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(r.createdAt, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.status === ReviewStatus.PENDING && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-800"
                                onClick={() => approveMutation.mutate(r.id)}
                                disabled={approveMutation.isPending}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => rejectMutation.mutate(r.id)}
                                disabled={rejectMutation.isPending}
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {r.status === ReviewStatus.APPROVED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyDialog({ open: true, reviewId: r.id })
                                setReplyText(r.adminReply || '')
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" /> Reply
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={replyDialog.open} onOpenChange={(o) => setReplyDialog({ ...replyDialog, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{replyText ? 'Edit Reply' : 'Reply to Review'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Reply</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
                placeholder="Write your reply..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setReplyDialog({ open: false, reviewId: '' }); setReplyText('') }}>
                Cancel
              </Button>
              <Button
                onClick={() => replyMutation.mutate({ id: replyDialog.reviewId, adminReply: replyText })}
                disabled={replyMutation.isPending || !replyText.trim()}
              >
                {replyMutation.isPending ? <Spinner size="sm" /> : 'Submit Reply'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
