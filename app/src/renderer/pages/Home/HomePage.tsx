import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Card, CardActionArea, CircularProgress,
  Fade, CardMedia, Grid
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { IProfile, IAppSettings } from '../../../shared/types';
import LogPanel from '../../components/LogPanel/LogPanel';
import ProfileContextMenu from '../../components/ProfileContextMenu/ProfileContextMenu';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog/DeleteConfirmationDialog';
import { darkTheme } from '../../theme';

const HomePage = () => {
  const [profiles, setProfiles] = useState<IProfile[]>([]);
  const [settings, setSettings] = useState<IAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [hoveredProfileId, setHoveredProfileId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ anchor: null | HTMLElement, profile: IProfile | null }>({ anchor: null, profile: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, profile: IProfile | null }>({ open: false, profile: null });
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
  const isAutoCopyConfigured = useMemo(() => {
    return settings?.appId !== null && settings?.refAccountId !== null && settings?.refProfileName !== null;
  }, [settings]);

  const isAutoCopyEnabled = useMemo(() => {
    return isAutoCopyConfigured && settings?.autoCopySettings;
  }, [isAutoCopyConfigured, settings]);

  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedProfiles, fetchedSettings] = await Promise.all([
        window.electronAPI.getAllProfiles(),
        window.electronAPI.getSettings(),
      ]);
      setProfiles(fetchedProfiles);
      setSettings(fetchedSettings);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to fetch initial data.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();

    const handleProfilesChanged = async () => {
      console.log('Profiles changed event received. Fetching new data...');
      await fetchData();
      console.log('Data fetched. Updating image refresh key.');
      setImageRefreshKey(Date.now());
    };

    const removeProfilesChangedListener = window.electronAPI.onProfilesChanged(handleProfilesChanged);

    const removeStartListener = window.electronAPI.onUnlinkStart(() => {
      setIsUnlinking(true);
      setLogs([]);
    });

    const removeLogListener = window.electronAPI.onUnlinkLog((log) => {
      setLogs(prev => [...prev, log]);
    });

    const removeFinishListener = window.electronAPI.onUnlinkFinish((result) => {
      setIsUnlinking(false);
      if (result.success) {
        enqueueSnackbar('Profile switched successfully!', { variant: 'success' });
        window.electronAPI.getSettings().then(setSettings);
      } else {
        enqueueSnackbar(`Error: ${result.error || 'An unknown error occurred.'}`, {
          variant: 'error'
        });
      }
    });

    return () => {
      removeProfilesChangedListener();
      removeStartListener();
      removeLogListener();
      removeFinishListener();
    };
  }, [fetchData]);

  const handleProfileSelect = async (targetProfile: IProfile, overwriteAutoCopySettings?: boolean) => {
    if (!settings || isUnlinking || targetProfile.id === settings.selectedProfileId) {
      return;
    }
    const previousProfile = profiles.find(p => p.id === settings.selectedProfileId);
    if (!previousProfile) {
      enqueueSnackbar(`Could not find previous profile with id: ${settings.selectedProfileId}`, { variant: 'error' });
      return;
    }
    window.electronAPI.runUnlink({ previousProfile, newProfile: targetProfile, overwriteAutoCopySettings });
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>, profile: IProfile) => {
    event.preventDefault();
    setContextMenu({ anchor: event.currentTarget, profile });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ anchor: null, profile: null });
  };

  const handleDeleteProfile = async () => {
    if (!deleteDialog.profile) return;
    try {
      await window.electronAPI.deleteProfile(deleteDialog.profile.id);
      enqueueSnackbar(`Profile "${deleteDialog.profile.name}" deleted.`, { variant: 'success' });
      setDeleteDialog({ open: false, profile: null });
      fetchData();
    } catch (e: any) {
      enqueueSnackbar(`Failed to delete profile: ${e.message}`, { variant: 'error' });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      <Typography variant="h4" component="h1" fontWeight="bold">Select Profile</Typography>

      <Grid container spacing={3}>
        {profiles.map((profile) => {
          const isActive = settings?.selectedProfileId === profile.id;
          const avatarSrc = profile.avatar
            ? profile.avatar
            : `https://api.dicebear.com/9.x/icons/svg?scale=75&backgroundType=gradientLinear&seed=${encodeURIComponent(profile.id)}`;
          return (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={profile.id}>
              <Card
                onContextMenu={(e) => handleContextMenu(e, profile)}
                onMouseEnter={() => setHoveredProfileId(profile.id)}
                onMouseLeave={() => setHoveredProfileId(null)}
                sx={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  bgcolor: 'background.paper',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  transform: isUnlinking && !isActive ? 'scale(0.95)' : 'scale(1)',
                  filter: isUnlinking && !isActive ? 'grayscale(80%)' : 'none',
                  boxShadow: isActive ? `0 0 15px 2px ${darkTheme.palette.primary.main}` : 1,
                  border: '2px solid',
                  borderColor: isActive ? 'primary.main' : 'transparent',
                  '&:hover': {
                    transform: isUnlinking ? 'none' : 'scale(1.05)',
                    boxShadow: isActive ? `0 0 15px 2px ${darkTheme.palette.primary.main}` : 6,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleProfileSelect(profile)}
                  disabled={isUnlinking}
                >
                  <CardMedia
                    key={imageRefreshKey}
                    component="img"
                    image={avatarSrc}
                    alt={profile.name}
                    sx={{ height: '100%', width: '100%', objectFit: 'cover' }}
                  />
                    <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      textAlign: 'center',
                      p: 1,
                      color: 'white',
                      zIndex: 1,
                    }}
                    >
                    <Fade in={hoveredProfileId === profile.id || isActive || isUnlinking}>
                      <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                        zIndex: -1,
                      }}
                      />
                    </Fade>
                    <Typography variant="h6" sx={{textShadow: '0 0 2px #000, 0 0 4px #000'}}>
                      {profile.name}
                    </Typography>
                    {isUnlinking && isActive && (
                      <CircularProgress size={20} sx={{ position: 'absolute', top: 8, right: 8 }} />
                    )}
                    </Box>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}

        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <Card sx={{
            aspectRatio: '1 / 1',
            border: '2px dashed',
            borderColor: 'divider',
            transition: 'border-color 0.2s, background-color 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}>
            <CardActionArea
              sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
              onClick={() => navigate('/profiles/new')}
              disabled={isUnlinking}
            >
              <AddIcon sx={{ fontSize: 50, mb: 1 }} />
              <Typography>Add Profile</Typography>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      <ProfileContextMenu
        anchorEl={contextMenu.anchor}
        onClose={handleCloseContextMenu}
        isAutoCopyEnabled={isAutoCopyEnabled}
        onAutoCopy={isAutoCopyConfigured ? () => {
          handleProfileSelect(contextMenu.profile, !isAutoCopyEnabled);
          handleCloseContextMenu();
        } : null}
        onEdit={() => {
          navigate(`/profiles/${contextMenu.profile.id}`);
          handleCloseContextMenu();
        }}
        onDelete={() => {
          setDeleteDialog({ open: true, profile: contextMenu.profile });
          handleCloseContextMenu();
        }}
      />

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, profile: null })}
        onConfirm={handleDeleteProfile}
        title="Delete Profile"
        confirmString={deleteDialog.profile?.id || ''}
      />

      <Fade in={logs.length > 0 || isUnlinking}>
        <Box sx={{ height: '100%', minHeight: 195, mt: 2 }}>
          <LogPanel logs={logs} />
        </Box>
      </Fade>

    </Box>
  );
};

export default HomePage;