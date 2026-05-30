'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, User, Phone, Mail, Clock, Wrench, DollarSign, MapPin, Star } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Booking, Dispatch, Review } from '@/types'

export default function BookingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/${id}`)
      return data.data as Booking
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { data } = await api.patch(`/bookings/${id}`, { status })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      addToast('Booking status updated', 'success')
    },
    onError: () => addToast('Failed to update status', 'error'),
  })

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/bookings/${id}/dispatch`, {})
      return data.data as Dispatch
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      addToast('Technician dispatched', 'success')
    },
    onError: () => addToast('Failed to dispatch', 'error'),
  })

  if (isLoading) return <PageLoader />
  if (!booking) return <div className="text-center py-12 text-gray-500">Booking not found</div>

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Details</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {booking.id}</p>
          </div>
          <StatusBadge status={booking.status} className="text-sm px-3 py-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{booking.customer?.firstName} {booking.customer?.lastName}</span>
            </div>
            {booking.customer?.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{booking.customer.email}</span>
              </div>
            )}
            {booking.customer?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{booking.customer.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Service Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Wrench className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{booking.service?.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{formatDate(booking.startTime, 'MMM d, yyyy')} at {formatDate(booking.startTime, 'h:mm a')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Ends {formatDate(booking.endTime, 'h:mm a')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="font-semibold">{formatCurrency(booking.totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        {booking.location && (
          <Card>
            <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{booking.location.name}</span>
              </div>
              {booking.location.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{booking.location.address}</span>
                </div>
              )}
              {booking.location.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{booking.location.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Dispatch</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {booking.dispatch ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{booking.dispatch.assignedTo?.firstName} {booking.dispatch.assignedTo?.lastName}</span>
                </div>
                <StatusBadge status={booking.dispatch.status} />
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Not yet dispatched</p>
                <Button size="sm" onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending}>
                  Dispatch Technician
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].filter((s) => s !== booking.status).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === 'CANCELLED' ? 'destructive' : 'secondary'}
                onClick={() => statusMutation.mutate({ status })}
                disabled={statusMutation.isPending}
              >
                Mark as {status.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PosPaymentSection booking={booking} />
      <ReviewSection booking={booking} />
    </div>
  )
}

function PosPaymentSection({ booking }: { booking: Booking }) {
  const { addToast } = useToast()
  const [posDialogOpen, setPosDialogOpen] = React.useState(false)
  const [posReference, setPosReference] = React.useState('')
  const [posStatus, setPosStatus] = React.useState<string | null>(null)
  const [posLoading, setPosLoading] = React.useState(false)

  const invoice = booking.invoices?.[0]
  const isUnpaid = invoice && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && invoice.status !== 'REFUNDED'

  async function handleGeneratePos() {
    if (!invoice) return
    setPosLoading(true)
    setPosStatus(null)
    try {
      const { data } = await api.post('/payments/pos/initialize', {
        amount: invoice.total,
        provider: 'paystack',
        invoiceId: invoice.id,
        bookingId: booking.id,
      })
      setPosReference(data.data.reference)
      setPosStatus('initialized')
      addToast('POS payment initialized', 'success')
    } catch {
      addToast('Failed to initialize POS payment', 'error')
    } finally {
      setPosLoading(false)
    }
  }

  async function handleVerifyPos() {
    if (!posReference) return
    setPosLoading(true)
    try {
      const { data } = await api.post(`/payments/pos/verify/${posReference}`)
      setPosStatus(data.data.status === 'success' ? 'completed' : 'failed')
      if (data.data.status === 'success') {
        addToast('POS payment verified', 'success')
      } else {
        addToast('POS payment not yet completed', 'warning')
      }
    } catch {
      addToast('Failed to verify POS payment', 'error')
    } finally {
      setPosLoading(false)
    }
  }

  if (!isUnpaid) return null

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Pay with POS</CardTitle></CardHeader>
        <CardContent>
          <Button size="sm" variant="secondary" onClick={() => setPosDialogOpen(true)}>
            Pay with POS
          </Button>
        </CardContent>
      </Card>

      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>POS Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Amount: {formatCurrency(invoice?.total || 0)}
            </p>
            {!posReference ? (
              <Button className="w-full" onClick={handleGeneratePos} disabled={posLoading}>
                {posLoading ? 'Initializing...' : 'Generate POS Payment'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reference Code</p>
                  <p className="text-sm font-mono font-bold break-all">{posReference}</p>
                </div>
                {posStatus === 'initialized' && (
                  <Button className="w-full" variant="secondary" onClick={handleVerifyPos} disabled={posLoading}>
                    {posLoading ? 'Checking...' : 'Verify Payment'}
                  </Button>
                )}
                {posStatus === 'completed' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Payment Completed</p>
                  </div>
                )}
                {posStatus === 'failed' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Payment Failed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ReviewSection({ booking }: { booking: Booking }) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const [hoverRating, setHoverRating] = React.useState(0)

  const { data: existingReview } = useQuery({
    queryKey: ['booking-review', booking.id],
    queryFn: async () => {
      const { data } = await api.get('/reviews')
      return (data.data as Review[]).find((r) => r.bookingId === booking.id)
    },
    enabled: booking.status === 'COMPLETED',
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      const { data } = await api.post('/reviews', { bookingId: booking.id, rating, comment })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-review', booking.id] })
      addToast('Review submitted', 'success')
    },
    onError: () => addToast('Failed to submit review', 'error'),
  })

  if (booking.status !== 'COMPLETED') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          Customer Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        {existingReview ? (
          <div className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${star <= existingReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                />
              ))}
            </div>
            {existingReview.comment && (
              <p className="text-sm text-gray-700 dark:text-gray-300">{existingReview.comment}</p>
            )}
            {existingReview.adminReply && (
              <div className="pl-3 border-l-2 border-blue-400">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Your reply:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{existingReview.adminReply}</p>
              </div>
            )}
            <Badge className={existingReview.status === 'APPROVED' ? 'bg-green-100 text-green-700' : existingReview.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
              {existingReview.status === 'APPROVED' ? 'Approved' : existingReview.status === 'REJECTED' ? 'Rejected' : 'Pending'}
            </Badge>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">How was your service experience?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-colors"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${star <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm min-h-[80px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your experience (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              onClick={() => reviewMutation.mutate({ rating, comment })}
              disabled={rating === 0 || reviewMutation.isPending}
            >
              {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
