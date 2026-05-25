'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import InputBase from '@mui/material/InputBase'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import { alpha, styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import SpeedIcon from '@mui/icons-material/Speed'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import HistoryIcon from '@mui/icons-material/History'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import SearchIcon from '@mui/icons-material/Search'
import TerminalIcon from '@mui/icons-material/Terminal'
import DescriptionIcon from '@mui/icons-material/Description'
import HelpIcon from '@mui/icons-material/Help'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

const DRAWER_WIDTH = 260
const COLLAPSED_WIDTH = 56

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

const NAV_ITEMS = [
  { path: '/',             label: 'Overview',          icon: <DashboardIcon />,   testid: 'nav-home' },
  { path: '/threads',      label: 'Threads',            icon: <AccountTreeIcon />, testid: 'nav-threads' },
  { path: '/sessions',     label: 'Sessions',           icon: <HistoryIcon />,     testid: 'nav-sessions' },
  { path: '/insights',     label: 'Execution Insights', icon: <SpeedIcon />,       testid: 'nav-insights' },
  { path: '/optimization', label: 'Optimization',       icon: <SmartToyIcon />,    testid: 'nav-optimization' },
] as const

interface LayoutShellProps {
  children: React.ReactNode
}

export function LayoutShell({ children }: LayoutShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const effectiveWidth = collapsed && !isMobile ? COLLAPSED_WIDTH : DRAWER_WIDTH

  function handleNavClick(path: string) {
    router.push(path)
    if (isMobile) setMobileOpen(false)
  }

  const drawerContent = (
    <>
      <Box sx={{ mb: collapsed && !isMobile ? 1 : 4, px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {(!collapsed || isMobile) && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary' }}>
              Execution Engine
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
              Operational Insights
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton
            data-testid="sidebar-collapse-toggle"
            size="small"
            onClick={() => setCollapsed(c => !c)}
            sx={{ ml: collapsed ? 'auto' : 0, mr: collapsed ? 'auto' : 0 }}
          >
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      <List sx={{ flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              data-testid={item.testid}
              selected={pathname === item.path}
              onClick={() => handleNavClick(item.path)}
              sx={{
                borderRadius: 1,
                minHeight: 40,
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                px: collapsed && !isMobile ? 1 : 2,
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
              <ListItemIcon sx={{ minWidth: collapsed && !isMobile ? 0 : 40, color: 'text.secondary', justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
              {(!collapsed || isMobile) && (
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { variant: 'overline', sx: { fontSize: '0.625rem', letterSpacing: '0.05em' } } }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {(!collapsed || isMobile) && (
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
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>CRITICAL:</Box> Thread &apos;Auth Refactor&apos; has failed 3 validation loops.
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
      )}
    </>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Single adaptive Drawer: temporary on mobile, permanent on desktop */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            'data-testid': 'sidebar-drawer',
          } as React.ComponentProps<'div'>,
        }}
        sx={{
          width: isMobile ? 0 : effectiveWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: effectiveWidth,
            boxSizing: 'border-box',
            backgroundColor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider',
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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
              {/* Hamburger: visible only on mobile */}
              <IconButton
                data-testid="hamburger-menu"
                sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>

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
                display: { xs: 'none', sm: 'flex' },
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

              <Search sx={{ display: { xs: 'none', sm: 'block' } }}>
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
              <TerminalIcon color="action" sx={{ ml: 2, cursor: 'pointer', display: { xs: 'none', sm: 'block' } }} />
              <SettingsIcon color="action" sx={{ ml: 2, cursor: 'pointer', display: { xs: 'none', sm: 'block' } }} />
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

        <Box component="main" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1440, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
