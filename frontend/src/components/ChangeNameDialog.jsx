import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { iconOutlinedSoft, iconPrimaryFilled, iconPrimaryFilledDisabled } from '../utils/iconSx';

const ChangeNameDialog = ({
  open,
  onClose,
  initialName,
  onSave,
  busy,
  title = 'Đổi tên hiển thị',
}) => {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(typeof initialName === 'string' ? initialName : '');
      setLocalError('');
    }
  }, [open, initialName]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next) {
      setLocalError('Nhập tên hiển thị');
      return;
    }
    onSave(next);
    onClose();
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="change-name-title">
      <form onSubmit={handleSubmit}>
        <DialogTitle id="change-name-title">{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {localError ? <Alert severity="error">{localError}</Alert> : null}
            <TextField
              autoFocus
              fullWidth
              label="Tên hiển thị"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Tooltip title="Hủy">
            <IconButton type="button" size="small" onClick={onClose} disabled={busy} aria-label="Hủy" sx={iconOutlinedSoft}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lưu">
            <IconButton
              type="submit"
              size="small"
              disabled={busy}
              aria-label="Lưu"
              sx={{ ...iconPrimaryFilled, ...iconPrimaryFilledDisabled }}
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangeNameDialog;
