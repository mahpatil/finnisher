'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { NextActionEdit } from './NextActionEdit'

export interface ThreadData {
  id: string
  title: string
  state: string
  nextAction: string
  owner: string
  stalled: boolean
  updatedAt: string
  completedAt: string | null
}

interface Props {
  thread: ThreadData
  showActions?: boolean
  onMarkDone?: (id: string) => void
  onSetWaiting?: (id: string) => void
  onUpdateNextAction?: (id: string, nextAction: string) => void
}

export function ThreadCard({ thread, showActions = true, onMarkDone, onSetWaiting, onUpdateNextAction }: Props) {
  return (
    <Card data-testid="thread-card" variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography variant="subtitle1" fontWeight={600}>
                {thread.title}
              </Typography>
              {thread.stalled && (
                <Box
                  data-testid="stalled-warning"
                  display="flex"
                  alignItems="center"
                  gap={0.25}
                  sx={{ color: '#dc2626', fontSize: '12px' }}
                >
                  <WarningAmberIcon sx={{ fontSize: '14px' }} />
                  <span>Stalled</span>
                </Box>
              )}
            </Box>
            <Box mb={0.5}>
              {onUpdateNextAction ? (
                <NextActionEdit
                  threadId={thread.id}
                  value={thread.nextAction}
                  onSave={v => onUpdateNextAction(thread.id, v)}
                />
              ) : (
                <Typography variant="body2" data-testid="next-action-text" sx={{ color: '#555' }}>
                  → {thread.nextAction}
                </Typography>
              )}
            </Box>
            <Chip label={thread.owner} size="small" variant="outlined" sx={{ fontSize: '11px' }} />
          </Box>
          {showActions && (
            <Box display="flex" gap={0.5} ml={1}>
              {onMarkDone && (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => onMarkDone(thread.id)}
                >
                  Mark Done
                </Button>
              )}
              {onSetWaiting && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onSetWaiting(thread.id)}
                >
                  Set Waiting
                </Button>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
