'use client'

import { useState } from 'react'

export function HoneypotField({
  field = 'website_url',
  onValue,
}: {
  field?: string
  onValue?: (value: string) => void
}) {
  const [value, setValue] = useState('')
  return (
    <div
      aria-hidden="true"
      className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
    >
      <label htmlFor={field}>Website</label>
      <input
        id={field}
        name={field}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          onValue?.(e.target.value)
        }}
      />
    </div>
  )
}