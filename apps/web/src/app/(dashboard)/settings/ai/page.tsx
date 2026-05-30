'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Sparkles, MessageSquare, Clock, Plus, Trash2, Save } from 'lucide-react'
import type { AiResponse } from '@/types'

type BusinessHours = Record<string, { open: string; close: string } | null>

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

const defaultBusinessHours: BusinessHours = {
  monday: { open: '08:00', close: '17:00' },
  tuesday: { open: '08:00', close: '17:00' },
  wednesday: { open: '08:00', close: '17:00' },
  thursday: { open: '08:00', close: '17:00' },
  friday: { open: '08:00', close: '17:00' },
  saturday: { open: '09:00', close: '14:00' },
  sunday: null,
}

export default function AISettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [newTrigger, setNewTrigger] = React.useState('')
  const [newResponse, setNewResponse] = React.useState('')
  const [language, setLanguage] = React.useState('en')
  const [style, setStyle] = React.useState('Friendly')
  const [businessHours, setBusinessHours] = React.useState<BusinessHours>(defaultBusinessHours)
  const [loaded, setLoaded] = React.useState(false)

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['ai-responses'],
    queryFn: async () => {
      const { data } = await api.get('/ai-responses')
      return data.data as AiResponse[]
    },
  })

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const { data } = await api.get('/ai/settings')
      return data
    },
  })

  React.useEffect(() => {
    if (settingsData && !loaded) {
      setLanguage(settingsData.language || 'en')
      setStyle(settingsData.style || 'Friendly')
      if (settingsData.businessHours) {
        setBusinessHours(settingsData.businessHours)
      }
      setLoaded(true)
    }
  }, [settingsData, loaded])

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put('/ai/settings', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      addToast('Settings saved', 'success')
    },
    onError: () => addToast('Failed to save settings', 'error'),
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

  const handleBusinessHoursToggle = (day: string, closed: boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: closed ? null : { open: '09:00', close: '17:00' },
    }))
  }

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setBusinessHours(prev => {
      const current = prev[day]
      if (!current) return prev
      return { ...prev, [day]: { ...current, [field]: value } }
    })
  }

  const handleSave = () => {
    saveMutation.mutate({
      language,
      style: style.toLowerCase(),
      businessHours,
    })
  }

  const isLoading = settingsLoading || responsesLoading

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
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
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
              {['Professional', 'Friendly', 'Casual'].map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="style" checked={style === s} onChange={() => setStyle(s)} className="text-blue-600" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Business Hours</CardTitle>
          </div>
          <CardDescription>Set your business hours so the AI can inform customers when you're open</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Day</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">Open</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">Close</th>
                  <th className="text-right py-2 pl-4 font-medium text-gray-700 dark:text-gray-300">Closed</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => {
                  const hours = businessHours[day.key]
                  const isClosed = hours === null
                  return (
                    <tr key={day.key} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{day.label}</td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={hours?.open || '09:00'}
                          disabled={isClosed}
                          onChange={(e) => handleTimeChange(day.key, 'open', e.target.value)}
                          className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={hours?.close || '17:00'}
                          disabled={isClosed}
                          onChange={(e) => handleTimeChange(day.key, 'close', e.target.value)}
                          className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isClosed}
                            onChange={(e) => handleBusinessHoursToggle(day.key, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600"
                          />
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
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

          {responsesLoading ? (
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
