'use client'

import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function ThreadForm({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [owner, setOwner] = useState('you')
  const [state, setState] = useState('active')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!title.trim() || !nextAction.trim()) {
      setError('Title and next action are required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), nextAction: nextAction.trim(), owner, state }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Failed to create thread')
      } else {
        setTitle(''); setNextAction(''); setOwner('you'); setState('active'); setError(null)
        onCreated()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Thread</DialogTitle>
      <DialogContent>
        <TextField
          label="Title"
          fullWidth
          margin="normal"
          value={title}
          onChange={e => setTitle(e.target.value)}
          inputProps={{ 'data-testid': 'thread-title-input' }}
        />
        <TextField
          label="Next Action"
          fullWidth
          margin="normal"
          value={nextAction}
          onChange={e => setNextAction(e.target.value)}
          inputProps={{ 'data-testid': 'thread-next-action-input' }}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Owner</InputLabel>
          <Select value={owner} label="Owner" onChange={e => setOwner(e.target.value)}>
            <MenuItem value="you">You</MenuItem>
            <MenuItem value="ai_agent">AI Agent</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>State</InputLabel>
          <Select value={state} label="State" onChange={e => setState(e.target.value)}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="waiting">Waiting</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
          </Select>
        </FormControl>
        {error && (
          <Typography variant="body2" color="error" mt={1} data-testid="thread-form-error">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? 'Adding...' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
