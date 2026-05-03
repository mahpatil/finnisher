'use client'

import { useEffect, useState } from 'react'
import { SessionCard, type SessionData } from '../../components/SessionCard'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([])

  useEffect(() => {
    void fetch('/api/sessions')
      .then(r => r.json() as Promise<SessionData[]>)
      .then(setSessions)
  }, [])

  return (
    <main style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '16px' }}>Sessions</h1>
      {sessions.length === 0 ? (
        <p data-testid="empty-sessions">No sessions yet.</p>
      ) : (
        sessions.map(s => <SessionCard key={s.id} session={s} />)
      )}
    </main>
  )
}
