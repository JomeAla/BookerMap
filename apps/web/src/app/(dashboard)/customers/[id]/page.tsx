'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, FileText, Tag, Edit3, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Customer, SavedCard } from '@/types'

export default function CustomerDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [editingTags, setEditingTags] = React.useState(false)
  const [tagInput, setTagInput] = React.useState('')

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${id}`)
      return data.data as Customer
    },
  })

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const { data } = await api.patch(`/customers/${id}/tags`, { tags })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] })
      setEditingTags(false)
      addToast('Tags updated', 'success')
    },
    onError: () => addToast('Failed to update tags', 'error'),
  })

  const { data: savedCards, refetch: refetchCards } = useQuery({
    queryKey: ['customer-cards', id],
    queryFn: async () => {
      const { data } = await api.get(`/payments/cards/${id}`)
      return data.data as SavedCard[]
    },
    enabled: !!id,
  })

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      await api.delete(`/payments/cards/${cardId}`)
    },
    onSuccess: () => {
      refetchCards()
      addToast('Card deleted', 'success')
    },
    onError: () => addToast('Failed to delete card', 'error'),
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (cardId: string) => {
      await api.put(`/payments/cards/${cardId}/default`)
    },
    onSuccess: () => {
      refetchCards()
      addToast('Default card updated', 'success')
    },
    onError: () => addToast('Failed to set default card', 'error'),
  })

  if (isLoading) return <PageLoader />
  if (!customer) return <div className="text-center py-12 text-gray-500">Customer not found</div>

  const name = `${customer.firstName} ${customer.lastName}`

  return (
    <div className="space-y-6">
      <div>
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{customer.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{formatPhone(customer.phone)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Customer since {formatDate(customer.createdAt, 'MMM yyyy')}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                {editingTags ? (
                  <div className="space-y-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
                          updateTagsMutation.mutate(tags)
                        }}
                        disabled={updateTagsMutation.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTags(false)
                          setTagInput(customer.tags?.join(', ') || '')
                        }}
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {customer.tags?.length ? customer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    )) : <span className="text-gray-500">No tags</span>}
                    <button
                      onClick={() => {
                        setTagInput(customer.tags?.join(', ') || '')
                        setEditingTags(true)
                      }}
                      className="text-blue-500 hover:text-blue-700 ml-1"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Addresses</CardTitle></CardHeader>
          <CardContent>
            {customer.addresses?.length ? (
              <div className="space-y-3">
                {customer.addresses.map((addr) => (
                  <div key={addr.id} className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{addr.label}</p>
                      <p className="text-gray-500">{addr.street}, {addr.city}, {addr.state}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No addresses saved</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">{customer.notes || 'No notes'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!customer.bookings?.length ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No booking history</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.service?.name}</TableCell>
                      <TableCell>{formatDate(booking.startTime, 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell>{formatCurrency(booking.totalPrice)}</TableCell>
                      <TableCell><StatusBadge status={booking.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {!savedCards?.length ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">No saved cards</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium capitalize">{card.brand}</span> ****{card.last4}
                    {card.expMonth && card.expYear && (
                      <span className="text-gray-500 ml-2">Exp {card.expMonth}/{card.expYear}</span>
                    )}
                    {card.cardType && <span className="text-gray-400 ml-2 text-xs uppercase">{card.cardType}</span>}
                    {card.bank && <span className="text-gray-400 ml-2 text-xs">{card.bank}</span>}
                    {card.isDefault && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>}
                  </div>
                  <div className="flex gap-2">
                    {!card.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDefaultMutation.mutate(card.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" /> Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => deleteCardMutation.mutate(card.id)}
                      disabled={deleteCardMutation.isPending}
                    >
                      <X className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
