'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { timeAgo } from '@/lib/utils'
import { Key, Plus, Copy, XCircle, Shield, Eye, EyeOff } from 'lucide-react'

const AVAILABLE_SCOPES = [
  { value: 'read:bookings', label: 'Read Bookings' },
  { value: 'write:bookings', label: 'Write Bookings' },
  { value: 'read:customers', label: 'Read Customers' },
  { value: 'write:customers', label: 'Write Customers' },
  { value: 'read:services', label: 'Read Services' },
  { value: 'read:availability', label: 'Read Availability' },
]

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  rateLimit: number
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export default function ApiKeysPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [showScopesDialog, setShowScopesDialog] = React.useState<{ id: string; name: string; scopes: string[] } | null>(null)
  const [form, setForm] = React.useState({ name: '', scopes: [] as string[], rateLimit: 100 })
  const [createdKey, setCreatedKey] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await api.get('/api-keys')
      return data.data as ApiKey[]
    },
  })

  const resetForm = React.useCallback(() => {
    setForm({ name: '', scopes: [], rateLimit: 100 })
    setCreatedKey(null)
  }, [])

  const toggleScope = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api-keys', form)
      return data as { apiKey: ApiKey; rawKey: string }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setCreatedKey(result.rawKey)
      addToast('API key created', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to create API key', 'error')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api-keys/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      addToast('API key revoked', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to revoke API key', 'error')
    },
  })

  const updateScopesMutation = useMutation({
    mutationFn: async ({ id, scopes }: { id: string; scopes: string[] }) => {
      const { data } = await api.patch(`/api-keys/${id}/scopes`, { scopes })
      return data.data as ApiKey
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setShowScopesDialog(null)
      addToast('Scopes updated', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to update scopes', 'error')
    },
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast('Copied to clipboard', 'success')
    } catch {
      addToast('Failed to copy', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage API keys for third-party integrations</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {createdKey && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">
              Save this API key - you won't be able to see it again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-700 text-sm font-mono break-all">
                {createdKey}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : !keys?.length ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No API keys yet. Generate one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {key.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(key.scopes as string[]).map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-[10px]">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.isActive ? 'success' : 'destructive'}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {key.lastUsedAt ? timeAgo(key.lastUsedAt) : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowScopesDialog({ id: key.id, name: key.name, scopes: key.scopes as string[] })}
                          disabled={!key.isActive}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        {key.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Revoke this API key? This cannot be undone.')) {
                                revokeMutation.mutate(key.id)
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
            <Input
              label="Key Name"
              placeholder="e.g., My Integration, Website Widget"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Rate Limit (requests per minute)"
              type="number"
              value={form.rateLimit}
              onChange={(e) => setForm({ ...form, rateLimit: parseInt(e.target.value) || 100 })}
              min={1}
              max={10000}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scopes
              </label>
              <div className="space-y-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label key={scope.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="rounded border-gray-300"
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !form.name || !form.scopes.length}>
                {createMutation.isPending ? <Spinner size="sm" /> : 'Generate'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showScopesDialog} onOpenChange={(o) => { if (!o) setShowScopesDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scopes - {showScopesDialog?.name}</DialogTitle>
          </DialogHeader>
          {showScopesDialog && (
            <div className="space-y-4">
              <div className="space-y-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label key={scope.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showScopesDialog.scopes.includes(scope.value)}
                      onChange={() => {
                        const newScopes = showScopesDialog.scopes.includes(scope.value)
                          ? showScopesDialog.scopes.filter((s) => s !== scope.value)
                          : [...showScopesDialog.scopes, scope.value]
                        setShowScopesDialog({ ...showScopesDialog, scopes: newScopes })
                      }}
                      className="rounded border-gray-300"
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowScopesDialog(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => updateScopesMutation.mutate({ id: showScopesDialog.id, scopes: showScopesDialog.scopes })}
                  disabled={updateScopesMutation.isPending}
                >
                  {updateScopesMutation.isPending ? <Spinner size="sm" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
