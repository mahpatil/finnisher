'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

export interface SessionData {
  id: string
  agent: string
  startedAt: string
  endedAt: string | null
  tokensIn: number | null
  tokensOut: number | null
  costUsd: number | null
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
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const agentLabel: Record<string, string> = {
  claude_code: 'Claude',
  codex: 'Codex',
  opencode: 'OpenCode',
  gemini_code: 'Gemini',
  manual: 'Manual',
}

const agentColor: Record<string, 'secondary' | 'success' | 'info' | 'warning' | 'default'> = {
  claude_code: 'secondary',
  codex: 'success',
  opencode: 'info',
  gemini_code: 'warning',
  manual: 'default',
}

export function SessionCard({ session }: { session: SessionData }) {
  const duration = durationStr(session.startedAt, session.endedAt)
  const running = !session.endedAt

  return (
    <Card data-testid="session-card" variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box display="flex" gap={1} mb={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            data-testid="agent-badge"
            label={agentLabel[session.agent] ?? session.agent}
            size="small"
            color={agentColor[session.agent] ?? 'default'}
          />
          <Typography variant="caption" sx={{ color: running ? '#16a34a' : '#666' }}>
            {running ? '● running' : duration}
          </Typography>
          <Typography variant="caption" sx={{ color: '#888' }}>
            {formatDate(session.startedAt)} {formatTime(session.startedAt)}
          </Typography>
          {session.endedAt && (
            <Typography variant="caption" sx={{ color: '#888' }}>
              → {formatTime(session.endedAt)}
            </Typography>
          )}
          {session.folderName && (
            <Chip
              data-testid="folder-badge"
              label={session.folderName}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" gap={2} mb={0.5} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="caption" data-testid="session-tokens" sx={{ color: '#555' }}>
            {session.tokensIn != null && session.tokensOut != null
              ? `↓${session.tokensIn.toLocaleString()} ↑${session.tokensOut.toLocaleString()} tokens`
              : '— tokens'}
          </Typography>
          <Typography variant="caption" data-testid="session-cost" sx={{ color: '#555' }}>
            {session.costUsd != null ? `$${session.costUsd.toFixed(4)}` : '—'}
          </Typography>
          {session.unpushedCount !== null && session.unpushedCount > 0 && (
            <Typography
              variant="caption"
              data-testid="unpushed-count"
              sx={{ color: '#d97706', fontWeight: 600 }}
            >
              ↑{session.unpushedCount} unpushed
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1} sx={{ flexWrap: 'wrap' }}>
          {session.gitBranch && (
            <Typography variant="caption" sx={{ color: '#444' }}>
              ⎇ {session.gitBranch}
            </Typography>
          )}
          {session.lastCommitMsg && (
            <Typography variant="caption" sx={{ color: '#666' }}>
              {session.lastCommitMsg}
            </Typography>
          )}
        </Box>
        {session.githubUrl && (
          <Box mt={0.5}>
            <a
              data-testid="github-link"
              href={session.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#2563eb' }}
            >
              {session.githubUrl}
            </a>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
