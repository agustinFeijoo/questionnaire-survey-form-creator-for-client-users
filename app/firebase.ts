import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAZ27-xd1lYkeNf2jzLiKTf1WQ9L8uyUDE",
  authDomain: "questionnaire-c17ea.firebaseapp.com",
  projectId: "questionnaire-c17ea",
  storageBucket: "questionnaire-c17ea.firebasestorage.app",
  messagingSenderId: "670234678656",
  appId: "1:670234678656:web:447c0fd7ce8f7df6dc9d65",
  measurementId: "G-0SXEL2KG7F"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);




export { app, db, auth };
