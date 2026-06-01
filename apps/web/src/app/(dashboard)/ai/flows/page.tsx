'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { Workflow, Plus, Copy, Trash2, Power, PowerOff } from 'lucide-react'
import type { ConversationFlow } from '@/types'

const triggerOptions = [
  { value: 'INTENT_KEYWORD', label: 'Keyword Match' },
  { value: 'EXACT_MATCH', label: 'Exact Match' },
  { value: 'BOOKING_STATUS', label: 'Booking Status' },
  { value: 'PAYMENT_STATUS', label: 'Payment Status' },
  { value: 'INTENT', label: 'Intent' },
]

export default function FlowsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showCreate, setShowCreate] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newDescription, setNewDescription] = React.useState('')
  const [newTrigger, setNewTrigger] = React.useState('INTENT_KEYWORD')
  const [newTriggerValue, setNewTriggerValue] = React.useState('')

  const { data: flows, isLoading } = useQuery({
    queryKey: ['ai-flows'],
    queryFn: async () => {
      const { data } = await api.get('/ai/flows')
      return data.data as ConversationFlow[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ai/flows', {
        name: newName,
        description: newDescription || undefined,
        trigger: newTrigger,
        triggerValue: newTriggerValue,
      })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] })
      setShowCreate(false)
      setNewName('')
      setNewDescription('')
      setNewTrigger('INTENT_KEYWORD')
      setNewTriggerValue('')
      addToast('Flow created', 'success')
    },
    onError: () => {
      addToast('Failed to create flow', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai/flows/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] })
      addToast('Flow deleted', 'success')
    },
    onError: () => {
      addToast('Failed to delete flow', 'error')
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/ai/flows/${id}/duplicate`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] })
      addToast('Flow duplicated', 'success')
    },
    onError: () => {
      addToast('Failed to duplicate flow', 'error')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        await api.patch(`/ai/flows/${id}/activate`)
      } else {
        await api.patch(`/ai/flows/${id}/deactivate`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] })
    },
    onError: () => {
      addToast('Failed to toggle flow', 'error')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flow Builder</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Design branching AI conversation flows
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Flow</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Flow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                label="Flow Name"
                placeholder="e.g., Cancel Booking Flow"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                label="Description"
                placeholder="Optional description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <Select
                label="Trigger Type"
                options={triggerOptions}
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
              />
              <Input
                label="Trigger Value"
                placeholder={
                  newTrigger === 'INTENT_KEYWORD' ? 'e.g., cancel' :
                  newTrigger === 'EXACT_MATCH' ? 'e.g., I want to cancel' :
                  newTrigger === 'BOOKING_STATUS' ? 'e.g., CONFIRMED' :
                  newTrigger === 'PAYMENT_STATUS' ? 'e.g., PENDING' :
                  newTrigger === 'INTENT' ? 'e.g., BOOKING_CANCEL' : ''
                }
                value={newTriggerValue}
                onChange={(e) => setNewTriggerValue(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!newName || !newTriggerValue}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>
      ) : !flows?.length ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Workflow className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No flows yet</p>
              <p className="text-sm mt-1">Create your first conversation flow to automate AI responses</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Flow
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((flow) => (
                  <TableRow key={flow.id}>
                    <TableCell>
                      <Link
                        href={`/ai/flows/${flow.id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {flow.name}
                      </Link>
                      {flow.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{flow.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {flow.trigger}: {flow.triggerValue}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={flow.isActive ? 'success' : 'secondary'}>
                        {flow.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        v{flow.version}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(flow.updatedAt, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate({ id: flow.id, active: !flow.isActive })}
                          title={flow.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {flow.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(flow.id)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this flow?')) {
                              deleteMutation.mutate(flow.id)
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
