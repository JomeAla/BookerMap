'use client'

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Star } from 'lucide-react'

interface BookingReviewFormProps {
  bookingId: string
  onSubmitted?: () => void
}

const MAX_COMMENT_LENGTH = 500

export default function BookingReviewForm({ bookingId, onSubmitted }: BookingReviewFormProps) {
  const { addToast } = useToast()
  const [rating, setRating] = React.useState(0)
  const [hoverRating, setHoverRating] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/reviews', { bookingId, rating, comment: comment || undefined })
      return data.data
    },
    onSuccess: () => {
      setSubmitted(true)
      addToast('Review submitted successfully', 'success')
      onSubmitted?.()
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to submit review', 'error')
    },
  })

  const displayRating = hoverRating || rating

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => !submitted && setRating(star)}
              onMouseEnter={() => !submitted && setHoverRating(star)}
              onMouseLeave={() => !submitted && setHoverRating(0)}
              disabled={submitted}
              className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default focus:outline-none"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  star <= displayRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-gray-300 dark:text-gray-600 hover:text-amber-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => {
            if (e.target.value.length <= MAX_COMMENT_LENGTH) {
              setComment(e.target.value)
            }
          }}
          rows={3}
          disabled={submitted}
          maxLength={MAX_COMMENT_LENGTH}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Share your experience..."
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">Your review helps others make informed decisions</p>
          <p className={`text-xs ${comment.length >= MAX_COMMENT_LENGTH ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
            {comment.length}/{MAX_COMMENT_LENGTH}
          </p>
        </div>
      </div>
      <Button
        onClick={() => mutation.mutate()}
        disabled={submitted || rating === 0 || mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? <Spinner size="sm" /> : submitted ? 'Submitted' : 'Submit Review'}
      </Button>
    </div>
  )
}
