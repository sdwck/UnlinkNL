import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, TextField, Avatar, Button, IconButton } from '@mui/material';
import { useSnackbar } from 'notistack';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

const CreateProfilePage = () => {
    const [profileName, setProfileName] = useState('');
    const [avatarPath, setAvatarPath] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const handleAvatarSelect = async () => {
        const filePath = await window.electronAPI.showOpenDialog();
        if (filePath) {
            const base64Preview = await window.electronAPI.readFileAsBase64(filePath);
            if (base64Preview) {
                setAvatarPreview(base64Preview);
                setAvatarPath(filePath);
            } else {
                enqueueSnackbar('Could not read the selected image file.', { variant: 'error' });
            }
        }
    };
    
    const handleCreate = async () => {
        if (!profileName.trim()) {
            enqueueSnackbar('Profile name cannot be empty.', { variant: 'warning' });
            return;
        }
        setLoading(true);
        try {
            const newProfile = await window.electronAPI.createProfile(profileName.trim());
            if (avatarPath) {
                await window.electronAPI.setProfileAvatar(newProfile.id, avatarPath);
            }
            enqueueSnackbar(`Profile "${newProfile.name}" created successfully!`, { variant: 'success' });
            navigate('/');
        } catch (e: any) {
            enqueueSnackbar(`Failed to create profile: ${e.message}`, { variant: 'error' });
            setLoading(false);
        }
    };
    
    return (
        <Box>
            <Typography variant="h4" gutterBottom>Create New Profile</Typography>
            <Card>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="flex" alignItems="center" gap={3}>
                        <IconButton onClick={handleAvatarSelect} sx={{ p: 0 }}>
                            <Avatar src={avatarPreview || undefined} sx={{ width: 100, height: 100 }}>
                                {!avatarPreview && <AddPhotoAlternateIcon sx={{ fontSize: 40 }} />}
                            </Avatar>
                        </IconButton>
                        <TextField
                            autoFocus
                            label="Profile Name"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            variant="outlined"
                            fullWidth
                            placeholder="e.g., Primal Warrior 666"
                        />
                    </Box>
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                        <Button variant="text" onClick={() => navigate('/')} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={handleCreate} disabled={loading || !profileName.trim()}>
                            {loading ? 'Creating...' : 'Create Profile'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default CreateProfilePage;