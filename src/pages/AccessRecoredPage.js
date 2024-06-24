import { Grid } from "@mui/material";
import AccessRecoredDataTable from "../components/access_recorder/AccessRecoredDataTable";
import { useEffect, useState } from "react";
import { getGlobalState } from "../store/web3Store";
import { useRecoilValue } from "recoil";
import { profileState } from "../atom/profileState";
import { getAccesses } from "../utils/contractsBlockchainFetch";

const AccessRecoredPage = () => {
    const [access, setAccess] = useState();
    const profile = useRecoilValue(profileState);

    useEffect(() => {
        handleAccessEvent()
    }, [])

    useEffect(() => {
        fetchAccess(profile.storageUrl);
    }, [profile])

    const handleAccessEvent = () => {
        const contract = getGlobalState('contract')

        contract.events.PodAccessRecorded().on('data', async (data) => {
            if(data.returnValues.podUrl === profile.storageUrl) {
                fetchAccess(profile.storageUrl);
            }
            ('OK EVENTO', data.returnValues)
        })
    }

    const fetchAccess = async (storageUrl) => {
        if(!storageUrl) return;

        const response = await getAccesses(storageUrl);
        const accessMapped = response.map(item => {
            ('itemmmmmmmmm', item)
            // Crea un oggetto Date utilizzando il timestamp
            //const date = new Date(Number(item.timestamp) * 1000); // eslint-disable-line

            // Formatta la data
            //const formattedDate = date.toLocaleString();
            return { server: item.server, timestamp: '2024-05-30 21:05:46'}
        })
        setAccess(accessMapped);
    }

    return (
        <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="flex-start"
            spacing={2} >
                <Grid item xs={12}>
                    <AccessRecoredDataTable data={access} />
                </Grid>
      </Grid>
    )
}

export default AccessRecoredPage;