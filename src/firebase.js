// Firebase Configuration & Initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyByoR1efZY5WUcUWJp3daqVx-UUL5WlWWI",
  authDomain: "doit-app-c2eeb.firebaseapp.com",
  projectId: "doit-app-c2eeb",
  storageBucket: "doit-app-c2eeb.firebasestorage.app",
  messagingSenderId: "376010947518",
  appId: "1:376010947518:web:6587da1589c8c9b4dd17ef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
