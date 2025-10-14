import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js'


const firebaseConfig = {
    apiKey: "AIzaSyBgYeOlG0gOOOTDH3dXNObaqFApykDKjy4",
    authDomain: "bis-f6a28.firebaseapp.com",
    projectId: "bis-f6a28",
    storageBucket: "bis-f6a28.firebasestorage.app",
    messagingSenderId: "916764319171",
    appId: "1:916764319171:web:79f3e4e6d649b6fcfe7176"
};

document.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        event.preventDefault()
        document.getElementById("loginBtn").click();
    }
}
);
document.getElementById('loginBtn').addEventListener('click', login);

export function login() {
    const email = document.getElementsByName('email')[0].value;
    const password = document.getElementsByName('password')[0].value;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            window.location.href = "home.html";
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode)
            console.log(errorMessage)
        });
}


try {
    console.log("prova")
    onAuthStateChanged(window.auth, (user) => {
        console.log(auth)
        if (user) {
            window.location.href = "index.html";
        }
    });
} catch (error) {

}