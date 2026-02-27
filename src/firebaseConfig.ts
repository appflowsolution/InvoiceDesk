import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgKlE1X_P6Z1kj9sQ5qdxHLipkJM6safo",
    authDomain: "invoicedesk-f3c36.firebaseapp.com",
    projectId: "invoicedesk-f3c36",
    storageBucket: "invoicedesk-f3c36.firebasestorage.app",
    messagingSenderId: "976796805984",
    appId: "1:976796805984:web:34da9811d0c858f29a4c05"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
