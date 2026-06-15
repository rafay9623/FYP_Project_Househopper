import 'dotenv/config';
import { initializeFirebase, getFirestore } from './src/config/firebase_config.js';

initializeFirebase();
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('users').where('email', '==', 'abdurrafaynaveed123@gmail.com').get();
  if (snapshot.empty) {
    console.log('User not found');
    return;
  }
  
  const doc = snapshot.docs[0];
  console.log('User Profile in Firestore:', doc.id, doc.data());
}

run().catch(console.error);
