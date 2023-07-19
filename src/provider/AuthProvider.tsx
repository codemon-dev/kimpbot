import React, {useEffect, useMemo, useRef, useState} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../App"
import { useStore } from '../hooks/useStore';
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth, UserCredential } from "firebase/auth";
import { Analytics, getAnalytics } from "firebase/analytics";
import { doc, collection, addDoc, setDoc, getFirestore, Firestore, getDoc } from 'firebase/firestore/lite'
import { IEnvInfo } from "../../interface/IEnvInfo";
import { IPC_CMD } from "../../constants/ipcCmd";
import { IUserInfo } from "../../interface/IUserInfo";
import { STORE_KEY } from '../../constants/storeKey';
import { ExchangeAccountInfo } from "../../db/schemas/ExchangeAccountInfo";
import { EXCHANGE } from "../../constants/enum";


export const AuthProvider = ({ children }: any) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { envIfo }: any = useStore();
    const [token, setToken] = useState<any>(null);
    const [userInfo, setUserInfo] = useState<IUserInfo | null>(null);
    const [exchangeAccountInfos, setExchangeAccountInfos] = useState<ExchangeAccountInfo[]>([])

    const firebaseApp = useRef<FirebaseApp | undefined>();
    const firebaseAuth = useRef<Auth | undefined>();
    const firestore = useRef<Firestore | undefined>();
    const analytics = useRef<Analytics | undefined>();

    useEffect(() => {
      window.Main.getEnvInfo();
      window.Main.on(IPC_CMD.GET_ENV_INFO, getEnvInfoCallback);
      window.Main.on(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, notifyExchangeAccountInfoCallback);
      return () => {
        window.Main.off(IPC_CMD.GET_ENV_INFO, getEnvInfoCallback);
        window.Main.off(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, notifyExchangeAccountInfoCallback);
      }
    }, [envIfo]);

    const notifyExchangeAccountInfoCallback = async (exchangeAccountInfos: ExchangeAccountInfo[]) => {
        let upbitInfo: ExchangeAccountInfo[] = []
        let binanceInfo: ExchangeAccountInfo[] = []
        let bybitInfo: ExchangeAccountInfo[] = []
        console.log("exchangeAccountInfos: ", exchangeAccountInfos)
        exchangeAccountInfos.forEach((info: ExchangeAccountInfo) => {
            if (info.exchange === EXCHANGE.UPBIT) {
                upbitInfo.push(info);
            } else if (info.exchange === EXCHANGE.BINANCE) {
                binanceInfo.push(info);
            }else if (info.exchange === EXCHANGE.BYBIT) {
                bybitInfo.push(info);
            }
        })
        let newInfos: ExchangeAccountInfo[] = []
        newInfos = newInfos.concat(upbitInfo)
        newInfos = newInfos.concat(binanceInfo)
        newInfos = newInfos.concat(bybitInfo)
        setExchangeAccountInfos([...newInfos]);
    }

    const getEnvInfoCallback = async (envIfo: IEnvInfo) => {
      // Initialize Firebase
      let firebaseConfig = {
        apiKey: "AIzaSyDLzHQcAd4Avgs7dCS7Dlf5q2BHhRa-jCo",
        authDomain: "kimplab-bot-de4cc.firebaseapp.com",
        projectId: "kimplab-bot-de4cc",
        storageBucket: "kimplab-bot-de4cc.appspot.com",
        messagingSenderId: "186565108865",
        appId: "1:186565108865:web:54101f0391c43cb647d980",
        measurementId: "G-QXG19CRPM",
      }
      firebaseApp.current = initializeApp(firebaseConfig);
      //firebaseApp.current = initializeApp(envIfo.firebaseConfig);
      firebaseAuth.current = getAuth(firebaseApp.current);
      firestore.current = getFirestore(firebaseApp.current)
      analytics.current = getAnalytics(firebaseApp.current);
    }
  
    const handleLogin = async (email: string, password: string) => {
      console.log(`handleLogin. email: ${email}, password len: ${password.length}`);
      if (!firebaseAuth.current ||! firestore.current) {
        console.error("firebaseAuth, firestore is empty")
        return;
      }

      try {
        const curUserInfo = await signInWithEmailAndPassword(firebaseAuth.current, email, password);     
        if (!curUserInfo) return;
        const userDocRef = await getDoc(doc(firestore.current, "Users", curUserInfo.user.uid))
        const userDocData = userDocRef.data();
        let userInfo: IUserInfo;
        if (!userDocData) {
          userInfo = {
            uid: curUserInfo.user.uid,
            email: curUserInfo.user.email ?? "",
            proExpiredAt: Math.floor(new Date('9999.12.31').getTime() / 1000),
            updatedAt: Date.now(),
            createdAt: Date.now(),
          }
          await setDoc(doc(firestore.current, "Users", curUserInfo.user.uid ), userInfo)
        } else {
          userInfo = {
            uid: userDocData.uid,
            email: userDocData.email,
            proExpiredAt: userDocData.proExpiredAt,
            updatedAt: userDocData.updatedAt,
            createdAt: userDocData.createdAt,
          }
        }
        setUserInfo(userInfo);
        window.Main.setUserInfo(userInfo);
        console.log("final userInfo: ", userInfo)
        window.Main.setStoreData(STORE_KEY.LATEST_USER_EMAIL, userInfo.email);        
        window.Main.getExchangeAccountInfos({email: userInfo.email});
        window.Main.getAllJobWorker();
        
        const token = await curUserInfo?.user?.getIdToken();
        if (!token) return;
        setToken(token);

        navigate(location.state?.from?.pathname || '/dashboard');
      } catch (error:any) {
        console.log(error);
      }
        
    };

    const handleSignup = async (email: string, password: string) => {
      if (!firebaseAuth.current) {
        console.error("firebaseAuth is empty")
        return;
      }
      try {
        const curUserInfo = await createUserWithEmailAndPassword(firebaseAuth.current, email, password);     
        console.log("signup userInfo: ", curUserInfo)
        await handleLogin(email, password);
      } catch (error:any) {
        console.log(error);
      }
    }
  
    const handleLogout = () => {
      console.log("handleLogout");
      setToken(null);
      setUserInfo(null);
      setExchangeAccountInfos([]);
      window.Main.setUserInfo(null);      
    };
  
    const value: any = {
      userInfo,
      token,
      exchangeAccountInfos,
      onLogin: handleLogin,
      onLogout: handleLogout,
      onSignup: handleSignup,
    };
  
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  };