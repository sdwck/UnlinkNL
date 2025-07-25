import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Card, CardContent, TextField, Avatar, Button, IconButton, List, ListItem, ListItemAvatar, ListItemText, Divider } from '@mui/material';
import { useSnackbar } from 'notistack';
import debounce from 'lodash.debounce';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { IProfile, ISteamAccount } from '../../../shared/types';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog/DeleteConfirmationDialog';
import fakeApi from '../../api/vercelApi';

const ProfileDetailPage = () => {
    const { profileId } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    
    const [profile, setProfile] = useState<IProfile | null>(null);
    const [accounts, setAccounts] = useState<ISteamAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteAccountDialog, setDeleteAccountDialog] = useState<{ open: boolean, account: ISteamAccount | null }>({ open: false, account: null });

    const debouncedUpdateName = useCallback(debounce((id, name) => {
        window.electronAPI.updateProfile(id, name);
    }, 500), []);

    const fetchProfileData = useCallback(async () => {
        if (!profileId) return;
        try {
            setLoading(true);
            const profiles = await window.electronAPI.getAllProfiles();
            const currentProfile = profiles.find(p => p.id === profileId);
            if (!currentProfile) {
                enqueueSnackbar('Profile not found.', { variant: 'error' });
                navigate('/');
                return;
            }
            setProfile(currentProfile);
            const localAccounts = await window.electronAPI.getAccountsForProfile(profileId);
            const enrichedAccounts = await fakeApi.getEnrichedAccountData(localAccounts);
            setAccounts(enrichedAccounts);
        } catch (e: any) {
            enqueueSnackbar(e.message, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [profileId, navigate, enqueueSnackbar]);
    
    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!profile) return;
        const newName = event.target.value;
        setProfile({ ...profile, name: newName });
        debouncedUpdateName(profile.id, newName);
    };

    const handleAvatarUpload = async () => {
        if (!profile) return;
        const filePath = await window.electronAPI.showOpenDialog();
        if (filePath) {
            try {
                await window.electronAPI.setProfileAvatar(profile.id, filePath);
                enqueueSnackbar('Avatar updated!', { variant: 'success' });
                window.location.reload();
            } catch (e: any) {
                enqueueSnackbar(`Failed to update avatar: ${e.message}`, { variant: 'error' });
            }
        }
    };
    
    const handleDeleteAccount = async () => {
        if (!profile || !deleteAccountDialog.account) return;
        try {
            await window.electronAPI.deleteAccount(profile.id, deleteAccountDialog.account.id);
            enqueueSnackbar(`Account ${deleteAccountDialog.account.steamName} deleted.`, { variant: 'success' });
            setDeleteAccountDialog({ open: false, account: null });
            fetchProfileData();
        } catch (e: any) {
            enqueueSnackbar(`Failed to delete account: ${e.message}`, { variant: 'error' });
        }
    };
    
    if (loading) return <CircularProgress />;
    if (!profile) return <Typography>Profile not found.</Typography>;

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Edit Profile</Typography>
            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={3}>
                        <Box position="relative">
                            <Avatar src={`https://i.pravatar.cc/150?u=${profile.id}&t=${new Date().getTime()}`} sx={{ width: 100, height: 100 }} />
                            <IconButton onClick={handleAvatarUpload} size="small" sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: 'background.paper' }}>
                                <EditIcon />
                            </IconButton>
                        </Box>
                        <TextField
                            label="Profile Name"
                            value={profile.name}
                            onChange={handleNameChange}
                            variant="outlined"
                            fullWidth
                        />
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6">Linked Accounts</Typography>
                    <List>
                        {accounts.map(acc => (
                            <ListItem key={acc.id} secondaryAction={
                                <IconButton edge="end" onClick={() => setDeleteAccountDialog({ open: true, account: acc })}>
                                    <DeleteIcon color="error" />
                                </IconButton>
                            }>
                                <ListItemAvatar><Avatar src={acc.avatarUrl} /></ListItemAvatar>
                                <ListItemText primary={acc.steamName} secondary={`ID: ${acc.steamId}`} />
                            </ListItem>
                        ))}
                    </List>
                </CardContent>
            </Card>
            <DeleteConfirmationDialog 
                open={deleteAccountDialog.open}
                onClose={() => setDeleteAccountDialog({ open: false, account: null })}
                onConfirm={handleDeleteAccount}
                title={`Delete Account ${deleteAccountDialog.account?.steamName}?`}
                confirmString={deleteAccountDialog.account?.id || ''}
            />
        </Box>
    );
};

export default ProfileDetailPage;