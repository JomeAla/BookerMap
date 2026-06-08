'use client'

import * as React from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { X, Plus } from 'lucide-react'

interface Props {
  userId: string
  skills: string[]
}

export function SkillsEditor({ userId, skills: initial }: Props) {
  const { addToast } = useToast()
  const [currentSkills, setCurrentSkills] = React.useState<string[]>(initial)
  const [skillsInput, setSkillsInput] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [allSkills, setAllSkills] = React.useState<string[]>([])

  React.useEffect(() => {
    setCurrentSkills(initial)
  }, [initial])

  React.useEffect(() => {
    api.get('/services/skills').then(({ data }) => {
      setAllSkills(data.data as string[])
    }).catch(() => {})
  }, [])

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !currentSkills.includes(trimmed)) {
      setCurrentSkills([...currentSkills, trimmed])
    }
    setSkillsInput('')
  }

  const removeSkill = (skill: string) => {
    setCurrentSkills(currentSkills.filter((s) => s !== skill))
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/users/${userId}/skills`, { skills: currentSkills })
      addToast('Skills updated', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to update skills', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {currentSkills.length === 0 ? (
          <p className="text-sm text-gray-400">No skills assigned</p>
        ) : (
          currentSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm"
            >
              {skill}
              <button onClick={() => removeSkill(skill)} className="hover:text-red-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Type a skill..."
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSkill(skillsInput)
              }
            }}
            list="skill-suggestions"
          />
          <datalist id="skill-suggestions">
            {allSkills
              .filter((s) => !currentSkills.includes(s))
              .map((s) => (
                <option key={s} value={s} />
              ))}
          </datalist>
        </div>
        <Button onClick={() => addSkill(skillsInput)} disabled={!skillsInput.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Skills'}
        </Button>
      </div>
    </div>
  )
}
