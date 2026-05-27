import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { getLaunchCriteria, toggleLaunchCriterion, deleteLaunchCriterion } from '@db/launchCriteria'

runMigrations()

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; critId: string }> },
) {
  const { critId } = await params

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const checked = (body as Record<string, unknown>)?.['checked']
  if (typeof checked !== 'boolean') {
    return NextResponse.json({ error: 'checked must be a boolean' }, { status: 400 })
  }

  const { id } = await params
  toggleLaunchCriterion(critId, checked)
  const updated = getLaunchCriteria(id).find(c => c.id === critId)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; critId: string }> },
) {
  const { critId } = await params
  deleteLaunchCriterion(critId)
  return new Response(null, { status: 204 })
}
