'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Sparkles, MessageSquare, FileText, Plus, Trash2 } from 'lucide-react'
import type { AiResponse } from '@/types'

export default function AISettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [newTrigger, setNewTrigger] = React.useState('')
  const [newResponse, setNewResponse] = React.useState('')

  const { data: responses, isLoading } = useQuery({
    queryKey: ['ai-responses'],
    queryFn: async () => {
      const { data } = await api.get('/ai-responses')
      return data.data as AiResponse[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { trigger: string; response: string }) => {
      const { data } = await api.post('/ai-responses', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-responses'] })
      setNewTrigger(''); setNewResponse('')
      addToast('Response template created', 'success')
    },
    onError: () => addToast('Failed to create template', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai-responses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-responses'] })
      addToast('Template deleted', 'success')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agent</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your AI assistant responses and behavior</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">AI Agent Settings</CardTitle>
          </div>
          <CardDescription>Control how the AI agent interacts with your customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <Select
            label="AI Language"
            options={[
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'French' },
              { value: 'pt', label: 'Portuguese' },
              { value: 'ar', label: 'Arabic' },
              { value: 'sw', label: 'Swahili' },
            ]}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Style</label>
            <div className="flex gap-4">
              {['Professional', 'Friendly', 'Casual'].map((style) => (
                <label key={style} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="style" defaultChecked={style === 'Friendly'} className="text-blue-600" />
                  {style}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Response Templates</CardTitle>
          </div>
          <CardDescription>Pre-defined responses the AI uses for common queries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Trigger keyword (e.g., pricing)"
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Response text"
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              className="flex-[2]"
            />
            <Button size="sm" onClick={() => createMutation.mutate({ trigger: newTrigger, response: newResponse })} disabled={!newTrigger || !newResponse}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : !responses?.length ? (
            <p className="text-sm text-gray-500 text-center py-4">No response templates yet</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {responses.map((r) => (
                <div key={r.id} className="flex items-start justify-between py-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">{r.trigger}</Badge>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{r.response}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
