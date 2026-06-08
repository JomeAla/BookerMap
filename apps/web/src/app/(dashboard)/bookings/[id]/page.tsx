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
import { ArrowLeft, User, Phone, Mail, Clock, Wrench, DollarSign, MapPin, Star, Package, Plus, Upload, Trash2, FileIcon, Navigation, CreditCard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import dynamic from 'next/dynamic'
import type { Booking, Dispatch, Review, BookingInventory, InventoryItem, BookingFile, LocationUpdate, Terminal } from '@/types'
import { JobStatus } from '@/types'

const TechnicianTracker = dynamic(() => import('@/components/map/technician-tracker'), { ssr: false })

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

      {(booking.dispatch?.status === JobStatus.EN_ROUTE || booking.dispatch?.status === JobStatus.STARTED) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-500" />
              Live Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TechnicianTracker
              bookingId={booking.id}
              customerLat={booking.customer?.addresses?.[0]?.latitude}
              customerLng={booking.customer?.addresses?.[0]?.longitude}
            />
          </CardContent>
        </Card>
      )}

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
            {booking.invoices && booking.invoices.length > 0 && booking.invoices[0].status !== 'PAID' && booking.invoices[0].status !== 'CANCELLED' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const el = document.getElementById('pos-payment-section')
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' })
                    const posBtn = el.querySelector('button') as HTMLButtonElement
                    if (posBtn) posBtn.click()
                  }
                }}
              >
                <CreditCard className="h-4 w-4 mr-1" /> Pay via Terminal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PosPaymentSection booking={booking} />
      <MaterialsSection bookingId={booking.id} />
      <FilesSection bookingId={booking.id} />
      <ReviewSection booking={booking} />
    </div>
  )
}

function MaterialsSection({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedItemId, setSelectedItemId] = React.useState('')
  const [usageQuantity, setUsageQuantity] = React.useState(1)

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['booking-inventory', bookingId],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/usage/${bookingId}`)
      return data.data as (BookingInventory & { item: InventoryItem })[]
    },
  })

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-all'],
    queryFn: async () => {
      const { data } = await api.get('/inventory')
      return data.data as InventoryItem[]
    },
    enabled: dialogOpen,
  })

  const logUsageMutation = useMutation({
    mutationFn: async (body: { bookingId: string; itemId: string; quantity: number }) => {
      const { data } = await api.post('/inventory/usage', body)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-inventory', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setDialogOpen(false)
      setSelectedItemId('')
      setUsageQuantity(1)
      addToast('Material usage logged', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to log usage', 'error'),
  })

  const handleAddMaterial = () => {
    if (!selectedItemId || usageQuantity < 1) return
    logUsageMutation.mutate({ bookingId, itemId: selectedItemId, quantity: usageQuantity })
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            Materials Used
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Material
          </Button>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : !usage || usage.length === 0 ? (
            <p className="text-sm text-gray-500">No materials logged for this booking yet.</p>
          ) : (
            <div className="space-y-2">
              {usage.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{u.item?.name || 'Unknown item'}</p>
                      <p className="text-xs text-gray-500">{u.quantityUsed} {u.item?.unit}(s) used</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-gray-500">
                    {formatCurrency((u.unitCostAtTime * u.quantityUsed) / 100)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">Select item...</option>
                {inventoryItems?.filter((i) => i.quantity > 0).map((item) => (
                  <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                    {item.name} ({item.quantity} {item.unit} available)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <Input
                type="number"
                min="1"
                value={usageQuantity}
                onChange={(e) => setUsageQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddMaterial}
              disabled={!selectedItemId || logUsageMutation.isPending}
            >
              {logUsageMutation.isPending ? 'Adding...' : 'Add Material'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PosPaymentSection({ booking }: { booking: Booking }) {
  const { addToast } = useToast()
  const [posDialogOpen, setPosDialogOpen] = React.useState(false)
  const [posReference, setPosReference] = React.useState('')
  const [posStatus, setPosStatus] = React.useState<string | null>(null)
  const [posLoading, setPosLoading] = React.useState(false)
  const [posAmount, setPosAmount] = React.useState('')
  const [posProvider, setPosProvider] = React.useState<'paystack' | 'flutterwave'>('paystack')
  const [posTerminalId, setPosTerminalId] = React.useState('')

  const invoice = booking.invoices?.[0]
  const isUnpaid = invoice && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && invoice.status !== 'REFUNDED'

  const { data: terminals } = useQuery({
    queryKey: ['terminals'],
    queryFn: async () => {
      const { data } = await api.get('/payments/terminals')
      return data.data as Terminal[]
    },
    enabled: posDialogOpen,
  })

  React.useEffect(() => {
    if (!posDialogOpen) {
      setPosReference('')
      setPosStatus(null)
      setPosAmount('')
      setPosProvider('paystack')
      setPosTerminalId('')
    }
  }, [posDialogOpen])

  async function handleGeneratePos() {
    if (!invoice) return
    const amount = Number(posAmount) || invoice.total
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast('Enter a valid amount', 'error')
      return
    }
    setPosLoading(true)
    setPosStatus(null)
    try {
      const { data } = await api.post('/payments/pos/initialize', {
        amount,
        provider: posProvider,
        invoiceId: invoice.id,
        bookingId: booking.id,
        terminalId: posTerminalId || undefined,
      })
      setPosReference(data.data.reference)
      setPosStatus('initialized')
      addToast('POS payment initialized. Reference: ' + data.data.reference, 'success')
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
    <div id="pos-payment-section">
      <Card>
        <CardHeader><CardTitle className="text-base">Pay with Terminal</CardTitle></CardHeader>
        <CardContent>
          <Button size="sm" variant="secondary" onClick={() => setPosDialogOpen(true)}>
            <CreditCard className="h-4 w-4 mr-1" /> Pay via Terminal
          </Button>
        </CardContent>
      </Card>

      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Terminal Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Invoice: {invoice?.invoiceNumber} — {formatCurrency(invoice?.total || 0)}
            </p>

            <Input
              label="Amount"
              type="number"
              value={posAmount}
              onChange={(e) => setPosAmount(e.target.value)}
              placeholder={`${invoice?.total || 0}`}
              min="1"
              step="0.01"
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <select
                className="flex h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={posProvider}
                onChange={(e) => setPosProvider(e.target.value as 'paystack' | 'flutterwave')}
              >
                <option value="paystack">Paystack</option>
                <option value="flutterwave">Flutterwave</option>
              </select>
            </div>

            {terminals && terminals.length > 0 && (
              <Select
                label="Terminal"
                options={[
                  { value: '', label: 'Auto-select' },
                  ...terminals.map((t) => ({
                    value: t.id,
                    label: `${t.name} ${t.status === 'online' || t.status === 'active' ? '(Online)' : '(Offline)'}`,
                  })),
                ]}
                value={posTerminalId}
                onChange={(e) => setPosTerminalId(e.target.value)}
              />
            )}

            {!posReference ? (
              <Button className="w-full" onClick={handleGeneratePos} disabled={posLoading}>
                {posLoading ? 'Sending to Terminal...' : 'Send to Terminal'}
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
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const CATEGORY_COLORS: Record<string, string> = {
  photo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  document: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  before: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  after: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

function FilesSection({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const { data: files, isLoading } = useQuery({
    queryKey: ['booking-files', bookingId],
    queryFn: async () => {
      const { data } = await api.get(`/files/booking/${bookingId}`)
      return data.data as BookingFile[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/files/${fileId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-files', bookingId] })
      addToast('File deleted', 'success')
    },
    onError: () => addToast('Failed to delete file', 'error'),
  })

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.elements.namedItem('file') as HTMLInputElement
    const categoryInput = form.elements.namedItem('category') as HTMLSelectElement
    const file = fileInput.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      addToast('File type not supported. Use JPEG, PNG, WebP, or PDF.', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('File too large. Maximum 10MB.', 'error')
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      await api.post('/files/upload', {
        bookingId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        data: base64,
        category: categoryInput.value,
      })

      queryClient.invalidateQueries({ queryKey: ['booking-files', bookingId] })
      setUploadDialogOpen(false)
      addToast('File uploaded', 'success')
    } catch {
      addToast('Failed to upload file', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-gray-400" />
            Files & Photos
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload File
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : !files || files.length === 0 ? (
            <p className="text-sm text-gray-500">No files attached to this booking yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {files.map((file) => (
                <div key={file.id} className="group relative bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  {file.fileType.startsWith('image/') ? (
                    <div className="aspect-square bg-gray-100 dark:bg-gray-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.data}
                        alt={file.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                      <FileIcon className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-medium truncate" title={file.fileName}>{file.fileName}</p>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[file.category] || CATEGORY_COLORS.other}`}>
                        {file.category}
                      </Badge>
                      <span className="text-[10px] text-gray-400">{formatFileSize(file.fileSize)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="absolute top-1 right-1 p-1 bg-white/80 dark:bg-gray-900/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/50"
                    onClick={() => {
                      if (confirm('Delete this file?')) {
                        deleteMutation.mutate(file.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">File</label>
              <Input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                name="category"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                defaultValue="photo"
              >
                <option value="photo">Photo</option>
                <option value="before">Before</option>
                <option value="after">After</option>
                <option value="document">Document</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Button className="w-full" type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </form>
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
