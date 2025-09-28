import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
	apiKey: 'AIzaSyAtNRgZ7Kd8Li15z-dlTGOkeyi6wOCYS8k',
	authDomain: 'sliced-56cbd.firebaseapp.com',
	projectId: 'sliced-56cbd',
	storageBucket: 'sliced-56cbd.appspot.com',
	messagingSenderId: '898123841053',
	appId: '1:898123841053:web:2a93183908df58d018d0f4',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);