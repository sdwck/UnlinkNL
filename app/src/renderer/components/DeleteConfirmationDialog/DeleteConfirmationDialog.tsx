import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box } from '@mui/material';

interface Props {
  open: boolean;
  title: string;
  confirmString: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationDialog = ({ open, title, confirmString, onClose, onConfirm }: Props) => {
  const [input, setInput] = useState('');
  const isConfirmed = input === confirmString;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ color: 'error.main' }}>{title}</DialogTitle>
      <DialogContent>
        <Typography>This action cannot be undone. To confirm, please type "<Box component="span" fontWeight="bold" color="text.primary">{confirmString}</Box>" in the box below.</Typography>
        <TextField
          autoFocus
          margin="dense"
          fullWidth
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={confirmString}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={!isConfirmed}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;