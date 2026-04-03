const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./backend/src/config/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const users = await db.collection('users').get();
  console.log('Total users:', users.size);
  
  const props = await db.collection('properties').get();
  console.log('Total properties:', props.size);
  
  const counts = {};
  props.forEach(d => {
    const data = d.data();
    counts[data.userId] = (counts[data.userId] || 0) + 1;
  });
  console.log('Property counts by userId:', counts);
  process.exit(0);
}

check();
