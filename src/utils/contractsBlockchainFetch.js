import { getGlobalState } from "../store/web3Store";

const getAccesses = async (profile) => {
    ('PROFILO STORAGE', profile)
    const contract = getGlobalState('contract')
    const address = getGlobalState('connectedAccount')

    try {
      const accesses = await contract.methods.getAccesses(profile).call({
        from: address, // L'account attuale è importante per `msg.sender`
      });
  
      ('Accesses:', accesses); // Stampa gli accessi ricevuti
      return accesses; // Restituisci gli accessi
    } catch (error) {
      console.error('Error calling getAccesses:', error); // Gestione errori
    }
};

export {
    getAccesses
}
  