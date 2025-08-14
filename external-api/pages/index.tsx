import * as React from 'react';
import Head from 'next/head';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Stack,
  Typography,
  Button,
  Link as MuiLink,
  Divider,
  Chip,
  Dialog,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LaunchIcon from '@mui/icons-material/Launch';
import BoltIcon from '@mui/icons-material/Bolt';
import BugReportIcon from '@mui/icons-material/BugReport';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ObsidianPlayer from '../components/ObsidianPlayer';

const PROJECT_NAME = 'UnlinkNL';
const TAGLINE = 'A powerful desktop application for managing Steam profiles.';

const REPO_OWNER = 'sdwck';
const REPO_NAME = 'UnlinkNL';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
const PROFILE_URL = `https://github.com/${REPO_OWNER}`;
const DOWNLOAD_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest/download/UnlinkNL-win32-x64.zip`;

const EXTRA_LINKS: { label: string; href: string; icon: React.ElementType }[] = [
  { label: 'Author', href: PROFILE_URL, icon: AccountCircleIcon },
  { label: 'Report a Bug', href: `${REPO_URL}/issues`, icon: BugReportIcon },
];

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0b0f14',
      paper: '#0f141a',
    },
    primary: { main: '#a78bfa' },
    secondary: { main: '#e879f9' },
    text: {
      primary: '#e5e7eb',
      secondary: '#94a3b8',
    },
    divider: 'rgba(148,163,184,0.16)'
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    h1: { fontWeight: 700, letterSpacing: -0.5 },
    h5: { fontWeight: 500 },
    body1: { lineHeight: 1.7 },
  },
  components: {
    MuiButton: {
      defaultProps: { size: 'large' },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 14,
          paddingInline: 18,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(15, 20, 26, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        }
      }
    }
  },
});

export default function Home() {
  const [openVideo, setOpenVideo] = React.useState(false);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Head>
        <title>{PROJECT_NAME}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <meta name="description" content={TAGLINE} />
        <meta property="og:title" content={PROJECT_NAME} />
        <meta property="og:description" content={TAGLINE} />
        <meta property="og:type" content="website" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          position: 'relative',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(1000px 600px at 10% -10%, rgba(167,139,250,0.07), transparent),\
               radial-gradient(800px 500px at 120% 20%, rgba(232,121,249,0.06), transparent),\
               linear-gradient(transparent 0%, rgba(255,255,255,0.02) 100%)',
            pointerEvents: 'none',
          },
          '&:after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),\
               linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px, 24px 24px',
            maskImage: 'linear-gradient(180deg, transparent, black 20%, black 80%, transparent)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              p: { xs: 4, sm: 6 },
              borderRadius: 4,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Chip
                label="Desktop • Electron • C#"
                variant="outlined"
                sx={{ borderColor: 'divider', color: 'text.secondary' }}
              />

              <Typography variant="h1" sx={{ fontSize: { xs: 36, sm: 48, md: 56 } }}>
                {PROJECT_NAME}
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 740 }}>
                {TAGLINE}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                <Button
                  href={DOWNLOAD_URL}
                  rel="noopener"
                  variant="contained"
                  startIcon={<BoltIcon />}
                >
                  Download for Windows
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlayCircleOutlineIcon />}
                  onClick={() => setOpenVideo(true)}
                >
                  Watch Demo
                </Button>
                <Button
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener"
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                >
                  GitHub
                </Button>
              </Stack>

              <Divider flexItem sx={{ my: 1, width: '100%', borderColor: 'divider' }} />

              <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center">
                {EXTRA_LINKS.map(({ label, href, icon: Icon }) => (
                  <Button
                    key={label}
                    component={MuiLink}
                    href={href}
                    target="_blank"
                    rel="noopener"
                    size="medium"
                    endIcon={<LaunchIcon sx={{ fontSize: 18 }} />}
                    sx={{ borderColor: 'divider', color: 'text.secondary' }}
                  >
                    <Icon sx={{ mr: 1, fontSize: 20 }} />
                    {label}
                  </Button>
                ))}
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                © {new Date().getFullYear()} • {REPO_OWNER}/{REPO_NAME}
              </Typography>
            </Stack>
          </Box>
        </Container>
      </Box>

      {hasMounted && (
        <Dialog
          open={openVideo}
          onClose={() => setOpenVideo(false)}
          fullWidth
          maxWidth="lg"
        >
          <ObsidianPlayer open={openVideo} onClose={() => setOpenVideo(false)} />
        </Dialog>
      )}
    </ThemeProvider>
  );
}