import React, { useEffect, useState } from "react";
import { LogoutButton, useSession } from "@inrupt/solid-ui-react";
import { getSolidDataset, getThing, getStringNoLocale, getUrlAll, getUrl, getFile, getContainedResourceUrlAll, hasAccessibleAcl, getNamedNode } from "@inrupt/solid-client";
import { QueryEngine } from "@comunica/query-sparql-solid";
import { DOCTOR_ROLE, FOAF_PREDICATE, MESSAGE_ERROR_UNAUTHORIZED, NS_PIM_SPACE_STORAGE, PATIENT_ROLE, VCARD_PREDICATE } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import { Button, Grid, Link, Paper, Skeleton, Stack, Typography, useTheme } from "@mui/material";
import SparqlQueryExecutor from "../utils/sparqlQueryExecutor";
import { useRecoilState } from "recoil";
import errorState from "../atom/errorState";
import { profileState } from "../atom/profileState";
import { patientState } from "../atom/patientState";
import { getPatientInfo, measuramentQl, patientQl, profileQl, saveFile } from "../utils/solidDataUtils";
import MeasuramentModal from "./measurament/MeasuramentModal";
import dayjs from "dayjs";
import { getMeasuramentTurtle } from "../utils/turtleInfo";
import { v4 as uuidv4 } from 'uuid';
import { loaderState } from "../atom/loaderState";
import { toast } from "react-toastify";
import { associatePod, podHasOwner } from "../utils/contractsBlockchainFetch";
import accountBlockchainState from "../atom/accountBlockchainState";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import DashboardDoctor from "./DashboardDoctor";
import { logout } from "@inrupt/solid-client-authn-browser";

const Dashboard = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || null)
  const [error, setError] = useRecoilState(errorState);
  const [profile, setProfile] = useRecoilState(profileState);
  const [patient, setPatient] = useRecoilState(patientState);
  const [openGlucoseModal, setOpenGlucoseModal] = useState(false);
  const [isLoading, setIsLoading] = useRecoilState(loaderState);
  const [totalMeasure, setTotalMeasure] = useState(null);
  const theme = useTheme();

  const sparqlExecutor = new SparqlQueryExecutor();

  useEffect(() => {
    fetchProfileInfo(session.info.webId)
  }, [session])

  useEffect(() => {
    if(profile && profile?.storageUrl) {
      fetchPatientInfo(profile.storageUrl, session.info.webId, session.fetch);
      if(profile.role === PATIENT_ROLE) {
        fetchCountMeasure(profile.storageUrl, session.fetch);
      }
    }
  }, [profile])

  const fetchProfileInfo = async (webId) => {
    try {
        setIsLoading(true);
        // Ottieni il dataset Solid associato al WebID
        const dataset = await getSolidDataset(webId, session.fetch);
        ('dataset', dataset)
    
        // Ottieni la cosa (resource) del profilo
        const profileThing = getThing(dataset, webId);

        const podsUrls = getUrlAll(
            profileThing,
            NS_PIM_SPACE_STORAGE
        );
        const pod = podsUrls[0];

        const profileInfo = await sparqlExecutor.executeQuery(`${pod}profile`, profileQl(pod), session.fetch);
        ('Info Profilo', profileInfo)

        const role = await getRole(pod, webId)

        ('RUOLO', role)

        if(!role || (role && ![PATIENT_ROLE, DOCTOR_ROLE].includes(role.trim().toLowerCase()))) {
          setError({
            isError: true,
            message: MESSAGE_ERROR_UNAUTHORIZED
          })
          await logOut();
        }

        setProfile({
          name: profileInfo.name,
          email: profileInfo.email.replace("mailto:", ""),
          storageUrl: pod,
          role: role.trim().toLowerCase()
        })
  
    } catch (error) { 
      console.error("Errore nel recupero del profilo:", error.message);
      setError({
        isError: true,
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRole = async (pod, id) => {
    const dataset = await getSolidDataset(`${pod}profile`, {fetch: session.fetch });

    const profileThingX = getThing(dataset, id);
    const role = getStringNoLocale(profileThingX, `${VCARD_PREDICATE}role`);

    return role;
  }

  const logOut = async () => {
    await logout();
    localStorage.removeItem("session");
    navigate("/login");
  };

  async function fetchPatientInfo(storageUrl, webId, sessionFetch) {
    try {
      setIsLoading(true);
      const patientFolderUrl = `${storageUrl}/patient/Patient.ttl`
      const isExisting = await getFile(patientFolderUrl, { fetch: session.fetch });

      if(!isExisting) return false;

      const patient = await getPatientInfo(storageUrl, webId, sessionFetch);
      ('Dati del paziente recuperati', patient)
      setPatient({ ...patient })

      return patient;
    } catch (error) {
      setError({
        isError: true,
        message: error.message
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  const fetchCountMeasure = async (storageUrl, fetch) => {
    try {
      setIsLoading(true);
      let totalCount = 0;
      const measuramentUrl = `${storageUrl}measuraments`;
      ('URL MEASURAMENTS', measuramentUrl)

      const dataset = await getSolidDataset(measuramentUrl, { fetch })

      const containedResourceUrls = getContainedResourceUrlAll(dataset, { fetch });

      for(const containedResourceUrl of containedResourceUrls) {
        const datasetDayMeasure = await getSolidDataset(containedResourceUrl, { fetch })
        const containedResourceDayMeasure = getContainedResourceUrlAll(datasetDayMeasure, { fetch });
        totalCount += containedResourceDayMeasure.length;
      }

      ('COUNT MEASURE', totalCount)
      setTotalMeasure(totalCount);
    } catch(error) {
      ('Errore', error)
      setError({
        isError: true,
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveMeasurament = async (quantity) => {
    try {
      setIsLoading(true);
      const currentDate = dayjs();

      const currentDateFormatter = currentDate.format('YYYY-MM-DD');
      const idMeasurament = uuidv4();
      const measurament = {
        id: idMeasurament,
        patientId: session.info.webId,
        effectiveDateTime: currentDate.format('YYYY-MM-DDTHH:mm:ss[Z]'),
        quantity: quantity
      }
      const measuramentTurtle = getMeasuramentTurtle(measurament);
      await saveFile(`${profile.storageUrl}/measuraments/${currentDateFormatter}/${idMeasurament}.ttl`, measuramentTurtle, session.fetch);
      toast("Measurement entered successfully!", { type: "success" })
    } catch(error) {
      (error)
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {openGlucoseModal && (<MeasuramentModal open={openGlucoseModal} handleClose={() => setOpenGlucoseModal(false)} handleSave={handleSaveMeasurament}/>)}
      <Grid container spacing={3}>
        <Grid item xs={12} md={profile && profile.role === PATIENT_ROLE ? 6 : 12}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: 270,
                justifyContent: "center"
              }}>
                <Stack
                  direction="column"
                  justifyContent="center"
                  alignItems="center"
                  spacing={2}
                >
                  <Stack><AssignmentIndIcon sx={{ color: theme.palette.primary.dark, fontSize: 55}} /></Stack>
                  <Stack>
                    <Typography align="center" variant="h6" color="primary" gutterBottom> Welcome {profile && (profile.name)}!</Typography>
                  </Stack>
                  <Stack>
                    {isLoading ? (<Skeleton animation="wave"></Skeleton>)
                    : (<Typography gutterBottom><strong>WebId:</strong> <i>{session && (session.info.webId)}</i></Typography>)}
                  </Stack>
                  <Stack>
                    {isLoading ? (<Skeleton animation="wave"></Skeleton>)
                    : (<Typography gutterBottom><strong>Email:</strong> <i>{session && (profile.email)}</i></Typography>)}
                  </Stack>
                  {!patient && profile.role === PATIENT_ROLE &&
                    (<Stack><Typography>To use the application <Link onClick={() => navigate("/profile")}>set up your profile</Link></Typography></Stack>)}
                </Stack>
          </Paper>
        </Grid>
        {profile && profile.role === PATIENT_ROLE &&
        (<Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: 270,
              justifyContent: "center"
            }}>
              <Stack
                direction="column"
                justifyContent="center"
                alignItems="center"
                spacing={2}
              >
                <Stack><VolunteerActivismIcon sx={{ color: theme.palette.primary.dark, fontSize: 55}} /></Stack>
                <Stack>
                  <Typography align="center" variant="h6" color="primary" gutterBottom>Total Measurements</Typography>
                </Stack>
                <Stack>
                  <Typography variant="h4" gutterBottom>{isLoading ? <Skeleton /> : totalMeasure}</Typography>
                </Stack>
                {patient && profile.role  === PATIENT_ROLE && ((<Stack><Button variant="contained" onClick={() => setOpenGlucoseModal(true)}> Add Measurement</Button></Stack>) )}
              </Stack>
          </Paper>
        </Grid>)}
        {profile.role === DOCTOR_ROLE && (<Grid item xs={12}><DashboardDoctor /></Grid>)}
      </Grid>
    </>
  );
};

export default Dashboard;