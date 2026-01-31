import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCKn-tjGJWey9d4rvvSc2H7gI3sTkME0R0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "househoppers-818b7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "househoppers-818b7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "househoppers-818b7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "749534899710",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:749534899710:web:bd38d1c59b8ec1303b24af"
}

// Initialize Firebase (only if not already initialized)
let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
  console.log('✅ Firebase initialized')
} else {
  app = getApps()[0]
  console.log('✅ Firebase already initialized')
}

// Initialize Firebase Authentication
let auth
try {
  auth = getAuth(app)
  if (!auth) {
    throw new Error('Firebase Auth not initialized')
  }
  console.log('✅ Firebase Auth initialized', { appName: app.name, authApp: auth.app.name })
} catch (error) {
  console.error('❌ Firebase Auth initialization error:', error)
  // Try to reinitialize
  try {
    app = initializeApp(firebaseConfig, 'default')
    auth = getAuth(app)
    console.log('✅ Firebase Auth reinitialized')
  } catch (retryError) {
    console.error('❌ Firebase Auth reinitialization failed:', retryError)
    throw new Error('Failed to initialize Firebase Authentication. Please check your Firebase configuration and ensure Email/Password authentication is enabled in Firebase Console.')
  }
}

// Verify auth is working
if (!auth) {
  throw new Error('Firebase Auth is null. Please check Firebase configuration.')
}

// Test auth initialization
if (typeof window !== 'undefined') {
  console.log('🔍 Firebase Auth Debug:', {
    authExists: !!auth,
    appExists: !!app,
    appName: app?.name,
    authApp: auth?.app?.name,
    config: {
      apiKey: firebaseConfig.apiKey?.substring(0, 20) + '...',
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId
    }
  })
  
  // Validate configuration
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
    console.warn('⚠️ Firebase API Key may not be configured correctly')
  }
  if (!firebaseConfig.authDomain || firebaseConfig.authDomain.includes('your-project')) {
    console.warn('⚠️ Firebase Auth Domain may not be configured correctly')
  }
}

export { auth }
export default app
