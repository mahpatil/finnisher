'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

interface Todo {
  id: string
  threadId: string
  text: string
  done: boolean
  createdAt: string
  completedAt: string | null
}

interface Props {
  threadId: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function TodoSection({ threadId }: Props) {
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const { data, mutate } = useSWR<{ todos: Todo[] }>(
    `/api/threads/${threadId}/todos`,
    fetcher
  )

  const todos = data?.todos ?? []

  const handleAdd = useCallback(async () => {
    const text = newText.trim()
    if (!text) return
    setNewText('')
    await fetch(`/api/threads/${threadId}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    await mutate()
  }, [newText, threadId, mutate])

  const handleToggle = useCallback(async (todo: Todo) => {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !todo.done }),
      keepalive: true,
    })
    await mutate()
  }, [mutate])

  const handleEdit = useCallback(async (todo: Todo) => {
    const text = editText.trim()
    if (!text) return
    setEditingId(null)
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    await mutate()
  }, [editText, mutate])

  const handleDelete = useCallback(async (todoId: string) => {
    await fetch(`/api/todos/${todoId}`, { method: 'DELETE' })
    await mutate()
  }, [mutate])

  return (
    <Box data-testid="todos-section">
      <Typography variant="h6" sx={{ mb: 2 }}>Todos</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add a todo..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          slotProps={{ htmlInput: { 'data-testid': 'todo-input' } }}
        />
        <IconButton data-testid="todo-add-btn" onClick={handleAdd} color="primary">
          <AddIcon />
        </IconButton>
      </Box>

      {todos.map(todo => (
        <Box
          key={todo.id}
          data-testid="todo-item"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
        >
          <Checkbox
            checked={todo.done}
            onChange={() => handleToggle(todo)}
            size="small"
          />
          {editingId === todo.id ? (
            <TextField
              size="small"
              fullWidth
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleEdit(todo)
                if (e.key === 'Escape') setEditingId(null)
              }}
              autoFocus
              slotProps={{ htmlInput: { 'data-testid': 'todo-edit-input' } }}
            />
          ) : (
            <Typography
              variant="body2"
              sx={{
                flexGrow: 1,
                textDecoration: todo.done ? 'line-through' : 'none',
                color: todo.done ? 'text.secondary' : 'text.primary',
              }}
            >
              {todo.text}
            </Typography>
          )}
          <IconButton
            data-testid="todo-edit-btn"
            size="small"
            onClick={() => { setEditingId(todo.id); setEditText(todo.text) }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            data-testid="todo-delete-btn"
            size="small"
            onClick={() => handleDelete(todo.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  )
}
