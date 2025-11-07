import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDGdQz8qPA4EpXS7vYf6ZAHKo3n5p3ri_M",
  authDomain: "onlinetaxman-c6d0f.firebaseapp.com",
  projectId: "onlinetaxman-c6d0f",
  storageBucket: "onlinetaxman-c6d0f.appspot.com", // ✅ fixed domain typo storageBucket: "onlinetaxman-c6d0f.firebasestorage.app"
  messagingSenderId: "265362408287",
  appId: "1:265362408287:web:f4e5cc7b859de453f1acea",
  measurementId: "G-M0C3SY37JE",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);




export { app, db, auth };
