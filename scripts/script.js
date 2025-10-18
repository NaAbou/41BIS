import {signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { auth } from "./firebase-config.js";

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

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            window.location.href = "home.html";
        })
        .catch((error) => {
            document.getElementsByName('email')[0].style.borderColor = "red"
            document.getElementsByName('password')[0].style.borderColor = "red"
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode)
            console.log(errorMessage)
        });
}


onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "home.html";
    }
});