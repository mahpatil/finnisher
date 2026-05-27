'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import { alpha } from '@mui/material/styles'
import BoltIcon from '@mui/icons-material/Bolt'
import WarningIcon from '@mui/icons-material/Warning'
import { ThreadData } from './ThreadCard'
import { SessionCard, SessionData } from './SessionCard'
import { TodoSection } from './TodoSection'
import { LaunchCriteriaSection } from './LaunchCriteriaSection'

const PRIORITIES = ['now', 'next', 'later', 'out'] as const
const PRIORITY_LABELS: Record<string, string> = { now: 'NOW', next: 'NEXT', later: 'LATER', out: 'OUT' }

interface Props {
  thread: ThreadData
  sessions: SessionData[]
  onBack: () => void
  onUpdatePriority?: (id: string, priority: string) => void
}

export function ThreadDetail({ thread, sessions, onBack, onUpdatePriority }: Props) {
  const totalCost = sessions.reduce((acc, s) => acc + (s.costUsd ?? 0), 0)
  const totalTokens = sessions.reduce((acc, s) => acc + (s.tokensIn ?? 0) + (s.tokensOut ?? 0), 0)

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button data-testid="back-button" onClick={onBack} size="small" variant="text" sx={{ color: 'text.secondary' }}>
          ← Back to Engine
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 9 }}>
          {/* Header Summary */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 3, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Typography variant="overline" color="text.secondary">Thread Progress</Typography>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'end', justifyContent: 'space-between' }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>{thread.momentum}%</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, height: 24, alignItems: 'end' }}>
                     {[100, 80, 90, 60].map((h, i) => (
                       <Box key={i} sx={{ width: 4, height: `${h}%`, bgcolor: i < 3 ? 'primary.main' : alpha('#fff', 0.1) }} />
                     ))}
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 3, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Typography variant="overline" color="text.secondary">Total Agent Cost</Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>${totalCost.toFixed(4)}</Typography>
                  <Typography variant="caption" color="text.secondary">{(totalTokens / 1000000).toFixed(1)}M Tokens Consumed</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 3, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider', borderLeft: '3px solid', borderLeftColor: 'secondary.main', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Typography variant="overline" color="secondary.main">Push to 100%</Typography>
                <Button 
                  fullWidth 
                  variant="contained" 
                  color="primary" 
                  startIcon={<BoltIcon />}
                  sx={{ mt: 1, py: 1.5 }}
                >
                  Execute final hardening
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Session Timeline */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Session Timeline</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
               {sessions.map(s => <SessionCard key={s.id} session={s} />)}
               {sessions.length === 0 && (
                 <Typography variant="body2" color="text.secondary">No sessions recorded for this thread.</Typography>
               )}
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* System Blockers */}
            <Box sx={{ p: 3, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider', borderTop: '4px solid', borderTopColor: 'secondary.main' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <WarningIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
                <Typography variant="overline" sx={{ fontWeight: 700 }}>System Blockers</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: alpha('#000', 0.3), borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                   <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 800 }}>CRITICAL</Typography>
                   <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>Legacy Token Handler</Typography>
                   <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                     The 2018 auth-shim module is preventing native JWT implementation.
                   </Typography>
                   <Button size="small" variant="outlined" sx={{ mt: 2, fontSize: '0.625rem' }}>DELEGATE TO AGENT</Button>
                </Box>
              </Box>
            </Box>

            {/* Priority */}
            <Box sx={{ p: 3, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Priority</Typography>
              {onUpdatePriority ? (
                <FormControl fullWidth size="small">
                  <InputLabel id="priority-label" sx={{ fontSize: '0.75rem' }}>Priority</InputLabel>
                  <Select
                    labelId="priority-label"
                    data-testid="priority-select"
                    value={thread.priority}
                    label="Priority"
                    onChange={e => onUpdatePriority(thread.id, e.target.value)}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {PRIORITIES.map(p => (
                      <MenuItem key={p} value={p} sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {PRIORITY_LABELS[p]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  {PRIORITY_LABELS[thread.priority] ?? thread.priority}
                </Typography>
              )}
            </Box>

            {/* Todos */}
            <Box sx={{ p: 3, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider' }}>
              <TodoSection threadId={thread.id} />
            </Box>

            {/* Launch Gate */}
            <Box sx={{ p: 3, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider' }}>
              <LaunchCriteriaSection threadId={thread.id} />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
