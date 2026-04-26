import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDDqOFW4GKWxwDt8aeJxRrmi44xNZo0WDs",
    authDomain: "subject-specific-ai.firebaseapp.com",
    projectId: "subject-specific-ai",
    storageBucket: "subject-specific-ai.firebasestorage.app",
    messagingSenderId: "659016733077",
    appId: "1:659016733077:web:2b6c268ae80b74a0c7269c",
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);