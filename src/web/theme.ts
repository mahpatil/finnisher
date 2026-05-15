import { createTheme, alpha } from '@mui/material/styles'

const primaryMain = '#00e471'
const secondaryMain = '#ffba20'
const errorMain = '#ffb4ab'
const backgroundDefault = '#0A0A0A'
const surfaceVariant = '#1A1A1A'
const outlineColor = '#333333'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: primaryMain,
      contrastText: '#003917',
    },
    secondary: {
      main: secondaryMain,
    },
    error: {
      main: errorMain,
    },
    background: {
      default: backgroundDefault,
      paper: surfaceVariant,
    },
    text: {
      primary: '#e5e2e1',
      secondary: '#b9cbb8',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    body1: {
      fontSize: '0.875rem',
    },
    body2: {
      fontSize: '0.75rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontFamily: '"JetBrains Mono", monospace',
    },
    overline: {
      fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: '0.1em',
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#0a0a0a',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#333',
            borderRadius: '2px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: alpha('#1A1A1A', 0.6),
          backdropFilter: 'blur(20px)',
          border: `0.5px solid ${outlineColor}`,
          boxShadow: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          fontWeight: 700,
          minWidth: 0,
          padding: '12px 16px',
        },
      },
    },
  },
})
