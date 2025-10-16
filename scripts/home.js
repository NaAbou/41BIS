import {signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { auth } from "./firebase-config.js";



onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});