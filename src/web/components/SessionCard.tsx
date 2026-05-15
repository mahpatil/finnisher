'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'

export interface SessionData {
  id: string
  agent: string
  agentId: string | null
  startedAt: string
  endedAt: string | null
  tokensIn: number | null
  tokensOut: number | null
  costUsd: number | null
  frictionScore: number | null
  effortType: string | null
  gitBranch: string | null
  lastCommitMsg: string | null
  unpushedCount: number | null
  folderName: string | null
  githubUrl: string | null
  projectPath: string | null
}

function durationStr(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'running'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const agentLabel: Record<string, string> = {
  claude_code: 'Claude Code',
  codex: 'Codex',
  opencode: 'OpenCode',
  gemini_code: 'Gemini',
  manual: 'Manual',
}

export function SessionCard({ session }: { session: SessionData }) {
  const duration = durationStr(session.startedAt, session.endedAt)
  const running = !session.endedAt
  const totalTokens = (session.tokensIn ?? 0) + (session.tokensOut ?? 0)

  return (
    <Card 
      data-testid="session-card" 
      sx={{ 
        mb: 1, 
        border: 'none',
        bgcolor: alpha('#1A1A1A', 0.2),
        '&:hover': { bgcolor: alpha('#00e471', 0.05) },
        transition: 'background-color 0.2s'
      }}
    >
      <CardContent sx={{ p: '12px 16px !important', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
          <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
            {new Date(session.startedAt).getHours()}:{new Date(session.startedAt).getMinutes()}
          </Typography>
          <Box sx={{ width: 1, height: 20, bgcolor: 'divider', my: 0.5, width: '1px' }} />
          {running ? (
            <HourglassEmptyIcon sx={{ fontSize: 16, color: 'secondary.main', animation: 'spin 2s linear infinite' }} />
          ) : (
            <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="overline" sx={{ 
              fontSize: '0.625rem', 
              bgcolor: alpha('#333', 0.5), 
              px: 1, 
              borderRadius: 0.5,
              color: 'text.primary'
            }}>
              {agentLabel[session.agent] ?? session.agent}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {session.lastCommitMsg || 'Execution ongoing...'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {session.folderName ? `Project: ${session.folderName}` : session.projectPath}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, textAlign: 'right' }}>
          <Box>
            <Typography variant="overline" sx={{ fontSize: '0.5rem', display: 'block', color: 'text.secondary' }}>DURATION</Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{duration}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ fontSize: '0.5rem', display: 'block', color: 'text.secondary' }}>COST</Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
              {session.costUsd != null ? `$${session.costUsd.toFixed(4)}` : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ fontSize: '0.5rem', display: 'block', color: 'text.secondary' }}>TOKENS</Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {totalTokens > 0 ? `${(totalTokens / 1000).toFixed(0)}k` : '—'}
            </Typography>
          </Box>
          <Box sx={{ width: 80, height: 4, bgcolor: alpha('#333', 0.5), borderRadius: 1, overflow: 'hidden' }}>
             <Box sx={{ width: running ? '30%' : '100%', height: '100%', bgcolor: 'primary.main' }} />
          </Box>
        </Box>
      </CardContent>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  )
}
