import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js'


const firebaseConfig = {
    apiKey: "AIzaSyBgYeOlG0gOOOTDH3dXNObaqFApykDKjy4",
    authDomain: "bis-f6a28.firebaseapp.com",
    projectId: "bis-f6a28",
    storageBucket: "bis-f6a28.firebasestorage.app",
    messagingSenderId: "916764319171",
    appId: "1:916764319171:web:79f3e4e6d649b6fcfe7176"
};


function login() {
    const email = document.getElementsByName('email')[0].value;
    const password = document.getElementsByName('password')[0].value;
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
        });
}

window.login = login;
