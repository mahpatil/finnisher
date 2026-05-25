export async function patchThread(id: string, patch: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: { message?: string } } | null
    const message = body?.error?.message ?? `Request failed (${res.status})`
    throw new Error(message)
  }
}
