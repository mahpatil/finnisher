'use client'

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

export function SessionCard({ session }: { session: SessionData }) {
  return (
    <div data-testid="session-card" style={{ border: '1px solid #ccc', padding: '12px', marginBottom: '8px', borderRadius: '6px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
        <span data-testid="agent-badge" style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
          {session.agent}
        </span>
        <span style={{ fontSize: '12px', color: '#666' }}>{durationStr(session.startedAt, session.endedAt)}</span>
        {session.folderName && (
          <span data-testid="folder-badge" style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
            {session.folderName}
          </span>
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#444' }}>
        {session.gitBranch && <span style={{ marginRight: '8px' }}>⎇ {session.gitBranch}</span>}
        {session.lastCommitMsg && <span style={{ marginRight: '8px' }}>{session.lastCommitMsg}</span>}
        {session.unpushedCount !== null && session.unpushedCount > 0 && (
          <span style={{ color: '#dc2626' }}>↑{session.unpushedCount} unpushed</span>
        )}
      </div>
      {session.githubUrl && (
        <div style={{ marginTop: '4px' }}>
          <a
            data-testid="github-link"
            href={session.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: '#2563eb' }}
          >
            {session.githubUrl}
          </a>
        </div>
      )}
    </div>
  )
}
