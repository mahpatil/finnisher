'use client'

import useSWR from 'swr'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { LayoutShell } from '../../components/LayoutShell'
import { SessionCard, type SessionData } from '../../components/SessionCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function SessionsPage() {
  const { data: sessions } = useSWR<SessionData[]>(
    '/api/sessions',
    fetcher,
    { refreshInterval: 5000 }
  )

  return (
    <LayoutShell>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Sessions</Typography>
        <Typography variant="body1" color="text.secondary">
          All agent work sessions across threads.
        </Typography>
      </Box>
      {!sessions || sessions.length === 0 ? (
        <Typography data-testid="empty-sessions" variant="body2" color="text.secondary">
          No sessions yet.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </Box>
      )}
    </LayoutShell>
  )
}
