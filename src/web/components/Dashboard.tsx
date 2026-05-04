'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { ThreadCard, type ThreadData } from './ThreadCard'
import { FocusWarningBanner } from './FocusWarningBanner'
import { SessionCard, type SessionData } from './SessionCard'
import { ThreadForm } from './ThreadForm'

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

export default function Dashboard() {
  const [tab, setTab] = useState(0)
  const [addOpen, setAddOpen] = useState(false)

  const { data: tRes, mutate: mutateThreads } = useSWR<ThreadsResponse>(
    '/api/threads',
    fetcher,
    { refreshInterval: 5000 }
  )
  const { data: sessions } = useSWR<SessionData[]>(
    '/api/sessions',
    fetcher,
    { refreshInterval: 5000 }
  )

  const allThreads: ThreadData[] = tRes?.threads ?? []
  const focusWarning = tRes?.focusWarning ?? null

  const activeThreads = allThreads.filter(t => t.state === 'active')
  const waitingThreads = allThreads.filter(t => t.state === 'waiting' || t.state === 'blocked')
  const stalledThreads = allThreads.filter(t => t.stalled && t.state !== 'done')
  const doneThreads = [...allThreads.filter(t => t.state === 'done')]
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())
    .slice(0, 30)

  const activeCount = activeThreads.length

  async function markDone(id: string) {
    await patchThread(id, { state: 'done' })
    await mutateThreads()
  }

  async function setWaiting(id: string) {
    await patchThread(id, { state: 'waiting' })
    await mutateThreads()
  }

  async function updateNextAction(id: string, nextAction: string) {
    await patchThread(id, { nextAction })
    await mutateThreads()
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box display="flex" mb={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={700}>Finnisher</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add Thread
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Active (${activeCount}/5)`} />
        <Tab label={`Waiting (${waitingThreads.length})`} />
        <Tab label={`Stalled (${stalledThreads.length})`} />
        <Tab label={`Done (${doneThreads.length})`} />
        <Tab label={`Sessions (${sessions?.length ?? 0})`} />
      </Tabs>

      {tab === 0 && (
        <Box>
          {focusWarning && (
            <FocusWarningBanner
              warning={focusWarning}
              onMarkDone={markDone}
              onSetWaiting={setWaiting}
            />
          )}
          {activeThreads.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No active threads. Add one to get started.
            </Typography>
          ) : (
            [...activeThreads]
              .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
              .map(t => (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  onMarkDone={markDone}
                  onSetWaiting={setWaiting}
                  onUpdateNextAction={updateNextAction}
                />
              ))
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          {waitingThreads.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No waiting threads.</Typography>
          ) : (
            waitingThreads.map(t => (
              <ThreadCard key={t.id} thread={t} showActions={false} />
            ))
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box>
          {stalledThreads.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No stalled threads. Good momentum!
            </Typography>
          ) : (
            stalledThreads.map(t => (
              <ThreadCard
                key={t.id}
                thread={t}
                onMarkDone={markDone}
                onSetWaiting={setWaiting}
              />
            ))
          )}
        </Box>
      )}

      {tab === 3 && (
        <Box>
          {doneThreads.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No completed threads yet.</Typography>
          ) : (
            doneThreads.map(t => (
              <ThreadCard key={t.id} thread={t} showActions={false} />
            ))
          )}
        </Box>
      )}

      {tab === 4 && (
        <Box>
          {!sessions || sessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No sessions yet.</Typography>
          ) : (
            sessions.map(s => <SessionCard key={s.id} session={s} />)
          )}
        </Box>
      )}

      <ThreadForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => void mutateThreads()}
      />
    </Container>
  )
}
