'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { LayoutShell } from '../../components/LayoutShell'

export default function OptimizationPage() {
  return (
    <LayoutShell>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Optimization</Typography>
        <Typography variant="body1" color="text.secondary">
          Agent performance tuning and workflow optimization.
        </Typography>
      </Box>
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">Agent Optimization coming soon.</Typography>
      </Box>
    </LayoutShell>
  )
}
