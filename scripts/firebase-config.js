import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js'

export const firebaseConfig = {
    apiKey: "AIzaSyBgYeOlG0gOOOTDH3dXNObaqFApykDKjy4",
    authDomain: "bis-f6a28.firebaseapp.com",
    projectId: "bis-f6a28",
    storageBucket: "bis-f6a28.firebasestorage.app",
    messagingSenderId: "916764319171",
    appId: "1:916764319171:web:79f3e4e6d649b6fcfe7176"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app)