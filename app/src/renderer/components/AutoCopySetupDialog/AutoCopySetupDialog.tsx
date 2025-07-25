import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Stepper, Step, StepLabel,
    CircularProgress, Box, Grid, Card, CardActionArea, CardMedia, Fade, Typography, Alert
} from '@mui/material';
import { IProfile, ISteamAccount, IGame, IAppSettings } from '../../../shared/types';
import steamApi from '../../api/vercelApi';

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (settings: Pick<IAppSettings, 'refProfileName' | 'refAccountId' | 'appId'>) => void;
    profiles: IProfile[];
}

const steps = ['Select Profile', 'Select Account', 'Select Game'];

const SelectionCard = ({ id, name, imageUrl, onClick, isSelected = false }: any) => (
    <Card sx={{ border: '2px solid', borderColor: isSelected ? 'primary.main' : 'transparent' }}>
        <CardActionArea onClick={onClick}>
            <CardMedia component="img" image={imageUrl} height="140" alt={name} />
            <Fade in>
                <Box sx={{ p: 1, textAlign: 'center' }}>
                    <Typography noWrap>{name}</Typography>
                </Box>
            </Fade>
        </CardActionArea>
    </Card>
);

const AutoCopySetupDialog = ({ open, onClose, onSave, profiles }: Props) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedProfile, setSelectedProfile] = useState<IProfile | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<ISteamAccount | null>(null);
    const [selectedGame, setSelectedGame] = useState<IGame | null>(null);

    const [accounts, setAccounts] = useState<ISteamAccount[]>([]);
    const [games, setGames] = useState<IGame[]>([]);

    useEffect(() => {
        if (!open) {
            setActiveStep(0);
            setSelectedProfile(null);
            setSelectedAccount(null);
            setSelectedGame(null);
            setAccounts([]);
            setGames([]);
            setError(null);
        }
    }, [open]);

    const handleProfileSelect = async (profile: IProfile) => {
        setLoading(true);
        setError(null);
        setSelectedProfile(profile);
        try {
            const localAccounts = await window.electronAPI.getAccountsForProfile(profile.id);
            if (localAccounts.length === 0) {
                throw new Error(`No local Steam accounts found for profile "${profile.name}".`);
            }
            const enrichedAccounts = await steamApi.getEnrichedAccountData(localAccounts);
            setAccounts(enrichedAccounts);
            setActiveStep(1);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAccountSelect = async (account: ISteamAccount) => {
        if (!selectedProfile) return;
        setLoading(true);
        setError(null);
        setSelectedAccount(account);
        try {
            const localGames = await window.electronAPI.getGamesForAccount(selectedProfile.id, account.id);
            if (localGames.length === 0) {
                throw new Error(`No locally played games found for account "${account.steamName}".`);
            }
            const enrichedGames = await steamApi.getEnrichedGameData(localGames);
            setGames(enrichedGames);
            setActiveStep(2);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGameSelect = (game: IGame) => {
        setSelectedGame(game);
    };

    const handleBack = () => {
        setError(null);
        if (activeStep === 1) {
            setSelectedProfile(null);
            setAccounts([]);
        }
        if (activeStep === 2) {
            setSelectedAccount(null);
            setGames([]);
        }
        setActiveStep(prev => prev - 1);
    };

    const handleSaveAndClose = () => {
        if (selectedProfile && selectedAccount && selectedGame) {
            onSave({
                refProfileName: selectedProfile.name,
                refAccountId: selectedAccount.id,
                appId: selectedGame.id,
            });
            onClose();
        }
    };

    const renderStepContent = () => {
        if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
        if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

        switch (activeStep) {
            case 0:
                return (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {profiles.map(profile => {
                            const imageUrl = profile.avatar
                                ? profile.avatar
                                : `https://i.pravatar.cc/250?u=${profile.id}`;

                            return (
                                <Grid size={{ xs: 6, md: 4 }} key={profile.id}>
                                    <SelectionCard
                                        id={profile.id}
                                        name={profile.name}
                                        imageUrl={imageUrl}
                                        onClick={() => handleProfileSelect(profile)}
                                    />
                                </Grid>
                            );
                        })}
                    </Grid>
                );
            case 1:
                return (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {accounts.map(account => (
                            <Grid size={{ xs: 6, md: 4 }} key={account.id}>
                                <SelectionCard
                                    id={account.id}
                                    name={account.steamName || account.id}
                                    imageUrl={account.avatarUrl || ''}
                                    onClick={() => handleAccountSelect(account)}
                                    isSelected={selectedAccount?.id === account.id}
                                />
                            </Grid>
                        ))}
                    </Grid>
                );
            case 2:
                return (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {games.map(game => (
                            <Grid size={{ xs: 6, md: 4 }} key={game.id}>
                                <SelectionCard
                                    id={game.id}
                                    name={game.name}
                                    imageUrl={game.imageUrl}
                                    onClick={() => handleGameSelect(game)}
                                    isSelected={selectedGame?.id === game.id}
                                />
                            </Grid>
                        ))}
                    </Grid>
                );
            default: return null;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Auto-Copy Settings Setup</DialogTitle>
            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
                    {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>
                {renderStepContent()}
            </DialogContent>
            <DialogActions>
                {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    onClick={handleSaveAndClose}
                    variant="contained"
                    disabled={activeStep !== 2 || !selectedGame}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AutoCopySetupDialog;