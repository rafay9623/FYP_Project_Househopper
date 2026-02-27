import { initializeFirebase, getFirestore } from './Configs/firebase_config.js'

async function check() {
    initializeFirebase()
    const db = getFirestore()
    const snapshot = await db.collection('conversations').get()
    console.log('Total conversations found:', snapshot.size)
    snapshot.forEach(doc => {
        console.log('Conv ID:', doc.id, 'User:', doc.data().userId)
    })

    const propSnapshot = await db.collection('properties').get()
    console.log('Total properties found:', propSnapshot.size)
    propSnapshot.forEach(doc => {
        console.log('Prop ID:', doc.id, 'User:', doc.data().userId, 'Name:', doc.data().name)
    })
    process.exit(0)
}

check().catch(err => {
    console.error(err)
    process.exit(1)
})
