'use client'

import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import EditIcon from '@mui/icons-material/Edit'
import Typography from '@mui/material/Typography'

interface Props {
  threadId: string
  value: string
  onSave: (newValue: string) => void
}

export function NextActionEdit({ threadId: _threadId, value, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function save() {
    if (draft.trim() && draft !== value) onSave(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <TextField
        slotProps={{ htmlInput: { 'data-testid': 'next-action-input' } }}
        size="small"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
        fullWidth
      />
    )
  }

  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <Typography variant="body2" data-testid="next-action-text" sx={{ color: '#555' }}>
        → {value}
      </Typography>
      <IconButton
        size="small"
        aria-label="Edit Next Action"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        <EditIcon fontSize="inherit" />
      </IconButton>
    </Box>
  )
}
