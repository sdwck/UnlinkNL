import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteForever';
import { PlayArrow } from '@mui/icons-material';

interface Props {
  anchorEl: null | HTMLElement;
  onClose: () => void;
  isAutoCopyEnabled: boolean | null;
  onAutoCopy?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProfileContextMenu = ({ anchorEl, onClose, isAutoCopyEnabled, onAutoCopy, onEdit, onDelete }: Props) => {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose} PaperProps={{
      sx: {
        backgroundColor: '#000',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        '& .MuiList-root': {
          padding: 0
        }
      },
    }}>
      <MenuItem disabled={onAutoCopy === null ? true : false} onClick={onAutoCopy} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' }, paddingTop: '8px', paddingBottom: '8px' }}>
        <ListItemIcon><PlayArrow fontSize="small" /></ListItemIcon>
        <ListItemText>{isAutoCopyEnabled ? 'Without Auto-Copy' : 'Auto-Copy'}</ListItemText>
      </MenuItem>
      <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.12)', margin: '0 !important' }} />
      <MenuItem onClick={onEdit} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' }, paddingTop: '8px', paddingBottom: '8px' }}>
        <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Edit Profile</ListItemText>
      </MenuItem>
      <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.12)', margin: '0 !important' }} />
      <MenuItem onClick={onDelete} sx={{ color: 'error.main', '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.15)' }, paddingTop: '8px', paddingBottom: '8px' }}>
        <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
        <ListItemText>Delete Profile</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default ProfileContextMenu;