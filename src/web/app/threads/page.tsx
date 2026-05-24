'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import { ThreadCard, type ThreadData } from '../../components/ThreadCard'
import { FocusWarningBanner } from '../../components/FocusWarningBanner'
import { SessionCard, type SessionData } from '../../components/SessionCard'
import { ThreadForm } from '../../components/ThreadForm'
import { LayoutShell } from '../../components/LayoutShell'
import { ThreadDetail } from '../../components/ThreadDetail'

interface ThreadsResponse {
  threads: ThreadData[]
  focusWarning: {
    level: 'caution' | 'urgent'
    count: number
    message: string
    suggestions: ThreadData[]
  } | null
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

async function patchThread(id: string, patch: Record<string, unknown>) {
  await fetch(`/api/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

const STATE_FILTERS = ['All', 'new', 'open', 'waiting', 'blocked', 'closed', 'archived'] as const
const PRIORITY_FILTERS = ['All', 'now', 'next', 'later', 'out'] as const
const PRIORITY_LABELS: Record<string, string> = { now: 'NOW', next: 'NEXT', later: 'LATER', out: 'OUT' }

export default function ThreadsPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [stateFilter, setStateFilter] = useState<string>('All')
  const [priorityFilter, setPriorityFilter] = useState<string>('All')

  const { data: tRes, mutate: mutateThreads } = useSWR<ThreadsResponse>(
    '/api/threads',
    fetcher,
    { refreshInterval: 5000 }
  )

  const archivedKey = stateFilter === 'archived' ? '/api/threads?state=archived' : null
  const { data: archivedRes, mutate: mutateArchived } = useSWR<ThreadsResponse>(
    archivedKey,
    fetcher,
    { refreshInterval: 5000 }
  )

  const { data: sessions } = useSWR<SessionData[]>(
    '/api/sessions',
    fetcher,
    { refreshInterval: 5000 }
  )

  const allThreads: ThreadData[] = tRes?.threads ?? []
  const selectedThread = allThreads.find(t => t.id === selectedThreadId)
  const threadSessions = sessions?.filter(s => s.threadId === selectedThreadId) ?? []

  const focusWarning = tRes?.focusWarning ?? null

  const threadsSource: ThreadData[] = stateFilter === 'archived'
    ? (archivedRes?.threads ?? [])
    : allThreads

  const filteredThreads = threadsSource.filter(t => {
    if (stateFilter !== 'All' && stateFilter !== 'archived' && t.state !== stateFilter) return false
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false
    return true
  })

  async function mutateAll() {
    await mutateThreads()
    if (archivedKey) await mutateArchived()
  }

  async function markDone(id: string) {
    await patchThread(id, { state: 'closed' })
    await mutateAll()
  }

  async function archiveThread(id: string) {
    await patchThread(id, { state: 'archived' })
    await mutateAll()
  }

  async function unarchiveThread(id: string) {
    await patchThread(id, { state: 'open' })
    await mutateAll()
  }

  if (selectedThreadId && selectedThread) {
    return (
      <LayoutShell>
        <ThreadDetail
          thread={selectedThread}
          sessions={threadSessions}
          onBack={() => setSelectedThreadId(null)}
        />
      </LayoutShell>
    )
  }

  return (
    <LayoutShell>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Threads</Typography>
        <Typography variant="body1" color="text.secondary">
          All execution threads across every state and priority.
        </Typography>
      </Box>

      {focusWarning && <FocusWarningBanner warning={focusWarning} sx={{ mb: 3 }} />}

      {/* State filter chips */}
      <Box
        data-testid="state-filter-bar"
        sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}
      >
        {STATE_FILTERS.map(s => (
          <Chip
            key={s}
            data-testid={`state-chip-${s.toLowerCase()}`}
            label={s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            size="small"
            variant={stateFilter === s ? 'filled' : 'outlined'}
            color={stateFilter === s ? 'primary' : 'default'}
            onClick={() => setStateFilter(s)}
            sx={{ cursor: 'pointer', fontWeight: stateFilter === s ? 700 : 400 }}
          />
        ))}
      </Box>

      {/* Priority filter chips */}
      <Box
        data-testid="priority-filter-bar"
        sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}
      >
        {PRIORITY_FILTERS.map(p => (
          <Chip
            key={p}
            data-testid={`priority-chip-${p.toLowerCase()}`}
            label={p === 'All' ? 'All' : PRIORITY_LABELS[p]}
            size="small"
            variant={priorityFilter === p ? 'filled' : 'outlined'}
            color={priorityFilter === p ? 'primary' : 'default'}
            onClick={() => setPriorityFilter(p)}
            sx={{ cursor: 'pointer', fontWeight: priorityFilter === p ? 700 : 400 }}
          />
        ))}
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          size="small"
        >
          New Thread
        </Button>
      </Box>

      <Grid container spacing={3}>
        {filteredThreads.map(t => (
          <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <ThreadCard
              thread={t}
              onMarkDone={markDone}
              onArchive={archiveThread}
              onUnarchive={unarchiveThread}
              onClick={() => setSelectedThreadId(t.id)}
            />
          </Grid>
        ))}
        {filteredThreads.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No threads match the selected filters.
            </Typography>
          </Grid>
        )}
      </Grid>

      <ThreadForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => void mutateAll()}
      />
    </LayoutShell>
  )
}
