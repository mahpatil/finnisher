'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import { alpha } from '@mui/material/styles'
import { SessionData } from './SessionCard'

interface Props {
  sessions: SessionData[]
}

export function InsightsView({ sessions }: Props) {
  // Mock aggregation logic for Friction Heatmap
  const frictionPoints = [
    { label: 'Edge Case Handling', rate: 82, color: 'error.main' },
    { label: 'Schema Validation', rate: 45, color: alpha('#ffb4ab', 0.6) },
    { label: 'Unit Test Generation', rate: 12, color: 'primary.main' },
    { label: 'Documentation Sync', rate: 5, color: alpha('#00e471', 0.4) },
  ]

  // Mock Effort Distribution
  const effortData = [
    { label: 'Debugging', value: 40, color: 'primary.main' },
    { label: 'New Features', value: 30, color: alpha('#00e471', 0.6) },
    { label: 'Documentation', value: 20, color: alpha('#1A1A1A', 0.8) },
    { label: 'Refactoring', value: 10, color: 'divider' },
  ]

  return (
    <Box>
      <Grid container spacing={4}>
        {/* Friction Heatmap */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ p: 4, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 4 }}>Friction Heatmap</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {frictionPoints.map((point) => (
                <Box key={point.label}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{point.label}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: point.color }}>{point.rate}% Retry Rate</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 4, bgcolor: alpha('#fff', 0.05), borderRadius: 1 }}>
                    <Box sx={{ width: `${point.rate}%`, height: '100%', bgcolor: point.color, borderRadius: 1 }} />
                  </Box>
                </Box>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 6, fontStyle: 'italic' }}>
              Validation loops are currently the primary bottleneck.
            </Typography>
          </Box>
        </Grid>

        {/* Effort Distribution */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ p: 4, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h6">Effort Distribution</Typography>
              <Typography variant="overline" color="text.secondary">Last 7 Days</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', height: 120, width: '100%', gap: 0.5, mb: 6 }}>
               {effortData.map((item) => (
                 <Box 
                  key={item.label} 
                  sx={{ 
                    height: '100%', 
                    width: `${item.value}%`, 
                    bgcolor: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                 >
                   <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: item.value > 20 ? 'background.default' : 'text.primary' }}>
                     {item.value}%
                   </Typography>
                   <Typography variant="overline" sx={{ position: 'absolute', bottom: -24, left: 0, fontSize: '0.5rem', whiteSpace: 'nowrap' }}>
                     {item.label}
                   </Typography>
                 </Box>
               ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary">Debugging Intensity High</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 800 }}>↑ 12%</Typography>
                <Typography variant="caption" color="text.secondary">vs last week</Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* High Velocity Opportunities */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ p: 4, bgcolor: alpha('#1A1A1A', 0.4), borderRadius: 2, border: '0.5px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
              <Box>
                <Typography variant="h6">High Velocity Opportunities</Typography>
                <Typography variant="body2" color="text.secondary">Projects &gt;85% completion with low cost-per-outcome</Typography>
              </Box>
              <Chip label="READY TO CLOSE" size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.625rem' }} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
               <Box sx={{ p: 3, border: '1px solid', borderColor: alpha('#fff', 0.05), bgcolor: alpha('#000', 0.2), borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>Project: Omega_Deployment</Typography>
                      <Typography variant="body2" color="primary.main" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>$0.08/Outcome</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flexGrow: 1, height: 6, bgcolor: alpha('#fff', 0.05), borderRadius: 1 }}>
                        <Box sx={{ width: '94%', height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
                      </Box>
                      <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right', fontFamily: '"JetBrains Mono", monospace' }}>94%</Typography>
                    </Box>
                  </Box>
                  <Button size="small" sx={{ ml: 4, color: 'primary.main', fontSize: '0.625rem' }}>INITIATE FINAL VALIDATION →</Button>
               </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
