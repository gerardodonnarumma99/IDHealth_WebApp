import { createSolidDataset, createThing, setThing, saveSolidDatasetAt, getSolidDataset } from '@inrupt/solid-client';
import { getSession } from '@inrupt/solid-client-authn-browser';

const uploadDataToPod = async (webId, dataToUpload) => {
  try {
    // Ottenere la sessione corrente
    const session = getSession();
    
    // Assicurarsi che l'utente sia autenticato
    if (session && session.isLoggedIn) {
      // Creare un nuovo dataset Solid
      const newDataset = createSolidDataset();

      // Creare una "cosa" (oggetto RDF) nel dataset
      const newDataThing = createThing({ url: `${webId}#newThing` });

      // Aggiungere i dati all'oggetto
      // Ad esempio, se i dati da caricare sono un testo, puoi utilizzare:
      // addStringNoLocale(newDataThing, yourDataPropertyName, dataToUpload);
      
      // Aggiungere l'oggetto al dataset
      const updatedDataset = setThing(newDataset, newDataThing);

      // Salvare il dataset nel pod
      const updatedPodDataset = await saveSolidDatasetAt(`${webId}`, updatedDataset, { fetch: session.fetch });

      ('Dati caricati con successo nel pod:', updatedPodDataset);

      // Puoi anche recuperare i dati dal pod successivamente
      const podDataset = await getSolidDataset(`${webId}`, { fetch: session.fetch });
      ('Dati recuperati dal pod:', podDataset);

    } else {
      console.error('L\'utente non è autenticato.');
    }
  } catch (error) {
    console.error('Errore durante il caricamento dei dati nel pod:', error);
  }
};

// Utilizzo della funzione
const webId = 'https://id.inrupt.com/username'; // Sostituire con il tuo webId
const dataToUpload = 'Questi sono i dati che voglio caricare nel pod.';
uploadDataToPod(webId, dataToUpload);
