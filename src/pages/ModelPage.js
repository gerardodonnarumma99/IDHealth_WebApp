import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import useWebSocket, { ReadyState } from "react-use-websocket"
import { overwriteFile, getSolidDataset, getContainedResourceUrlAll, universalAccess } from '@inrupt/solid-client';
import { useRecoilState, useRecoilValue } from 'recoil';
import { profileState } from '../atom/profileState';
import { useSession } from '@inrupt/solid-ui-react';
import { measuramentQl } from '../utils/solidDataUtils';
import SparqlQueryExecutor from '../utils/sparqlQueryExecutor';
import { Grid, Paper, Stack, Divider, Button, LinearProgress, Typography, useTheme, Box } from '@mui/material';
import { set } from 'react-hook-form-mui';
import MeasurementGraph from '../components/graph/MeasurementGraph';
import { format } from 'date-fns';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import { styled } from '@mui/material/styles';
import errorState from '../atom/errorState';
import { MESSAGE_ERROR_COMMUNICATION_POD, MESSAGE_ERROR_LOAD_MODEL, MESSAGE_ERROR_RETRIVE_MEASURE } from '../utils/constants';
import { loaderState } from '../atom/loaderState';

const WEBSOCKET_URL = 'ws://localhost:8000'; // Indirizzo del server WebSocket

const ModelPage = () => {
  const [model, setModel] = useState(null);
  const { storageUrl } = useRecoilValue(profileState);
  const { session } = useSession();
  const sparqlExecutor = new SparqlQueryExecutor();
  const [measuraments, setMeasuraments] = useState([]);
  const [predict, setPredict] = useState(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [measurementsForGraph ,setMeasurementsForGraph] = useState(null)
  const theme = useTheme();
  const [error, setError] = useRecoilState(errorState);
  const [isLoading, setIsLoading] = useRecoilState(loaderState);
  const [isPermissionFS, setIsPermissionFS] = useState(false);

  // Inizializza la connessione WebSocket
  const { sendMessage, lastMessage, readyState } = useWebSocket(WEBSOCKET_URL, {
    shouldReconnect: (closeEvent) => true, // Riconnessione automatica
  });

  useEffect(() => { 
    if(!profileState) return;
    fetchMeasurementsForTrainingModel()
    getPermissionFederatedServer()
  }, [])

  useEffect(() => {
    if (lastMessage !== null) {
      const messageData = lastMessage.data;

      loadModel(messageData);
    }
  }, [lastMessage]); // Si attiva quando arriva un nuovo messaggio

  async function fetchMeasurementsForTrainingModel() {
    try {
        setIsLoading(true);

        const measuramentsContainerUrl = `${storageUrl}measuraments/`;

        const dataset = await getSolidDataset(measuramentsContainerUrl, { fetch: session.fetch })
        const measuramentUrls = getContainedResourceUrlAll(dataset)

        const listMeasuraments = new Array();

        for(const measuramentUrl of measuramentUrls) {
          const datasetMeasuament = await getSolidDataset(measuramentUrl, { fetch: session.fetch })
          const measuramentDayUrls = getContainedResourceUrlAll(datasetMeasuament)

          for(const url of measuramentDayUrls) {
            // Trova l'ultima occorrenza di '/' nell'URL
            const lastIndex = url.lastIndexOf("/");
          
            // Estrai il nome del file utilizzando substring
            const fileName = url.substring(lastIndex + 1).replace(".ttl", "");

            const response = await sparqlExecutor.executeQuery(url, measuramentQl(fileName), session.fetch);
            listMeasuraments.push(response)
          }
        }

        setMeasuraments(listMeasuraments);
        setMeasurementsDateAndValueForGraph(listMeasuraments);

    } catch (error) {
        setMeasuraments([])
        setError({
          isError: true,
          message: MESSAGE_ERROR_RETRIVE_MEASURE
        })
        ('Errore', error)
    } finally {
        setIsLoading(false);
    }
  }

  const loadModel = async (messageData) => {
    try {
      const modelJson = JSON.parse(messageData); // Cerca di analizzare il JSON
      const model = await tf.models.modelFromJSON(modelJson); // Carica il modello
      setModel(model);
    } catch (error) {
      console.error("Error parsing message data:", error); // Gestione degli errori
      setError({
        isError: true,
        message: MESSAGE_ERROR_LOAD_MODEL
      })
    }
  };

  const trainModel = async () => {
    if (model) {
      setPredict(null);
      setIsLoading(true);
      // Converti i valori glicemici in numeri
      const glucoseValues = measuraments.map((m) => parseFloat(m.value));

      // Converti le date in timestamp
      const timestamps = measuraments.map((m) => new Date(m.dateTime).getTime());

      // Crea i tensor per addestrare il modello
      const xs = tf.tensor2d(timestamps, [timestamps.length, 1]); // Tutti i timestamp
      const ys = tf.tensor2d(glucoseValues, [glucoseValues.length, 1]); // Tutti i valori glicemici

      await model.compile({ optimizer: "adam", loss: 'meanSquaredError' });
      await model.fit(xs, ys, { epochs: 10 });

      const weights = model.getWeights().map(w => ({ data: w.arraySync(), shape: w.shape }));
      
      // Salva nel Solid POD dell'utente
      const timestamp = new Date().toISOString();
      await saveModelToPod(storageUrl, weights, timestamp);
      setIsLoading(false);
    }
  };

  const predictValue = () => {
    // Supponiamo di voler prevedere il valore glicemico per un nuovo timestamp
    const nuovoTimestamp = new Date().getTime(); // Converti in timestamp Unix

    // Crea un tensor con il nuovo timestamp
    const nuovoInput = tf.tensor2d([nuovoTimestamp], [1, 1]);

    // Usa il modello per prevedere il valore glicemico per questo timestamp
    const previsione = model.predict(nuovoInput);

    // Ottieni il valore previsto
    const valorePrevisto = previsione.dataSync()[0]; // Ricorda che i risultati sono tensor, quindi usa .dataSync() per estrarre il dato

    setPredict(parseFloat(valorePrevisto.toFixed(2)));
  }

  // Funzione per creare un dataset con pesi e data di modifica
  const saveModelToPod = async (podUrl, modelWeights, timestamp) => {
    const jsonContent = JSON.stringify(modelWeights); // Serializza in stringa JSON
    
    const dateTime = new Date().toISOString();
    const filePath = `${podUrl}model/${dateTime}.json`;

    // Salva il file JSON nel Solid POD
    const file = new Blob([jsonContent], { type: 'application/json' }); // Crea un Blob JSON
    await overwriteFile(filePath, file, { fetch: session.fetch }); // Sovrascrive se esiste, o crea nuovo

    // Invia un messaggio WebSocket (puoi inviare dati o notifiche al server)
    sendMessage(JSON.stringify({ action: 'weightsSaved', timestamp, endpoint: filePath, storageUrl }));
  };

  const setMeasurementsDateAndValueForGraph = (listMeasuraments) => {
    if(!listMeasuraments || listMeasuraments.length === 0) return;

    const measurementsDateTime = listMeasuraments.map((measure) => {
      const date = new Date(measure.dateTime)

      return format(date, "yyyy/MM/dd hh:mm:ss a");
    })
    
    const measurementsValue = listMeasuraments.map((measure) => parseFloat(measure.value))

    setMeasurementsForGraph({
      dateTimes: measurementsDateTime,
      values: measurementsValue
    })
  }

  const getPermissionFederatedServer = async () => {

    try {
        setIsLoading(true);
        const resource = `${storageUrl}/model`;

        const agentsAccess = await universalAccess.getAgentAccessAll(resource, { fetch: session.fetch })

        const webIdsAcl = Object.keys(agentsAccess);

        setIsPermissionFS()
        for(const webId of webIdsAcl) {
          if(webId === process.env.REACT_APP_WEB_ID_FEDERATED_SERVER) {
            setIsPermissionFS(true)
          }
        }
    } catch(error) {
        setError({
            isError: true,
            message: MESSAGE_ERROR_COMMUNICATION_POD
        })
    } finally {
        setIsLoading(false);
    }
  }

  const handleRevoceAccessFederatedServer = async () => {
    try {
      const resource = `${storageUrl}/model`;
        
      await universalAccess.setAgentAccess(
        resource, 
        process.env.REACT_APP_WEB_ID_FEDERATED_SERVER, 
        { read: false, write: false },
        { fetch: session.fetch }
      );

      setIsPermissionFS(false);
    } catch(error) {
        setError({
            isError: true,
            message: MESSAGE_ERROR_COMMUNICATION_POD
        })
    } finally {
        setIsLoading(false);
    }
  }

  const handleAddPermissionFederatedServer = async () => {
    try {
        setIsLoading(true);
        const resource = `${storageUrl}/model`;

        await universalAccess.setAgentAccess(
            resource, 
            process.env.REACT_APP_WEB_ID_FEDERATED_SERVER, 
            { read: true, write: false},
            { fetch: session.fetch });

        setIsPermissionFS(true)

    } catch(error) {
        setError({
            isError: true,
            message: MESSAGE_ERROR_COMMUNICATION_POD
        })
    } finally {
        setIsLoading(false);
    }
}

  const connectionStatus = {
    [WebSocket.CONNECTING]: 'Connecting',
    [WebSocket.OPEN]: 'Open',
    [WebSocket.CLOSING]: 'Closing',
    [WebSocket.CLOSED]: 'Closed',
  }[readyState];


  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          justifyContent: "center"
        }}>
          <Stack
            direction="column"
            justifyContent="center"
            alignItems="center"
            spacing={2}
          >
            <Stack><ModelTrainingIcon sx={{ color: theme.palette.primary.dark, fontSize: 55}} /></Stack>
            <Stack>
              <Typography align="center" variant="h6" color="primary" gutterBottom>Blood Glucose Prediction Model</Typography>
            </Stack>
            <Stack>
              <Typography gutterBottom>Connection to Federated Server: <i>{connectionStatus}</i></Typography>
            </Stack>
            <Stack>
              <Typography gutterBottom>Current Glycemic Prediction: <i>{predict ? predict : 'no present prediction'}</i></Typography>
            </Stack>
            <Stack
              direction="row"
              divider={<Divider orientation="vertical" flexItem />}
              spacing={2}
            >
              <Button color="primary" variant="contained" onClick={trainModel} disabled={!model || !isPermissionFS}>Train Model</Button>
              <Button color="primary" variant="contained" onClick={predictValue} disabled={!model || !isPermissionFS}>Predict Value</Button>
            </Stack>
            <Stack
              direction="row"
              divider={<Divider orientation="vertical" flexItem />}
              spacing={2}
            >
              <Button color="primary" variant="contained" onClick={handleAddPermissionFederatedServer} disabled={isPermissionFS}>Give Permissions to Federated Server</Button>
              <Button color="primary" variant="contained" onClick={handleRevoceAccessFederatedServer} disabled={!isPermissionFS}>Revoke Permissions to Federated Server</Button>
            </Stack>
          </Stack>
        </Paper>
      </Grid>
      {measurementsForGraph && 
        (<Grid item xs={12}>
            <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    alignItems: "center",
                    height: 500
                  }}>
                    <MeasurementGraph 
                      axisData={{
                        labels: measurementsForGraph.dateTimes, //[...measurements.time], // Esempio di etichette temporali
                        datasets: [
                            {
                              label: 'Trend of measured glycemic values (mg/dl)',
                              data: measurementsForGraph.values,
                              borderColor: 'rgb(255, 99, 132)',
                              backgroundColor: 'rgba(255, 99, 132, 0.5)'
                            }
                        ],
                      }} />
              </Paper>
          </Grid>)}
          <Grid item xs={12} />
    </Grid>
  );
};

export default ModelPage;
