// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "@firebase/firestore";


const firebaseConfig = {
  apiKey: "xx",
  authDomain: "chat-app-8ef03.firebaseapp.com",
  projectId: "chat-app-8ef03",
  storageBucket: "chat-app-8ef03.appspot.com",
  messagingSenderId: "705585244276",
  appId: "1:705585244276:web:6905459d1c0800f7ba0921",
  measurementId: "G-KWJSWQRNV0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();