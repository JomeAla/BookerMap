'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { timeAgo } from '@/lib/utils'
import { Star } from 'lucide-react'
import type { Review } from '@/types'

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-none text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const firstName = review.customer?.firstName || 'Anonymous'
  const lastInitial = review.customer?.lastName?.charAt(0) || ''
  const serviceName = review.booking?.service?.name

  return (
    <Card className="h-full">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <StarDisplay rating={review.rating} />
          {serviceName && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {serviceName}
            </span>
          )}
        </div>
        {review.comment && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
            {review.comment}
          </p>
        )}
        {review.adminReply && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Response from the business</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{review.adminReply}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {firstName} {lastInitial}.
          </span>
          <span>{timeAgo(review.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

const INITIAL_COUNT = 6

export default function PublicReviewList({ tenantSlug }: { tenantSlug?: string }) {
  const [showAll, setShowAll] = React.useState(false)

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['public-reviews', tenantSlug],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (tenantSlug) params.tenantSlug = tenantSlug
      const { data } = await api.get('/reviews/public', { params })
      return data.data as Review[]
    },
    enabled: !!tenantSlug,
  })

  const avgRating = React.useMemo(() => {
    if (!reviews?.length) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }, [reviews])

  const displayedReviews = showAll ? reviews : (reviews || []).slice(0, INITIAL_COUNT)
  const hasMore = (reviews?.length || 0) > INITIAL_COUNT

  if (!tenantSlug) return null

  if (isLoading) {
    return (
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">What Our Customers Say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Skeleton key={j} className="h-4 w-4 rounded" />
                  ))}
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!reviews?.length) {
    return (
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">What Our Customers Say</h2>
        </div>
        <Card>
          <CardContent className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Star className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm mt-1">Be the first to leave a review</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mt-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">What Our Customers Say</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <StarDisplay rating={Math.round(avgRating)} size="md" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">
              {avgRating.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `Load More (${reviews.length - INITIAL_COUNT} more)`}
          </Button>
        </div>
      )}
    </div>
  )
}
