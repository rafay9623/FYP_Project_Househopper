import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let firestore = null
let isInitialized = false

export function initializeFirebase() {
  if (isInitialized) {
    return firestore
  }

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
                                join(__dirname, '../firebase-service-account.json')
    
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId: projectId,
      })
      console.log('✅ Firebase Admin initialized with environment variables')
    } else {
      try {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })
        console.log('✅ Firebase Admin initialized with service account file')
      } catch (fileError) {
        try {
          admin.initializeApp({
            projectId: projectId || 'househoppers-818b7',
          })
          console.log('✅ Firebase Admin initialized with default credentials')
        } catch (defaultError) {
          console.error('❌ Failed to initialize Firebase Admin:', defaultError.message)
          console.error('   Please configure Firebase credentials in server.env or provide service account JSON file')
          throw new Error('Firebase Admin initialization failed')
        }
      }
    }

    firestore = admin.firestore()
    isInitialized = true
    
    console.log('✅ Firestore database initialized')
    return firestore
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message)
    throw error
  }
}

export function getFirestore() {
  if (!isInitialized) {
    try {
      return initializeFirebase()
    } catch (error) {
      console.error('❌ getFirestore() failed:', error.message)
      throw new Error(`Firebase Firestore not initialized: ${error.message}. Please add firebase-service-account.json to server/ directory or configure Firebase credentials in server.env`)
    }
  }
  if (!firestore) {
    throw new Error('Firestore instance is null. Firebase may not be properly initialized.')
  }
  return firestore
}

export { admin }
