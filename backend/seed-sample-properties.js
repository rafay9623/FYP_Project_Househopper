import { initializeFirebase, getFirestore } from './Configs/firebase_config.js'

const PROPERTIES_COLLECTION = 'properties'

function isoDate(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function createSampleProperties() {
  const entries = []
  let idx = 1

  const pushProperty = (p) => {
    entries.push({
      id: `sample_prop_${String(idx).padStart(3, '0')}`,
      ...p,
      country: 'Pakistan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seedTag: 'sample-seed-v1',
    })
    idx += 1
  }

  // Cluster A: Lahore, houses
  for (let i = 0; i < 10; i += 1) {
    pushProperty({
      userId: `seed-user-${(i % 3) + 1}`,
      name: `Lahore Family House ${i + 1}`,
      property_type: 'House',
      purchase_price: 22000000 + i * 1400000,
      current_value: 24000000 + i * 1500000,
      monthly_rent: 85000 + i * 4500,
      bedrooms: 3 + (i % 3),
      baths: 3 + (i % 2),
      area: 5 + (i % 3),
      area_type: 'Marla',
      purpose: i % 2 === 0 ? 'For Sale' : 'For Rent',
      addressStreet: `${12 + i} Main Boulevard`,
      addressTown: i % 2 === 0 ? 'DHA' : 'Bahria Town',
      addressCity: 'Lahore',
      addressProvince: 'Punjab',
      address: `${12 + i} Main Boulevard, Lahore, Punjab, Pakistan`,
      description: 'Spacious residential house near schools and markets.',
      purchase_date: isoDate(500 - i * 12),
    })
  }

  // Cluster B: Karachi, apartments
  for (let i = 0; i < 10; i += 1) {
    pushProperty({
      userId: `seed-user-${(i % 4) + 4}`,
      name: `Karachi Apartment ${i + 1}`,
      property_type: 'Apartment',
      purchase_price: 9500000 + i * 900000,
      current_value: 10200000 + i * 930000,
      monthly_rent: 45000 + i * 3000,
      bedrooms: 2 + (i % 2),
      baths: 2,
      area: 900 + i * 60,
      area_type: 'Square Feet',
      purpose: i % 2 === 0 ? 'For Rent' : 'For Sale',
      addressStreet: `${5 + i} Clifton Block`,
      addressTown: i % 2 === 0 ? 'Clifton' : 'Gulshan-e-Iqbal',
      addressCity: 'Karachi',
      addressProvince: 'Sindh',
      address: `${5 + i} Clifton Block, Karachi, Sindh, Pakistan`,
      description: 'Modern apartment with security and parking.',
      purchase_date: isoDate(420 - i * 10),
    })
  }

  // Cluster C: Islamabad, plots/commercial mix
  for (let i = 0; i < 10; i += 1) {
    const isPlot = i < 6
    pushProperty({
      userId: `seed-user-${(i % 3) + 8}`,
      name: isPlot ? `Islamabad Plot ${i + 1}` : `Islamabad Commercial Unit ${i - 5}`,
      property_type: isPlot ? 'Residential Plot' : 'Commercial',
      purchase_price: isPlot ? 13000000 + i * 1200000 : 28000000 + i * 2100000,
      current_value: isPlot ? 14800000 + i * 1300000 : 31500000 + i * 2250000,
      monthly_rent: isPlot ? null : 130000 + i * 9000,
      bedrooms: isPlot ? null : 1,
      baths: isPlot ? null : 1,
      area: isPlot ? 10 + (i % 4) : 550 + i * 25,
      area_type: isPlot ? 'Marla' : 'Square Feet',
      purpose: isPlot ? 'For Sale' : 'For Rent',
      addressStreet: `${20 + i} Sector Road`,
      addressTown: i % 2 === 0 ? 'F-10' : 'G-11',
      addressCity: 'Islamabad',
      addressProvince: 'Islamabad Capital Territory',
      address: `${20 + i} Sector Road, Islamabad, Islamabad Capital Territory, Pakistan`,
      description: isPlot
        ? 'Prime location plot suitable for long-term investment.'
        : 'Commercial space ideal for office or retail use.',
      purchase_date: isoDate(300 - i * 9),
    })
  }

  return entries
}

async function seed() {
  try {
    initializeFirebase()
    const db = getFirestore()
    const data = createSampleProperties()
    const batch = db.batch()

    data.forEach((property) => {
      const docRef = db.collection(PROPERTIES_COLLECTION).doc(property.id)
      batch.set(docRef, property, { merge: true })
    })

    await batch.commit()

    console.log(`Seed complete. Upserted ${data.length} sample properties.`)
    console.log('Cities: Lahore, Karachi, Islamabad')
    console.log('Mix: House, Apartment, Residential Plot, Commercial')
    process.exit(0)
  } catch (error) {
    console.error('Seeding failed:', error.message)
    process.exit(1)
  }
}

seed()
