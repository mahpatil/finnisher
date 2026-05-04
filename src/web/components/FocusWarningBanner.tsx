'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import type { ThreadData } from './ThreadCard'

interface FocusWarning {
  level: 'caution' | 'urgent'
  count: number
  message: string
  suggestions: ThreadData[]
}

interface Props {
  warning: FocusWarning
  onMarkDone: (id: string) => void
  onSetWaiting: (id: string) => void
}

export function FocusWarningBanner({ warning, onMarkDone, onSetWaiting }: Props) {
  const bg = warning.level === 'urgent' ? '#fef2f2' : '#fffbeb'
  const borderColor = warning.level === 'urgent' ? '#fca5a5' : '#fcd34d'
  const textColor = warning.level === 'urgent' ? '#b91c1c' : '#92400e'

  return (
    <Box
      data-testid="focus-warning-banner"
      data-severity={warning.level}
      sx={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 1,
        p: 2,
        mb: 2,
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ color: textColor, mb: 1 }}>
        {warning.message}
      </Typography>
      {warning.suggestions.map(s => (
        <Box
          key={s.id}
          data-testid="suggestion-item"
          display="flex"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
        >
          <Typography variant="body2" sx={{ color: textColor, flex: 1 }}>
            {s.title}
          </Typography>
          <Box display="flex" gap={0.5}>
            <Button size="small" variant="contained" color="success" onClick={() => onMarkDone(s.id)}>
              Done
            </Button>
            <Button size="small" variant="outlined" color="warning" onClick={() => onSetWaiting(s.id)}>
              Park
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
