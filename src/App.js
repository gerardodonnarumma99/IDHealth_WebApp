import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import AuthProvider from "./hooks/auth/AuthProvider";
import PrivateRoute from "./router/route";
import LoginPage from "./pages/LoginPage";
import { SessionProvider, useSession } from "@inrupt/solid-ui-react";
import { useEffect } from "react";
import { logout } from "@inrupt/solid-client-authn-browser";
import { TextField } from "@mui/material";
import MenuDrawer from "./components/MenuDrawer";
import { RecoilRoot, useRecoilState, useRecoilValue } from "recoil";
import ProfilePage from "./pages/ProfilePage";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import errorState from "./atom/errorState";
import MeasuramentsPage from "./pages/MeasuramentsPage";
import FullScreenLoader from "./components/loader/FullScreenLoader";
import { loaderState } from "./atom/loaderState";
import ModelPage from "./pages/ModelPage";
import contractData from "./abi/PodAccessLogger.json"
import Web3 from "web3";
import accountBlockchainState from "./atom/accountBlockchainState"
import { setGlobalState } from "./store/web3Store";
import { profileState } from "./atom/profileState";
import { getAccesses } from "./utils/contractsBlockchainFetch";
import AccessRecoredPage from "./pages/AccessRecoredPage";
import PermissionPage from "./pages/PermissionPage";
import { DOCTOR_ROLE, NS_PIM_SPACE_STORAGE, PATIENT_ROLE, VCARD_PREDICATE } from "./utils/constants";
import { profileQl } from "./utils/solidDataUtils";
import { getSolidDataset, getThing, getStringNoLocale, getUrlAll, getUrl, getFile, getContainedResourceUrlAll, hasAccessibleAcl, getNamedNode } from "@inrupt/solid-client";
import SparqlQueryExecutor from "./utils/sparqlQueryExecutor";

function App() {
  const { session } = useSession();
  const [error, setError] = useRecoilState(errorState);
  const [accountBlockchain, setAccountBlockchain] = useRecoilState(accountBlockchainState);
  const [isLoading, setIsLoading] = useRecoilState(loaderState);
  const [profile, setProfile] = useRecoilState(profileState);
  const sparqlExecutor = new SparqlQueryExecutor();

  useEffect(() => {
    loadWeb3()
  }, [])

  useEffect(() => {
    ('sessione cambiata isLoggedIn', session.info.isLoggedIn)
    ('sessione cambiata', session)

    if(!session || !session?.info?.isLoggedIn) return;
  }, [session])

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

        if(!role || ![PATIENT_ROLE, DOCTOR_ROLE].includes(role)) {
          await logout();
        }

        setProfile({
          name: profileInfo.name,
          email: profileInfo.email.replace("mailto:", ""),
          storageUrl: pod,
          role: role
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

    const profileThing = getThing(dataset, id);
    const role = getStringNoLocale(profileThing, `${VCARD_PREDICATE}role`);

    return role;
  }

  const loadWeb3 = async () => {
    if(!window.ethereum && !window.ethereum.isMetaMask) return; //Controllo se Metamask è installato e attivo

    window.web3 = new Web3(window.ethereum)
    const web3 = window.web3

    const contract = new web3.eth.Contract(
      contractData.abi, 
      contractData.networks['5777'].address
    )

    const accounts = await web3.eth.getAccounts()
    setGlobalState('connectedAccount', accounts[0])
    setGlobalState('contract', contract)

    contract.events.PodAccessRecorded().on('data', data => ('OK EVENTO', data.returnValues))
  }

  useEffect(() => {
    if(profile.storageUrl) {
      associateAccountBlockchainToPod(profile.storageUrl)
    }
  },[profile])

  const associateAccountBlockchainToPod = async (profile) => {
      await getAccesses(profile);
  }

  useEffect(() => {
    if(error.isError) {
      toast(error.message, { type: "error" })
      setError({
        isError: false,
        message: ""
      })
    }
  }, [error])

  return (
    <div className="App">
      <FullScreenLoader isOpen={isLoading} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Router>
        <SessionProvider>
            <MenuDrawer>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<PrivateRoute />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/measurements" element={<MeasuramentsPage />} />
                  <Route path="/model" element={<ModelPage />} />
                  <Route path="/access" element={<AccessRecoredPage />} />
                  <Route path="/permits" element={<PermissionPage />} />
                </Route>
                {/* Other routes */}
              </Routes>
            </MenuDrawer>
        </SessionProvider>
      </Router>
    </div>
  );
}

export default App;