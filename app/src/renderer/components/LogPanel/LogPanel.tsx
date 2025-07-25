import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface Log {
  level: 'Information' | 'Warning' | 'Error';
  message: string;
  timestamp?: string;
}

interface LogPanelProps {
  logs: Log[];
}

const LogPanel = ({ logs }: LogPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (level: Log['level']) => {
    switch (level) {
      case 'Error': return 'error.main';
      case 'Warning': return 'warning.main';
      default: return 'text.secondary';
    }
  };

  return (
    <Paper 
        variant="outlined" 
        sx={{ 
            p: 2, 
            bgcolor: 'rgba(0,0,0,0.2)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}
    >
      <Typography variant="h6" sx={{ mb: 1, flexShrink: 0 }}>Logs</Typography>
      <Box 
        ref={scrollRef}
        sx={{ 
            overflowY: 'auto', 
            fontFamily: 'monospace', 
            fontSize: '0.875rem', 
            flexGrow: 1,
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.1)' },
            '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' },
            '&::-webkit-scrollbar-thumb:hover': { background: '#555' }
        }}
      >
        {logs.map((log, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2 }}>
            <Typography component="span" sx={{ color: getLogColor(log.level), flexShrink: 0 }}>
              [{log.level.toUpperCase()}]
            </Typography>
            <Typography component="span" sx={{ color: 'text.primary', wordBreak: 'break-all' }}>
              {log.message}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default LogPanel;