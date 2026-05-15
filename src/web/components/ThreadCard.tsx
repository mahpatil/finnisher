'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/Progress'
import WarningIcon from '@mui/icons-material/Warning'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { alpha } from '@mui/material/styles'
import { NextActionEdit } from './NextActionEdit'

export interface ThreadData {
  id: string
  title: string
  state: string
  nextAction: string
  owner: string
  momentum: number
  stalled: boolean
  updatedAt: string
  completedAt: string | null
  lastVelocity?: number
}

interface Props {
  thread: ThreadData
  showActions?: boolean
  onMarkDone?: (id: string) => void
  onSetWaiting?: (id: string) => void
  onUpdateNextAction?: (id: string, nextAction: string) => void
  onClick?: () => void
}

export function ThreadCard({ thread, showActions = true, onMarkDone, onSetWaiting, onUpdateNextAction, onClick }: Props) {
  const isStalled = thread.stalled && thread.state !== 'done'
  
  return (
    <Card 
      data-testid="thread-card" 
      onClick={onClick}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          bgcolor: alpha('#00e471', 0.02),
          borderColor: alpha('#00e471', 0.3),
        } : {},
        ...(isStalled && {
          border: '1px solid',
          borderColor: alpha('#ffb4ab', 0.3),
          boxShadow: `0 0 15px ${alpha('#ffb4ab', 0.1)}`,
        })
      }}
    >
      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: isStalled ? 'error.main' : 'text.primary',
                lineHeight: 1.2,
                mb: 0.5,
                fontWeight: 700
              }}
            >
              {thread.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Last Session: 4m ago
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: '"JetBrains Mono", monospace', 
              fontWeight: 700, 
              color: isStalled ? 'error.main' : 'primary.main' 
            }}
          >
            {thread.momentum}%
          </Typography>
        </Box>

        {/* Momentum Meter */}
        <Box sx={{ width: '100%', mb: 3 }}>
          <Box sx={{ 
            height: 4, 
            width: '100%', 
            bgcolor: alpha('#333', 0.5), 
            borderRadius: 1, 
            overflow: 'hidden',
            display: 'flex',
            gap: '2px'
          }}>
             <Box sx={{ 
               width: `${thread.momentum}%`, 
               height: '100%', 
               bgcolor: isStalled ? 'error.main' : 'primary.main',
               transition: 'width 0.5s ease-in-out'
             }} />
          </Box>
        </Box>

        <Box sx={{ mb: 2, flexGrow: 1 }}>
          {onUpdateNextAction ? (
            <NextActionEdit
              threadId={thread.id}
              value={thread.nextAction}
              onSave={v => onUpdateNextAction(thread.id, v)}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              → {thread.nextAction}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
              AGENT: CLAUDE
            </Typography>
          </Box>
          
          {thread.state === 'done' ? (
            <Chip 
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
              label="DONE" 
              size="small" 
              color="primary"
              variant="outlined"
              sx={{ fontSize: '10px', fontWeight: 700 }}
            />
          ) : isStalled ? (
            <Chip 
              icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
              label="INTERRUPTED" 
              size="small" 
              color="error"
              sx={{ fontSize: '10px', fontWeight: 700 }}
            />
          ) : (
            <Chip 
              label="ACTIVE" 
              size="small" 
              sx={{ 
                fontSize: '10px', 
                fontWeight: 700, 
                bgcolor: alpha('#00e471', 0.1), 
                color: 'primary.main',
                border: '1px solid',
                borderColor: alpha('#00e471', 0.2)
              }}
            />
          )}
        </Box>

        {showActions && thread.state !== 'done' && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              fullWidth
              size="small"
              variant="text"
              sx={{ color: 'primary.main', fontSize: '0.625rem' }}
              onClick={() => onMarkDone?.(thread.id)}
            >
              FINISH
            </Button>
            <Button
              fullWidth
              size="small"
              variant="text"
              sx={{ color: 'text.secondary', fontSize: '0.625rem' }}
              onClick={() => onSetWaiting?.(thread.id)}
            >
              PARK
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
