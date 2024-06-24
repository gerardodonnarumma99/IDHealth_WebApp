import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function MeasuramentModal({ open, handleClose, handleSave }) {
  return (
    <React.Fragment>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        PaperProps={{
          component: 'form',
          onSubmit: (event) => {
            event.preventDefault();
            const glucoseValue = event.target.elements.glucose.value;
            handleSave(glucoseValue);
            handleClose();
          },
        }}
      >
        <DialogTitle>Glucose</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Add glycemic value
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="glucose"
            name="glucose"
            label="Glucose (md/dl)"
            type="number"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Subscribe</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}