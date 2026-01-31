import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let firestore = null
let auth = null
let isInitialized = false

export function initializeFirebase() {
  if (isInitialized) {
    return { firestore, auth }
  }

  try {
    // Try environment variables first
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
      console.log('✅ Firebase initialized with environment variables')
    } else {
      // Try service account file
      const serviceAccountPath = join(__dirname, '../firebase-service-account.json')
      
      if (existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })
        console.log('✅ Firebase initialized with service account file')
      } else {
        // Initialize with default (for development)
        admin.initializeApp({
          projectId: projectId || 'demo-project',
        })
        console.log('⚠️  Firebase initialized with default credentials (limited functionality)')
      }
    }

    firestore = admin.firestore()
    auth = admin.auth()
    isInitialized = true

    console.log('✅ Firestore & Auth services ready')
    return { firestore, auth }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message)
    throw error
  }
}

export function getFirestore() {
  if (!isInitialized) {
    initializeFirebase()
  }
  return firestore
}

export function getAuth() {
  if (!isInitialized) {
    initializeFirebase()
  }
  return auth
}

export { admin }

