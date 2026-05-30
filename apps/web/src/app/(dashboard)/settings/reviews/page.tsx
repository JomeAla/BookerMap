'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Star, CheckCircle, XCircle, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { Review } from '@/types'

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const className = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${className} ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  )
}

export default function ReviewsSettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [replyDialog, setReplyDialog] = React.useState<{ id: string; currentReply?: string | null } | null>(null)
  const [replyText, setReplyText] = React.useState('')

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews-admin'],
    queryFn: async () => {
      const { data } = await api.get('/reviews')
      return data.data as Review[]
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reviews/${id}/approve`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-admin'] })
      addToast('Review approved', 'success')
    },
    onError: () => addToast('Failed to approve review', 'error'),
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reviews/${id}/reject`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-admin'] })
      addToast('Review rejected', 'success')
    },
    onError: () => addToast('Failed to reject review', 'error'),
  })

  const replyMutation = useMutation({
    mutationFn: async ({ id, adminReply }: { id: string; adminReply: string }) => {
      await api.patch(`/reviews/${id}/reply`, { adminReply })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-admin'] })
      setReplyDialog(null)
      setReplyText('')
      addToast('Reply posted', 'success')
    },
    onError: () => addToast('Failed to post reply', 'error'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reviews & Ratings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Moderate customer reviews. Approved reviews are visible on your public pages.
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : !reviews?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Star className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm mt-1">Customer reviews will appear here after services are completed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <StarDisplay rating={review.rating} size="md" />
                      <StatusBadge status={review.status} />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {review.customer?.firstName} {review.customer?.lastName}
                      {review.booking?.service?.name && <> &middot; {review.booking.service.name}</>}
                      {review.technician && <> &middot; Tech: {review.technician.firstName}</>}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
                    )}
                    {review.adminReply && (
                      <div className="mt-2 pl-4 border-l-2 border-blue-400">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Your reply:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{review.adminReply}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    {review.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => approveMutation.mutate(review.id)}
                          disabled={approveMutation.isPending}
                          title="Approve"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => rejectMutation.mutate(review.id)}
                          disabled={rejectMutation.isPending}
                          title="Reject"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyDialog({ id: review.id, currentReply: review.adminReply })
                        setReplyText(review.adminReply || '')
                      }}
                      title="Reply"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!replyDialog} onOpenChange={(open) => { if (!open) setReplyDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setReplyDialog(null)}>Cancel</Button>
            <Button
              onClick={() => replyDialog && replyMutation.mutate({ id: replyDialog.id, adminReply: replyText })}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              Post Reply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
