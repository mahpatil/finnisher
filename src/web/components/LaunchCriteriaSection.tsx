'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'

interface LaunchCriterion {
  id: string
  threadId: string
  text: string
  checked: boolean
  position: number
  createdAt: number
  checkedAt: number | null
}

interface Props {
  threadId: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function LaunchCriteriaSection({ threadId }: Props) {
  const { data, mutate } = useSWR<LaunchCriterion[]>(
    `/api/threads/${threadId}/launch-criteria`,
    fetcher,
  )

  const criteria = data ?? []

  const handleToggle = useCallback(async (c: LaunchCriterion) => {
    await fetch(`/api/threads/${threadId}/launch-criteria/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !c.checked }),
      keepalive: true,
    })
    await mutate()
  }, [threadId, mutate])

  if (criteria.length === 0) return null

  return (
    <Box data-testid="launch-gate-section">
      <Typography variant="h6" sx={{ mb: 2 }}>Launch Gate</Typography>
      {criteria.map(c => (
        <Box
          key={c.id}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
        >
          <Checkbox
            checked={c.checked}
            onChange={() => handleToggle(c)}
            size="small"
          />
          <Typography
            variant="body2"
            sx={{
              flexGrow: 1,
              textDecoration: c.checked ? 'line-through' : 'none',
              color: c.checked ? 'text.secondary' : 'text.primary',
            }}
          >
            {c.text}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
