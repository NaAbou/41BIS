import {signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { auth } from "./firebase-config.js";


onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});


fetch('https://naabou.github.io/41BIS/messages.json')
  //.then(res => res.json())
  .then(messages => {
    messages.forEach(m => {
      console.log(m)
     // console.log(`[${m.timestamp}] ${m.author}: ${m.content}`);
    });
  });