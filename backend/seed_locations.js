import 'dotenv/config';
import { initializeFirebase, getFirestore } from './src/config/firebase_config.js';

initializeFirebase();
const db = getFirestore();

// Approximate coordinates for major Pakistan cities
const CITIES_COORDS = {
  lahore: { lat: 31.5204, lng: 74.3587 },
  karachi: { lat: 24.8607, lng: 67.0011 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  faisalabad: { lat: 31.4284, lng: 73.1314 }
};

async function run() {
  const snapshot = await db.collection('properties').get();
  console.log(`Updating ${snapshot.size} properties...`);

  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if location already exists
    if (data.location?.latitude && data.location?.longitude) {
      console.log(`- Property "${data.name}" already has location: ${JSON.stringify(data.location)}`);
      continue;
    }

    const city = (data.addressCity || data.city || '').toLowerCase().trim();
    let baseCoords = CITIES_COORDS[city];
    
    if (!baseCoords) {
      // Fallback: assign randomly to one of the cities
      const cities = Object.keys(CITIES_COORDS);
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      baseCoords = CITIES_COORDS[randomCity];
      console.log(`- Property "${data.name}" has city "${city}", falling back to ${randomCity}`);
    }

    // Add a small random jitter so they don't overlap completely
    const jitterLat = (Math.random() - 0.5) * 0.08;
    const jitterLng = (Math.random() - 0.5) * 0.08;
    
    const newLocation = {
      latitude: baseCoords.lat + jitterLat,
      longitude: baseCoords.lng + jitterLng
    };

    await db.collection('properties').doc(doc.id).update({
      location: newLocation
    });

    console.log(`✅ Updated "${data.name}" (ID: ${doc.id}) in ${city || 'unknown'} with: ${JSON.stringify(newLocation)}`);
    count++;
  }

  console.log(`\n🎉 Successfully updated ${count} properties with location coordinates!`);
}

run().catch(console.error);
