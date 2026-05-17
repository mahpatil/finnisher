'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import InfoIcon from '@mui/icons-material/Info'
import { alpha } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import { ThreadCard, type ThreadData } from './ThreadCard'
import { FocusWarningBanner } from './FocusWarningBanner'
import { SessionCard, type SessionData } from './SessionCard'
import { ThreadForm } from './ThreadForm'
import { LayoutShell } from './LayoutShell'
import { ThreadDetail } from './ThreadDetail'
import { InsightsView } from './InsightsView'

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
  const [tab, setTab] = useState('dashboard')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
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
  const selectedThread = allThreads.find(t => t.id === selectedThreadId)
  const threadSessions = sessions?.filter(s => s.threadId === selectedThreadId) ?? []

  const handleThreadClick = (id: string) => {
    setSelectedThreadId(id)
    setTab('thread-detail')
  }

  const handleBack = () => {
    setSelectedThreadId(null)
    setTab('dashboard')
  }

  const focusWarning = tRes?.focusWarning ?? null

  const activeThreads = [...allThreads.filter(t => t.state === 'active')]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const waitingThreads = allThreads.filter(t => t.state === 'waiting' || t.state === 'blocked')
  const stalledThreads = allThreads.filter(t => t.stalled && t.state !== 'done')
  const doneThreads = [...allThreads.filter(t => t.state === 'done')]
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())
    .slice(0, 30)

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
    <LayoutShell currentTab={tab} onTabChange={setTab}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Momentum Engine</Typography>
        <Typography variant="body1" color="text.secondary">
          Unified execution orchestration. Tracking parallel workflows and agent performance.
        </Typography>
      </Box>

      {tab === 'dashboard' && (
        <Grid container spacing={3}>
          {/* Row 1: Velocity and Stalled Alerts */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ 
              height: 300, 
              bgcolor: alpha('#1A1A1A', 0.4), 
              border: '0.5px solid', 
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="overline" color="text.primary">Velocity History (7D)</Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'end', gap: 1, mt: 2 }}>
                 {[40, 65, 45, 85, 55, 70, 95].map((h, i) => (
                   <Box key={i} sx={{ 
                     flexGrow: 1, 
                     height: `${h}%`, 
                     bgcolor: i === 6 ? 'primary.main' : alpha('#00e471', 0.1),
                     borderTop: i === 6 ? 'none' : '1px solid',
                     borderColor: alpha('#00e471', 0.4)
                   }} />
                 ))}
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ 
              height: 300, 
              bgcolor: alpha('#1A1A1A', 0.4), 
              border: '0.5px solid', 
              borderColor: alpha('#ffb4ab', 0.2),
              borderLeft: '4px solid',
              borderLeftColor: 'error.main',
              borderRadius: 2,
              p: 3
            }}>
               <Typography variant="overline" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <InfoIcon sx={{ fontSize: 16 }} /> Stalled Threads ({stalledThreads.length})
               </Typography>
               <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                 {stalledThreads.slice(0, 2).map(t => (
                   <Box key={t.id} onClick={() => handleThreadClick(t.id)} sx={{ p: 1.5, bgcolor: alpha('#000', 0.2), borderRadius: 1, border: '1px solid', borderColor: 'divider', cursor: 'pointer' }}>
                     <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.title}</Typography>
                     <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>Stalled 24h+</Typography>
                   </Box>
               ))}
               {stalledThreads.length === 0 && (
                 <Typography variant="body2" color="text.secondary">No stalled threads. Good momentum!</Typography>
               )}
             </Box>
            </Box>
          </Grid>

          {/* Row 2: Active Threads */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Active Threads</Typography>
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
              {activeThreads.map(t => (
                <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <ThreadCard
                    thread={t}
                    onMarkDone={markDone}
                    onSetWaiting={setWaiting}
                    onUpdateNextAction={updateNextAction}
                    onClick={() => handleThreadClick(t.id)}
                  />
                </Grid>
              ))}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                 <Box 
                  onClick={() => setAddOpen(true)}
                  sx={{ 
                    height: '100%', 
                    minHeight: 160,
                    border: '2px dashed', 
                    borderColor: 'divider', 
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main' }
                  }}
                 >
                   <AddIcon sx={{ fontSize: 32, mb: 1 }} />
                   <Typography variant="overline">Initiate New Thread</Typography>
                 </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}

      {tab === 'threads' && (
        <Grid container spacing={3}>
           {allThreads.map(t => (
             <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
               <ThreadCard 
                thread={t} 
                showActions={t.state !== 'done'} 
                onClick={() => handleThreadClick(t.id)}
               />
             </Grid>
           ))}
        </Grid>
      )}

      {tab === 'thread-detail' && selectedThread && (
        <ThreadDetail 
          thread={selectedThread} 
          sessions={threadSessions} 
          onBack={handleBack} 
        />
      )}

      {tab === 'insights' && (
        <InsightsView sessions={sessions ?? []} />
      )}

      {tab === 'optimization' && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">Agent Optimization coming soon.</Typography>
        </Box>
      )}

      <ThreadForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => void mutateThreads()}
      />
    </LayoutShell>
  )
}
