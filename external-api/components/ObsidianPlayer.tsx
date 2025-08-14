import * as React from 'react';
import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { Fullscreen } from '@mui/icons-material';
import ReactPlayer from 'react-player';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const videoUrl = '/demo.mp4';

function formatTime(seconds: number) {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function VideoPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const playerRef = React.useRef<any>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [playing, setPlaying] = React.useState(true);
    const [duration, setDuration] = React.useState(0);
    const [played, setPlayed] = React.useState(0);

    React.useEffect(() => {
        if (open) {
            setPlaying(true);
            setPlayed(0);
        } else {
            setPlaying(false);
        }
    }, [open]);

    const onProgress = (state: { played: number }) => setPlayed(state.played);
    const onDuration = (d: number) => setDuration(d);

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = (e.clientX - rect.left) / rect.width;
        playerRef.current.seekTo(Math.min(Math.max(frac, 0), 1), 'fraction');
    };

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPlaying(p => !p);
    };

    const toggleFullscreen = async (e: React.MouseEvent<HTMLButtonElement>) => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) await document.exitFullscreen();
        else await el.requestFullscreen();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogContent sx={{ p: 0 }}>
                <Box
                    ref={containerRef}
                    sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', bgcolor: 'black', overflow: 'hidden' }}
                >
                    <Box onClick={() => setPlaying((p) => !p)}>
                        <ReactPlayer
                            ref={playerRef}
                            url={videoUrl}
                            playing={playing}
                            muted
                            volume={0}
                            width="100%"
                            height="100%"
                            controls={false}
                            playsinline
                            progressInterval={20}
                            onProgress={onProgress}
                            onDuration={onDuration}
                            onEnded={onClose}
                            playbackRate={1}
                            config={{ file: { attributes: { preload: 'metadata', controlsList: 'nodownload noplaybackrate noremoteplayback', disablePictureInPicture: true as any } } }}
                            style={{ position: 'absolute', inset: 0 }}
                        />
                    </Box>

                    <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
                        <IconButton onClick={handlePlayPause} size="small" sx={{ color: 'text.primary' }}>
                            {playing ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>

                        <Box sx={{ height: 48, flex: 1, cursor: 'pointer' }} onClick={handleTrackClick}>
                            <Box sx={{ flex: 1, marginTop: '22px', marginBottom: '22px', height: 4, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 9999 }}>
                                <Box sx={{ width: `${(played * 100).toFixed(2)}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 9999, transition: 'width 120ms linear' }} />
                            </Box>
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 86, textAlign: 'right' }}>
                            {formatTime(played * duration)} / {formatTime(duration)}
                        </Typography>

                        <IconButton onClick={toggleFullscreen} size="small" sx={{ color: 'text.primary' }}>
                            <Fullscreen />
                        </IconButton>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
