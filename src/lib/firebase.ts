import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnj9WskuYQJ-Y4aTtCo79ntXCbuktMSyE",
  authDomain: "petralab-e1536.firebaseapp.com",
  projectId: "petralab-e1536",
  storageBucket: "petralab-e1536.firebasestorage.app",
  messagingSenderId: "196108112105",
  appId: "1:196108112105:web:0ab0a49964e7a05d6be078",
  measurementId: "G-P07JFHN5EZ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
