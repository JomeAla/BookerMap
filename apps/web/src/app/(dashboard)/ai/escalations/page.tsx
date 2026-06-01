'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, timeAgo } from '@/lib/utils'
import { MessageSquare, ChevronDown, ChevronRight, CheckCircle, UserCheck, AlertCircle } from 'lucide-react'
import type { Escalation, EscalationStatus, AiMessage } from '@/types'
import { useAuth } from '@/hooks/useAuth'

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  ASSIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  NORMAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
}

export default function EscalationsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = React.useState<string | undefined>()
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['escalations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '50')
      const { data: res } = await api.get(`/ai/escalations?${params.toString()}`)
      return res.data.data as Escalation[]
    },
    refetchInterval: 10000,
  })

  const { data: messages, isFetching: messagesLoading } = useQuery({
    queryKey: ['escalation-messages', expandedId],
    queryFn: async () => {
      if (!expandedId) return []
      const { data: res } = await api.get(`/ai/escalations/${expandedId}`)
      return (res.data as any).messages as AiMessage[]
    },
    enabled: !!expandedId,
  })

  const assignMutation = useMutation({
    mutationFn: async (escalationId: string) => {
      await api.patch(`/ai/escalations/${escalationId}/assign`, { agentUserId: user?.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalations'] })
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async (escalationId: string) => {
      await api.patch(`/ai/escalations/${escalationId}/resolve`, { resolution: 'Resolved by agent' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalations'] })
    },
  })

  const tabs = [
    { label: 'All', value: undefined },
    { label: 'Open', value: 'OPEN' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Resolved', value: 'RESOLVED' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Escalations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Customer requests for human agent assistance
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>
      ) : !data?.length ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No escalations found</p>
              <p className="text-sm mt-1">All customer requests are being handled by the AI assistant</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((escalation) => {
            const isExpanded = expandedId === escalation.id
            return (
              <Card key={escalation.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : escalation.id)}
                  className="w-full text-left"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertCircle className={`h-5 w-5 shrink-0 ${
                          escalation.priority === 'URGENT' ? 'text-red-500' :
                          escalation.priority === 'HIGH' ? 'text-orange-500' :
                          'text-gray-400'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {escalation.customer
                              ? `${escalation.customer.firstName} ${escalation.customer.lastName}`
                              : 'Anonymous Customer'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {escalation.reason || 'No reason provided'} &middot; {timeAgo(escalation.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={priorityColors[escalation.priority]}>
                          {escalation.priority}
                        </Badge>
                        <Badge className={statusColors[escalation.status]}>
                          {escalation.status}
                        </Badge>
                        {escalation.assignedTo && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                            {escalation.assignedTo.firstName}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {escalation.status === 'OPEN' && (
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation()
                            assignMutation.mutate(escalation.id)
                          }}
                          disabled={assignMutation.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Assign to me
                        </Button>
                      </div>
                    )}
                    {escalation.status === 'ASSIGNED' && escalation.assignedToId === user?.id && (
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50 dark:border-green-700 dark:hover:bg-green-900/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveMutation.mutate(escalation.id)
                          }}
                          disabled={resolveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                    <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {messagesLoading ? (
                        <div className="flex justify-center py-4">
                          <Spinner />
                        </div>
                      ) : !messages?.length ? (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                          No messages in this conversation
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                                }`}
                              >
                                {formatDate(msg.createdAt, 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
