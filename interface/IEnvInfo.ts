
export interface IEnvInfo {
    firebaseConfig: IFirebaseConfig;
}

export interface IFirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
}

