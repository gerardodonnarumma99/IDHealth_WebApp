import React from "react"
import MUIDataTable from "mui-datatables";
import { IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from "date-fns";

const options = {
    filterType: 'checkbox',
    selectableRows: false
};

function AccessRecoredDataTable({ data }) {
    const columns = [
        {
            name: "server",
            label: "Public Address Federated Server",
            options: {
                filter: false,
                sort: false,
                setCellProps: () => ({
                    style: {
                      width: '350px'
                    }
                }),
            }
        },
        {
            name: "timestamp",
            label: "Date Time",
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
            title={"Access Log"}
            data={data}
            columns={columns}
            options={options}
            style={{ with: "100%" }}
        />
    );
}

export default AccessRecoredDataTable;
