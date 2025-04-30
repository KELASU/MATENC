// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCF51N3oqIvT00p9BKA6thHrnPvqCgM12g",
  authDomain: "matenc-aa4b5.firebaseapp.com",
  projectId: "matenc-aa4b5",
  storageBucket: "matenc-aa4b5.firebasestorage.app",
  messagingSenderId: "1050273519262",
  appId: "1:1050273519262:web:76bd472177de4e2f08cd8f",
  measurementId: "G-4GSP5PD63B"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig); // Make sure you're initializing `app` here
export const Fauth = initializeAuth(app, { persistence: getReactNativePersistence(ReactNativeAsyncStorage) });
export const Fstore = getFirestore(app);


