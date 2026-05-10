import React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';

const DataTable = ({ children, sx }) => (
  <TableContainer
    component={Paper}
    elevation={0}
    sx={{
      mt: 2,
      bgcolor: 'background.paper',
      ...sx,
    }}
  >
    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>{children}</Table>
  </TableContainer>
);

export default DataTable;
