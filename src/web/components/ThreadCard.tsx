'use client'

import { useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import WarningIcon from '@mui/icons-material/Warning'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArchiveIcon from '@mui/icons-material/Archive'
import UnarchiveIcon from '@mui/icons-material/Unarchive'
import { alpha } from '@mui/material/styles'
import { NextActionEdit } from './NextActionEdit'

export interface ThreadData {
  id: string
  title: string
  state: string
  priority: string
  nextAction: string
  owner: string
  momentum: number
  stalled: boolean
  updatedAt: string
  completedAt: string | null
  archivedAt: string | null
  lastVelocity?: number
}

interface Props {
  thread: ThreadData
  showActions?: boolean
  onMarkDone?: (id: string) => void
  onSetWaiting?: (id: string) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
  onUpdateNextAction?: (id: string, nextAction: string) => void
  onUpdatePriority?: (id: string, priority: string) => void
  onClick?: () => void
}

const PRIORITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  now:   { label: 'NOW',   color: '#f44336', bg: 'rgba(244,67,54,0.12)' },
  next:  { label: 'NEXT',  color: '#ff9800', bg: 'rgba(255,152,0,0.12)' },
  later: { label: 'LATER', color: '#2196f3', bg: 'rgba(33,150,243,0.12)' },
  out:   { label: 'OUT',   color: '#757575', bg: 'rgba(117,117,117,0.12)' },
}

export function ThreadCard({ thread, showActions = true, onMarkDone, onSetWaiting, onArchive, onUnarchive, onUpdateNextAction, onUpdatePriority, onClick }: Props) {
  const [priorityAnchor, setPriorityAnchor] = useState<HTMLElement | null>(null)
  const isStalled = thread.stalled && thread.state !== 'closed' && thread.state !== 'archived'
  const isArchived = thread.state === 'archived'
  const isClosed = thread.state === 'closed'
  const priority = PRIORITY_STYLES[thread.priority] ?? PRIORITY_STYLES.later

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
        opacity: isArchived ? 0.65 : 1,
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
          <Box sx={{ flexGrow: 1, mr: 1 }}>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
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
            <Chip
              data-testid="priority-badge"
              label={priority.label}
              size="small"
              onClick={onUpdatePriority ? e => { e.stopPropagation(); setPriorityAnchor(e.currentTarget) } : undefined}
              sx={{
                fontSize: '9px',
                fontWeight: 800,
                height: 18,
                bgcolor: priority.bg,
                color: priority.color,
                border: `1px solid ${priority.color}40`,
                letterSpacing: '0.05em',
                cursor: onUpdatePriority ? 'pointer' : 'default',
              }}
            />
            {onUpdatePriority && (
              <Menu
                anchorEl={priorityAnchor}
                open={Boolean(priorityAnchor)}
                onClose={() => setPriorityAnchor(null)}
                onClick={e => e.stopPropagation()}
              >
                {Object.entries(PRIORITY_STYLES).map(([key, s]) => (
                  <MenuItem
                    key={key}
                    data-testid={`priority-option-${key}`}
                    selected={thread.priority === key}
                    onClick={() => { onUpdatePriority(thread.id, key); setPriorityAnchor(null) }}
                    sx={{ fontSize: '0.75rem', fontWeight: 700, color: s.color }}
                  >
                    {s.label}
                  </MenuItem>
                ))}
              </Menu>
            )}
          </Box>
        </Box>

        {/* Momentum Meter */}
        <Box sx={{ width: '100%', mb: 3 }}>
          <Box sx={{
            height: 4,
            width: '100%',
            bgcolor: alpha('#333', 0.5),
            borderRadius: 1,
            overflow: 'hidden',
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

          {isArchived ? (
            <Chip
              label="ARCHIVED"
              size="small"
              sx={{ fontSize: '10px', fontWeight: 700, bgcolor: alpha('#757575', 0.1), color: '#757575' }}
            />
          ) : isClosed ? (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
              label="CLOSED"
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
              label={thread.state.toUpperCase()}
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

        {showActions && !isClosed && !isArchived && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              fullWidth
              size="small"
              variant="text"
              sx={{ color: 'primary.main', fontSize: '0.625rem' }}
              onClick={e => { e.stopPropagation(); onMarkDone?.(thread.id) }}
            >
              FINISH
            </Button>
            <Button
              fullWidth
              size="small"
              variant="text"
              sx={{ color: 'text.secondary', fontSize: '0.625rem' }}
              onClick={e => { e.stopPropagation(); onSetWaiting?.(thread.id) }}
            >
              PARK
            </Button>
            <Button
              data-testid="archive-btn"
              fullWidth
              size="small"
              variant="text"
              startIcon={<ArchiveIcon sx={{ fontSize: '12px !important' }} />}
              sx={{ color: 'text.secondary', fontSize: '0.625rem' }}
              onClick={e => { e.stopPropagation(); onArchive?.(thread.id) }}
            >
              ARCHIVE
            </Button>
          </Box>
        )}

        {showActions && isClosed && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              data-testid="archive-btn"
              fullWidth
              size="small"
              variant="text"
              startIcon={<ArchiveIcon sx={{ fontSize: '12px !important' }} />}
              sx={{ color: 'text.secondary', fontSize: '0.625rem' }}
              onClick={e => { e.stopPropagation(); onArchive?.(thread.id) }}
            >
              ARCHIVE
            </Button>
          </Box>
        )}

        {showActions && isArchived && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              data-testid="unarchive-btn"
              fullWidth
              size="small"
              variant="text"
              startIcon={<UnarchiveIcon sx={{ fontSize: '12px !important' }} />}
              sx={{ color: 'text.secondary', fontSize: '0.625rem' }}
              onClick={e => { e.stopPropagation(); onUnarchive?.(thread.id) }}
            >
              UNARCHIVE
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
