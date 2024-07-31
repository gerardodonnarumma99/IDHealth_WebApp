import { Grid } from "@mui/material";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import MeasuramentDataTable from "../components/measurament/MeasuramentDataTable";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useRecoilState, useRecoilValue } from "recoil";
import { profileState } from "../atom/profileState";
import { useSession } from "@inrupt/solid-ui-react";
import { measuramentQl } from "../utils/solidDataUtils";
import { getSolidDataset, getContainedResourceUrlAll, deleteFile } from "@inrupt/solid-client";
import SparqlQueryExecutor from "../utils/sparqlQueryExecutor";
import { loaderState } from "../atom/loaderState";

const MeasuramentsPage = () => {
    const profile = useRecoilValue(profileState);
    const { session } = useSession();
    const [dateValue, setDateValue] = useState(dayjs());
    const [measuraments, setMeasuraments] = useState([]);
    const sparqlExecutor = new SparqlQueryExecutor();
    const [isLoading, setIsLoading] = useRecoilState(loaderState);

    useEffect(() => { 
        if(!profile) return;
        
        fetchMeasurementsForDay() 
    }, [dateValue]);

    async function fetchMeasurementsForDay() {
        try {
            setIsLoading(true);

            const measuramentUrl = `${profile.storageUrl}measuraments/${dayjs(dateValue).format("YYYY-MM-DD")}`;

            const dataset = await getSolidDataset(measuramentUrl, { fetch: session.fetch })
            const resourceUrls = getContainedResourceUrlAll(dataset)

            const results = [];
            for (const url of resourceUrls) {
                // Trova l'ultima occorrenza di '/' nell'URL
                const lastIndex = url.lastIndexOf("/");
            
                // Estrai il nome del file utilizzando substring
                const fileName = url.substring(lastIndex + 1).replace(".ttl", "");

                const response = await sparqlExecutor.executeQuery(url, measuramentQl(fileName), session.fetch);
                results.push({
                    ...response,
                    fileUrl: `${measuramentUrl}/${fileName}.ttl`
                });
            }

            setMeasuraments(results);
        } catch (error) {
            if(error.response.status === 404) {
                setMeasuraments([]);
            }
        } finally {
            setIsLoading(false);
        }
    }

    const handleDeleteMeasurament = async (measurament) => {
        await deleteFile(measurament.fileUrl, { fetch: session.fetch });
        fetchMeasurementsForDay();
    }

    return (
        <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="flex-start"
            spacing={2} >
                <Grid item xs={12} alignItems="flex-end">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker 
                            sx={{ backgroundColor: '#FFF', borderRadius: 1 }}
                            label="Basic date picker" 
                            value={dateValue} 
                            onChange={(newValue) => setDateValue(newValue)} />
                    </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                    <MeasuramentDataTable data={measuraments} handleDelete={handleDeleteMeasurament} />
                </Grid>
      </Grid>
    )
}

export default MeasuramentsPage;