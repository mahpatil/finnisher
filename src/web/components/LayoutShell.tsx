'use client'

import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import InputBase from '@mui/material/InputBase'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import { alpha, styled } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import HistoryIcon from '@mui/icons-material/History'
import SpeedIcon from '@mui/icons-material/Speed'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import SearchIcon from '@mui/icons-material/Search'
import TerminalIcon from '@mui/icons-material/Terminal'
import InfoIcon from '@mui/icons-material/Info'
import DescriptionIcon from '@mui/icons-material/Description'
import HelpIcon from '@mui/icons-material/Help'

const drawerWidth = 260

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.background.paper, 0.5),
  border: `1px solid ${theme.palette.divider}`,
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}))

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
}))

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  fontSize: '0.8125rem',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    [theme.breakpoints.up('sm')]: {
      width: '24ch',
      '&:focus': {
        width: '32ch',
      },
    },
  },
}))

interface LayoutShellProps {
  children: React.ReactNode
  currentTab: string
  onTabChange: (tab: string) => void
}

export function LayoutShell({ children, currentTab, onTabChange }: LayoutShellProps) {
  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider',
            padding: 2,
          },
        }}
      >
        <Box sx={{ mb: 4, px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary' }}>
            Execution Engine
          </Typography>
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
            Operational Insights
          </Typography>
        </Box>

        <List sx={{ flexGrow: 1 }}>
          {[
            { id: 'dashboard', label: 'Overview', icon: <DashboardIcon /> },
            { id: 'threads', label: 'Threads', icon: <AccountTreeIcon /> },
            { id: 'insights', label: 'Execution Insights', icon: <SpeedIcon /> },
            { id: 'optimization', label: 'Optimization', icon: <SmartToyIcon /> },
          ].map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={currentTab === item.id}
                onClick={() => onTabChange(item.id)}
                sx={{
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: alpha('#00e471', 0.1),
                    color: 'primary.main',
                    borderLeft: '2px solid',
                    borderColor: 'primary.main',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '&:hover': { backgroundColor: alpha('#00e471', 0.15) },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  slotProps={{ primary: { variant: 'overline', sx: { fontSize: '0.625rem', letterSpacing: '0.05em' } } }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 1, mb: 2 }}>
            <Typography variant="overline" color="primary.main" sx={{ display: 'block', mb: 1 }}>
              AI ADVISORY
            </Typography>
            <Box sx={{ 
              p: 1.5, 
              bgcolor: alpha('#00e471', 0.05), 
              border: '1px solid', 
              borderColor: alpha('#00e471', 0.1),
              borderRadius: 0.5 
            }}>
              <Typography variant="body2" sx={{ fontSize: '0.6875rem', lineHeight: 1.4, color: 'text.secondary' }}>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>CRITICAL:</Box> Thread 'Auth Refactor' has failed 3 validation loops.
              </Typography>
            </Box>
          </Box>
          
          <List dense>
            <ListItem disablePadding>
              <ListItemButton sx={{ borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  <DescriptionIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Documentation" slotProps={{ primary: { variant: 'overline', sx: { fontSize: '0.625rem' } } }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton sx={{ borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  <HelpIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Support" slotProps={{ primary: { variant: 'overline', sx: { fontSize: '0.625rem' } } }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1 }}>
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            backgroundColor: alpha('#131313', 0.8), 
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid', 
            borderColor: 'divider',
            color: 'text.primary'
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" sx={{ 
                fontFamily: '"JetBrains Mono", monospace', 
                fontWeight: 900, 
                color: 'primary.main',
                textTransform: 'uppercase',
                letterSpacing: '-0.05em'
              }}>
                Finnisher
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                px: 1.5, 
                py: 0.5, 
                bgcolor: alpha('#1A1A1A', 0.5),
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
                  Avg Sessions:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: 'primary.main' }}>
                  4.2
                </Typography>
              </Box>
              
              <Search>
                <SearchIconWrapper>
                  <SearchIcon sx={{ fontSize: 18 }} />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search execution stream..."
                  inputProps={{ 'aria-label': 'search' }}
                />
              </Search>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge color="error" variant="dot">
                <NotificationsIcon color="action" sx={{ cursor: 'pointer' }} />
              </Badge>
              <TerminalIcon color="action" sx={{ ml: 2, cursor: 'pointer' }} />
              <SettingsIcon color="action" sx={{ ml: 2, cursor: 'pointer' }} />
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  ml: 2, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                JD
              </Avatar>
            </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: 4, maxWidth: 1440, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
