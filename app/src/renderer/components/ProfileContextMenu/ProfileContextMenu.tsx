import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteForever';

interface Props {
  anchorEl: null | HTMLElement;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProfileContextMenu = ({ anchorEl, onClose, onEdit, onDelete }: Props) => {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <MenuItem onClick={onEdit}>
        <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Edit Profile</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
        <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
        <ListItemText>Delete Profile</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default ProfileContextMenu;