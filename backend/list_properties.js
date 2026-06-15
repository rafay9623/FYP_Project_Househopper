import 'dotenv/config';
import { initializeFirebase, getFirestore } from './src/config/firebase_config.js';

initializeFirebase();
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('properties').get();
  console.log(`Found ${snapshot.size} properties:`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}, Name: "${data.name}", City: "${data.addressCity || data.city}", Location: ${JSON.stringify(data.location)}`);
  });
}

run().catch(console.error);
