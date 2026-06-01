'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, FileText, Image, Download, ShieldAlert } from 'lucide-react'
import { Dispute, DisputeStatus, DisputeEvidence } from '@/types'

const statusActions: { value: DisputeStatus; label: string }[] = [
  { value: DisputeStatus.OPEN, label: 'Open' },
  { value: DisputeStatus.INVESTIGATING, label: 'Investigating' },
  { value: DisputeStatus.RESOLVED, label: 'Resolved' },
  { value: DisputeStatus.CLOSED, label: 'Closed' },
]

const typeLabels: Record<string, string> = {
  CHARGEBACK: 'Chargeback',
  SERVICE_NOT_RENDERED: 'Service Not Rendered',
  SERVICE_DEFICIENT: 'Service Deficient',
  DAMAGES: 'Damages',
  BILLING_ERROR: 'Billing Error',
  OTHER: 'Other',
}

const resolutionLabels: Record<string, string> = {
  REFUND_FULL: 'Full Refund',
  REFUND_PARTIAL: 'Partial Refund',
  CREDIT: 'Credit',
  DISMISSED: 'Dismissed',
  OTHER: 'Other',
}

export default function DisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const id = params.id as string
  const [isResolving, setIsResolving] = React.useState(false)
  const [resolution, setResolution] = React.useState('REFUND_FULL')
  const [resolutionNote, setResolutionNote] = React.useState('')
  const [newStatus, setNewStatus] = React.useState<DisputeStatus>(DisputeStatus.OPEN)
  const [showStatusForm, setShowStatusForm] = React.useState(false)

  const [evidenceFile, setEvidenceFile] = React.useState<{ fileName: string; fileType: string; fileData: string } | null>(null)
  const [evidenceDescription, setEvidenceDescription] = React.useState('')
  const [showEvidenceForm, setShowEvidenceForm] = React.useState(false)

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['dispute', id],
    queryFn: async () => {
      const { data } = await api.get(`/disputes/${id}`)
      return data.data as Dispute
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await api.patch(`/disputes/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', id] })
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] })
      setShowStatusForm(false)
      addToast('Status updated', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to update status', 'error'),
  })

  const resolveMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/disputes/${id}/resolve`, { resolution, note: resolutionNote || undefined })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', id] })
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] })
      setIsResolving(false)
      setResolutionNote('')
      addToast('Dispute resolved', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to resolve dispute', 'error'),
  })

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      if (!evidenceFile) return
      await api.post(`/disputes/${id}/evidence`, {
        ...evidenceFile,
        description: evidenceDescription || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', id] })
      setShowEvidenceForm(false)
      setEvidenceFile(null)
      setEvidenceDescription('')
      addToast('Evidence added', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to add evidence', 'error'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      setEvidenceFile({
        fileName: file.name,
        fileType: file.type.startsWith('image/') ? 'image' : file.type.startsWith('text/') ? 'text' : 'document',
        fileData: base64,
      })
    }
    reader.readAsDataURL(file)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Dispute not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/disputes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispute Detail</h1>
            <StatusBadge status={dispute.status} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Created {formatDate(dispute.createdAt, 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Dispute Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium">{typeLabels[dispute.type] || dispute.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount in Dispute</p>
                  <p className="font-medium">{formatCurrency(dispute.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="font-medium">{dispute.customer?.firstName} {dispute.customer?.lastName}</p>
                  {dispute.customer?.email && (
                    <p className="text-xs text-gray-400">{dispute.customer.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Booking</p>
                  <p className="font-medium">{dispute.booking?.service?.name || '-'}</p>
                  {dispute.booking && (
                    <p className="text-xs text-gray-400">{formatDate(dispute.booking.startTime, 'MMM d, yyyy')}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Invoice</p>
                  <p className="font-medium">{dispute.invoice?.invoiceNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Resolved By</p>
                  <p className="font-medium">{dispute.resolvedBy ? `${dispute.resolvedBy.firstName} ${dispute.resolvedBy.lastName}` : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
                <p className="mt-1 text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-3 rounded">{dispute.description}</p>
              </div>
              {dispute.resolution && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Resolution</p>
                  <p className="font-medium text-green-600 dark:text-green-400">{resolutionLabels[dispute.resolution] || dispute.resolution}</p>
                  {dispute.resolutionNote && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{dispute.resolutionNote}</p>
                  )}
                  {dispute.resolvedAt && (
                    <p className="text-xs text-gray-400 mt-1">Resolved {formatDate(dispute.resolvedAt, 'MMM d, yyyy h:mm a')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Evidence ({dispute.evidence?.length || 0})</CardTitle>
              <Button size="sm" onClick={() => setShowEvidenceForm(true)}>Add Evidence</Button>
            </CardHeader>
            <CardContent>
              {showEvidenceForm && (
                <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded space-y-3">
                  <Input
                    type="file"
                    label="Upload File"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Input
                    label="Description"
                    value={evidenceDescription}
                    onChange={(e) => setEvidenceDescription(e.target.value)}
                    placeholder="Describe this evidence..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowEvidenceForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={() => evidenceMutation.mutate()} disabled={!evidenceFile || evidenceMutation.isPending}>
                      {evidenceMutation.isPending ? <Spinner size="sm" /> : 'Upload'}
                    </Button>
                  </div>
                </div>
              )}

              {!dispute.evidence?.length && !showEvidenceForm ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No evidence uploaded yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dispute.evidence?.map((ev) => (
                    <div key={ev.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        {ev.fileType === 'image' ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm font-medium truncate">{ev.fileName}</span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-gray-500">{ev.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          by {ev.uploadedBy?.firstName} {ev.uploadedBy?.lastName}
                        </span>
                        {ev.fileType === 'image' ? (
                          <button
                            onClick={() => window.open(`data:image/*;base64,${ev.fileData}`, '_blank')}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" /> View
                          </button>
                        ) : (
                          <a
                            href={`data:application/octet-stream;base64,${ev.fileData}`}
                            download={ev.fileName}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
            <>
              <Card>
                <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {!showStatusForm ? (
                    <Button className="w-full" variant="outline" onClick={() => { setShowStatusForm(true); setNewStatus(dispute.status as DisputeStatus) }}>
                      Update Status
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Select
                        label="Status"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as DisputeStatus)}
                        options={statusActions.map(a => ({ value: a.value, label: a.label }))}
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowStatusForm(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => updateStatusMutation.mutate(newStatus)} disabled={updateStatusMutation.isPending}>
                          {updateStatusMutation.isPending ? <Spinner size="sm" /> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isResolving ? (
                    <Button className="w-full" onClick={() => setIsResolving(true)}>
                      Resolve Dispute
                    </Button>
                  ) : (
                    <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded p-3">
                      <Select
                        label="Resolution"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        options={[
                          { value: 'REFUND_FULL', label: 'Full Refund' },
                          { value: 'REFUND_PARTIAL', label: 'Partial Refund' },
                          { value: 'CREDIT', label: 'Credit' },
                          { value: 'DISMISSED', label: 'Dismissed' },
                          { value: 'OTHER', label: 'Other' },
                        ]}
                      />
                      <Input
                        label="Note"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Resolution note..."
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsResolving(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
                          {resolveMutation.isPending ? <Spinner size="sm" /> : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-gray-500">{formatDate(dispute.createdAt, 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                {dispute.status === 'INVESTIGATING' && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-yellow-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Investigating</p>
                      <p className="text-xs text-gray-500">Currently under investigation</p>
                    </div>
                  </div>
                )}
                {dispute.resolvedAt && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Resolved ({resolutionLabels[dispute.resolution || ''] || dispute.resolution})</p>
                      <p className="text-xs text-gray-500">{formatDate(dispute.resolvedAt, 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                )}
                {dispute.status === 'CLOSED' && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-gray-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Closed</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
