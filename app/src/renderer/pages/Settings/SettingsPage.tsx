import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Card, CardContent, FormGroup,
  FormControlLabel, Switch, TextField, Button, Alert, Divider,
  IconButton
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useSnackbar } from 'notistack';
import debounce from 'lodash.debounce';
import { IAppSettings, IProfile } from '../../../shared/types';
import AutoCopySetupDialog from '../../components/AutoCopySetupDialog/AutoCopySetupDialog';

const formatSteamPath = (path: string | null): string => {
  if (!path) return '';
  let formattedPath = path.charAt(0).toUpperCase() + path.slice(1);
  formattedPath = formattedPath.replace(/program files \(x86\)/i, 'Program Files (x86)');
  formattedPath = formattedPath.replace(/program files/i, 'Program Files');
  formattedPath = formattedPath.replace(/steam$/i, 'Steam');
  return formattedPath;
};

const SettingsPage = () => {
  const [settings, setSettings] = useState<IAppSettings | null>(null);
  const [profiles, setProfiles] = useState<IProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  
  const { enqueueSnackbar } = useSnackbar();

  const debouncedSave = useCallback(
    debounce((newSettings: IAppSettings) => {
      window.electronAPI.saveSettings(newSettings);
    }, 500),
    []
  );

  useEffect(() => {
    if (settings && !loading) {
      debouncedSave(settings);
    }
  }, [settings, debouncedSave, loading]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [fetchedSettings, fetchedProfiles] = await Promise.all([
          window.electronAPI.getSettings(),
          window.electronAPI.getAllProfiles()
        ]);
        setSettings(fetchedSettings);
        setProfiles(fetchedProfiles);
      } catch (e: any) {
        enqueueSnackbar(`Failed to load settings: ${e.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [enqueueSnackbar]);

  const handleSettingsChange = (newValues: Partial<IAppSettings>) => {
    setSettings(prev => prev ? { ...prev, ...newValues } : null);
  };
  
  const handleSelectSteamPath = async () => {
      const path = await window.electronAPI.selectSteamPathDialog();
      if (path) {
          handleSettingsChange({ steamPath: path });
      }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (!settings) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><Typography color="error">Could not load settings.</Typography></Box>;
  }
  
  const isAutoCopyConfigured = settings.refProfileName && settings.refAccountId && settings.appId;

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>Settings</Typography>
      
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          
          <Box>
            <Typography variant="h6">Process Options</Typography>
            <FormGroup sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 0.5 }}>
              <FormControlLabel control={<Switch checked={settings.terminateSteam} onChange={(e) => handleSettingsChange({ terminateSteam: e.target.checked })} />} label="Terminate Steam" />
              <FormControlLabel control={<Switch checked={settings.changeHwid} onChange={(e) => handleSettingsChange({ changeHwid: e.target.checked })} />} label="Change HWID" />
              <FormControlLabel control={<Switch checked={settings.randomizeMacs} onChange={(e) => handleSettingsChange({ randomizeMacs: e.target.checked })} />} label="Randomize MACs" />
              <FormControlLabel control={<Switch checked={settings.cleanRegedit} onChange={(e) => handleSettingsChange({ cleanRegedit: e.target.checked })} />} label="Clean Registry" />
              <FormControlLabel control={<Switch checked={settings.changeMguid} onChange={(e) => handleSettingsChange({ changeMguid: e.target.checked })} />} label="Change MachineGUID" />
              <FormControlLabel control={<Switch checked={settings.startSteam} onChange={(e) => handleSettingsChange({ startSteam: e.target.checked })} />} label="Start Steam After" />
            </FormGroup>
          </Box>
          
          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Auto-Copy Settings</Typography>
            <Card variant="outlined" sx={{ bgcolor: 'action.hover', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel 
                  control={<Switch checked={settings.autoCopySettings} onChange={(e) => handleSettingsChange({ autoCopySettings: e.target.checked })} />} 
                  label={<Typography variant="body1" fontWeight={500}>Enable Auto-Copy</Typography>}
                />
              <Button
                variant="contained"
                onClick={() => setIsSetupDialogOpen(true)}
                disabled={!settings.autoCopySettings}
                sx={{
                  minWidth: '150px',
                  fontWeight: 'bold',
                  color: settings.autoCopySettings ? 'white' : 'text.disabled',
                  bgcolor: settings.autoCopySettings ? 'primary.main' : 'action.disabled',
                  '&:hover': {
                    bgcolor: settings.autoCopySettings ? 'primary.dark' : 'action.disabled',
                  }
                }}
              >
                {isAutoCopyConfigured ? 'Re-Configure' : 'Configure'}
              </Button>
            </Card>
            {settings.autoCopySettings && (
                <Alert severity={isAutoCopyConfigured ? 'success' : 'warning'} sx={{ mt: 1.5 }} variant="outlined">
                    {isAutoCopyConfigured 
                        ? `Ready to copy for AppID ${settings.appId} from ${settings.refProfileName}/${settings.refAccountId}`
                        : 'Configuration required. Click "Configure" to set up source profile, account, and game.'
                    }
                </Alert>
            )}
          </Box>
          
          <Divider />
          
          <Box>
            <Typography variant="h6">Steam Path</Typography>
            <TextField
              fullWidth
              variant="outlined"
              label="Steam Installation Path"
              value={formatSteamPath(settings.steamPath)}
              sx={{ mt: 1.5 }}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton onClick={handleSelectSteamPath} title="Select Steam Folder">
                    <FolderOpenIcon />
                  </IconButton>
                )
              }}
            />
          </Box>

        </CardContent>
      </Card>
      
      <AutoCopySetupDialog
        open={isSetupDialogOpen}
        onClose={() => setIsSetupDialogOpen(false)}
        onSave={(data) => handleSettingsChange(data)}
        profiles={profiles}
      />
    </Box>
  );
};

export default SettingsPage;