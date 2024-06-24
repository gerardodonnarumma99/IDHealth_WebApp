import React, { useEffect } from "react"
import MUIDataTable from "mui-datatables";
import { IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';

const options = {
    filterType: 'checkbox',
    selectableRows: false
};

function MeasuramentDataTable({ data, handleDelete, isDelete = true }) {
    const columns = [
        {
            name: "deleteButton",
            label: " ",
            options: {
             filter: false,
             sort: false,
             empty: true,
             display: !isDelete ? 'excluded' : true,
             setCellProps: () => ({
                style: {
                  width: '10px'
                }
            }),
             customBodyRender: (value, tableMeta) => (
                <IconButton aria-label="delete" onClick={() => handleDelete(data[tableMeta.rowIndex])}>
                    <DeleteIcon />
                </IconButton>
             )
            }
        },
        {
            name: "fileUrl",
            label: "fileUrl",
            options: {
                filter: true,
                sort: false,
                display: 'excluded' // Imposta la colonna come non visibile
            }
        },
        {
            name: "value",
            label: "Blood Glucose (mg/dl)",
            options: {
                filter: true,
                sort: true,
                setCellProps: () => ({
                    style: {
                      width: '200px',
                      textAlign: 'center'
                    }
                }),
                customBodyRender: (value, tableMeta) => (`${value} mg/dl`)
            }
        },
        {
            name: "dateTime",
            label: "Date",
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta) => {
                    const date = new Date(value)

                    return format(date, "yyyy/MM/dd hh:mm:ss a");
                }
            }
        }
    ];

    return (
        <MUIDataTable
            title={"Measuraments"}
            data={data}
            columns={columns}
            options={options}
            style={{ with: "100%" }}
        />
    );
}

export default MeasuramentDataTable;
