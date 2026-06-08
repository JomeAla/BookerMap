'use client'

import * as React from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { X, Plus, Clock } from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)

type TimeBlock = { start: string; end: string }
type Availability = Record<string, TimeBlock[]>

interface Props {
  userId: string
  availability: Availability
}

export function AvailabilityEditor({ userId, availability: initial }: Props) {
  const { addToast } = useToast()
  const [availability, setAvailability] = React.useState<Availability>(initial)
  const [saving, setSaving] = React.useState(false)
  const [dragging, setDragging] = React.useState<{ day: string; startHour: number } | null>(null)

  const newBlockForm = React.useRef<{ [day: string]: { start: string; end: string } }>({})

  React.useEffect(() => {
    setAvailability(initial)
  }, [initial])

  const getBlockForm = (day: string) => {
    if (!newBlockForm.current[day]) {
      newBlockForm.current[day] = { start: '08:00', end: '17:00' }
    }
    return newBlockForm.current[day]
  }

  const setBlockForm = (day: string, key: 'start' | 'end', value: string) => {
    if (!newBlockForm.current[day]) {
      newBlockForm.current[day] = { start: '08:00', end: '17:00' }
    }
    newBlockForm.current[day][key] = value
  }

  const isHourSelected = (day: string, hour: number): boolean => {
    const blocks = availability[day] || []
    const time = `${hour.toString().padStart(2, '0')}:00`
    return blocks.some((b) => time >= b.start && time < b.end)
  }

  const toggleHour = (day: string, hour: number) => {
    setAvailability((prev) => {
      const blocks = [...(prev[day] || [])]
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      const nextHourStr = `${(hour + 1).toString().padStart(2, '0')}:00`

      const existingIdx = blocks.findIndex((b) => timeStr >= b.start && timeStr < b.end)

      if (existingIdx !== -1) {
        const existing = blocks[existingIdx]
        if (existing.start === timeStr && existing.end === nextHourStr) {
          blocks.splice(existingIdx, 1)
        } else if (existing.start === timeStr) {
          blocks[existingIdx] = { start: nextHourStr, end: existing.end }
        } else if (existing.end === nextHourStr) {
          blocks[existingIdx] = { start: existing.start, end: timeStr }
        } else {
          blocks[existingIdx] = { start: existing.start, end: timeStr }
          blocks.push({ start: nextHourStr, end: existing.end })
        }
      } else {
        const prevIdx = blocks.findIndex((b) => b.end === timeStr)
        const nextIdx = blocks.findIndex((b) => b.start === nextHourStr)

        if (prevIdx !== -1 && nextIdx !== -1) {
          blocks[prevIdx] = { start: blocks[prevIdx].start, end: blocks[nextIdx].end }
          blocks.splice(nextIdx, 1)
        } else if (prevIdx !== -1) {
          blocks[prevIdx] = { start: blocks[prevIdx].start, end: nextHourStr }
        } else if (nextIdx !== -1) {
          blocks[nextIdx] = { start: timeStr, end: blocks[nextIdx].end }
        } else {
          blocks.push({ start: timeStr, end: nextHourStr })
        }
      }

      return { ...prev, [day]: blocks }
    })
  }

  const handleMouseDown = (day: string, hour: number) => {
    setDragging({ day, startHour: hour })
  }

  const handleMouseEnter = (day: string, hour: number) => {
    if (!dragging) return
    if (dragging.day !== day) return

    const minH = Math.min(dragging.startHour, hour)
    const maxH = Math.max(dragging.startHour, hour)
    setAvailability((prev) => {
      const existing = prev[day] || []
      const filtered = existing.filter(
        (b) => !(Number(b.start.split(':')[0]) >= minH && Number(b.end.split(':')[0]) <= maxH + 1)
      )
      return {
        ...prev,
        [day]: [
          ...filtered,
          {
            start: `${minH.toString().padStart(2, '0')}:00`,
            end: `${(maxH + 1).toString().padStart(2, '0')}:00`,
          },
        ],
      }
    })
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  const addTimeBlock = (day: string) => {
    const form = getBlockForm(day)
    if (!form.start || !form.end) return
    setAvailability((prev) => {
      const blocks = [...(prev[day] || []), { start: form.start, end: form.end }]
      return { ...prev, [day]: blocks }
    })
    newBlockForm.current[day] = { start: '08:00', end: '17:00' }
  }

  const removeTimeBlock = (day: string, index: number) => {
    setAvailability((prev) => {
      const blocks = [...(prev[day] || [])]
      blocks.splice(index, 1)
      return { ...prev, [day]: blocks }
    })
  }

  const applyPreset = (preset: '9to5' | '247' | 'clear') => {
    if (preset === 'clear') {
      setAvailability({})
      return
    }
    const newAvail: Availability = {}
    const daysToFill = preset === '247' ? DAYS : DAYS.slice(0, 5)
    const block: TimeBlock = preset === '247' ? { start: '00:00', end: '23:59' } : { start: '09:00', end: '17:00' }
    for (const day of daysToFill) {
      newAvail[day] = [block]
    }
    setAvailability(newAvail)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/users/${userId}/availability`, { availability })
      addToast('Availability saved', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save availability', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4" onMouseUp={handleMouseUp}>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => applyPreset('9to5')}>
          <Clock className="h-3.5 w-3.5 mr-1" /> 9-5 Weekdays
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyPreset('247')}>
          24/7
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyPreset('clear')}>
          Clear All
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Availability'}
        </Button>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] text-xs">
          <div className="p-2 font-medium text-gray-500 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />
          {DAYS.map((day, i) => (
            <div
              key={day}
              className="p-2 font-medium text-center text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-b border-l border-gray-200 dark:border-gray-700"
            >
              {DAY_LABELS[i]}
            </div>
          ))}
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="p-1 text-right pr-3 text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-end">
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
              {DAYS.map((day) => (
                <div
                  key={`${day}-${hour}`}
                  className={`h-7 border-b border-l border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                    isHourSelected(day, hour)
                      ? 'bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onMouseDown={() => handleMouseDown(day, hour)}
                  onMouseEnter={() => handleMouseEnter(day, hour)}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {DAYS.map((day) => (
          <div key={day} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-300 mb-2">
              {day}
            </h4>
            <div className="space-y-1.5 mb-3">
              {(availability[day] || []).map((block, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded text-xs"
                >
                  {block.start} - {block.end}
                  <button
                    onClick={() => removeTimeBlock(day, idx)}
                    className="hover:text-red-600 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {(availability[day] || []).length === 0 && (
                <p className="text-xs text-gray-400 italic">Unavailable</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="time"
                className="h-7 w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 text-xs"
                value={getBlockForm(day).start}
                onChange={(e) => setBlockForm(day, 'start', e.target.value)}
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="time"
                className="h-7 w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 text-xs"
                value={getBlockForm(day).end}
                onChange={(e) => setBlockForm(day, 'end', e.target.value)}
              />
              <button
                onClick={() => addTimeBlock(day)}
                className="h-7 w-7 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
