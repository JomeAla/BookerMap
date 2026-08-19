'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { timeAgo } from '@/lib/utils'
import { ShieldAlert, ShieldOff, Bug } from 'lucide-react'

interface HoneypotHit {
  id: string
  ipAddress: string
  trapType: string
  field: string | null
  path: string | null
  userAgent: string | null
  referer: string | null
  tenantSlug: string | null
  createdAt: string
}

interface BlockedIp {
  id: string
  ipAddress: string
  hitCount: number
  blockedReason: string | null
  blockExpiresAt: string
  lastSeenAt: string
}

const TRAP_TYPE_BADGE: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  TRAP_FIELD: 'warning',
  DECOY_ENDPOINT: 'destructive',
  SUSPICIOUS_PATTERN: 'secondary',
}

export default function HoneypotAdminPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [ipFilter, setIpFilter] = React.useState('')

  const { data: hitsData, isLoading: hitsLoading } = useQuery({
    queryKey: ['honeypot-hits', ipFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (ipFilter.trim()) params.set('ip', ipFilter.trim())
      const { data } = await api.get(`/security/honeypot/hits?${params.toString()}`)
      return data.data as { items: HoneypotHit[]; total: number }
    },
  })

  const { data: blocked, isLoading: blockedLoading } = useQuery({
    queryKey: ['honeypot-blocked'],
    queryFn: async () => {
      const { data } = await api.get('/security/honeypot/blocked')
      return data.data as BlockedIp[]
    },
    refetchInterval: 30000,
  })

  const unblockMutation = useMutation({
    mutationFn: async (ip: string) => {
      await api.post(`/security/honeypot/${ip}/unblock`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['honeypot-blocked'] })
      queryClient.invalidateQueries({ queryKey: ['honeypot-hits'] })
      addToast('IP unblocked', 'success')
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast(msg || 'Failed to unblock IP', 'error')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anti-Bot Security</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Honeypot traps, decoy endpoints, and auto-blocked IPs
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Bug className="h-3.5 w-3.5" />
          {hitsData?.total ?? 0} total detections
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Blocked IPs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {blockedLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : !blocked?.length ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              <ShieldOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No blocked IPs. Nice and quiet out there.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Hits</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocked.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono text-sm">{ip.ipAddress}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{ip.hitCount}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[260px] truncate">
                      {ip.blockedReason || 'Manually blocked'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{timeAgo(ip.blockExpiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unblockMutation.mutate(ip.ipAddress)}
                        disabled={unblockMutation.isPending}
                      >
                        Unblock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-amber-500" />
              Honeypot Hits
            </CardTitle>
            <Input
              placeholder="Filter by IP..."
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {hitsLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : !hitsData?.items.length ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              <ShieldOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No honeypot detections yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trap / Path</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hitsData.items.map((hit) => (
                  <TableRow key={hit.id}>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {timeAgo(hit.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{hit.ipAddress}</TableCell>
                    <TableCell>
                      <Badge variant={TRAP_TYPE_BADGE[hit.trapType] ?? 'secondary'} className="text-[10px]">
                        {hit.trapType.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate">
                      <code className="text-xs">
                        {hit.field ? `field:${hit.field}` : hit.path}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[240px] truncate" title={hit.userAgent ?? ''}>
                      {hit.userAgent || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}