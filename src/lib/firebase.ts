import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// In AI Studio, the config is injected or read from the config file.
// We'll use the values from the config file we just read.
const firebaseConfig = {
  apiKey: "AIzaSyARxHT_VDYjSTLubqrViEg-sNIWSCYOrdY",
  authDomain: "gen-lang-client-0035593102.firebaseapp.com",
  projectId: "gen-lang-client-0035593102",
  storageBucket: "gen-lang-client-0035593102.firebasestorage.app",
  messagingSenderId: "1068555112900",
  appId: "1:1068555112900:web:aea6fceb4f9b9de30f1491"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-aethelvibeldrcou-23072c44-efaa-457f-901b-9d888f93d04a");
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
