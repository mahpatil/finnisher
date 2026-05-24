'use client'

import useSWR from 'swr'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { LayoutShell } from '../../components/LayoutShell'
import { InsightsView } from '../../components/InsightsView'
import type { SessionData } from '../../components/SessionCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function InsightsPage() {
  const { data: sessions } = useSWR<SessionData[]>(
    '/api/sessions',
    fetcher,
    { refreshInterval: 5000 }
  )

  return (
    <LayoutShell>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Execution Insights</Typography>
        <Typography variant="body1" color="text.secondary">
          Deep analytics across agent sessions, cost, and performance.
        </Typography>
      </Box>
      <InsightsView sessions={sessions ?? []} />
    </LayoutShell>
  )
}
