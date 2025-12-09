import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { clerkMiddleware } from '@clerk/express'
import { propertiesRouter } from './routes/properties.js'
import { portfoliosRouter } from './routes/portfolios.js'
import { usersRouter } from './routes/users.js'
import { initializeFirebase } from './db/firebase.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

try {
  const envPath = join(__dirname, '.env')
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      const value = valueParts.join('=').trim()
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  })
  console.log('✅ Environment variables loaded from server/.env')
} catch (error) {
  try {
    const envPath = join(__dirname, 'server.env')
    const envFile = readFileSync(envPath, 'utf-8')
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        const value = valueParts.join('=').trim()
        if (key && value && !process.env[key]) {
          process.env[key] = value
        }
      }
    })
    console.log('✅ Environment variables loaded from server/server.env (fallback)')
  } catch (fallbackError) {
    console.warn('⚠️  Could not load server/.env or server/server.env, using system environment variables:', fallbackError.message)
  }
}

const app = express()
const PORT = process.env.PORT || 3001

const clerkSecretKey = process.env.CLERK_SECRET_KEY
if (!clerkSecretKey || clerkSecretKey === 'your_secret_key') {
  console.warn('⚠️  Missing or invalid CLERK_SECRET_KEY environment variable')
  console.warn('   Authentication will be disabled. Set CLERK_SECRET_KEY in server.env for production.')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing CLERK_SECRET_KEY environment variable')
  }
}

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
console.log(`🌐 Allowing CORS from: ${frontendUrl}`)

app.use(cors({
  origin: [
    frontendUrl, 
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://127.0.0.1:3000', 
    'http://127.0.0.1:5173',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

let clerkMiddlewareEnabled = false
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY
if (clerkSecretKey && clerkSecretKey !== 'your_secret_key' && clerkPublishableKey && clerkPublishableKey !== 'your_clerk_publishable_key') {
  try {
    app.use(clerkMiddleware({
      secretKey: clerkSecretKey,
      publishableKey: clerkPublishableKey
    }))
    clerkMiddlewareEnabled = true
    console.log('✅ Clerk middleware enabled')
  } catch (error) {
    console.warn('⚠️  Failed to enable Clerk middleware:', error.message)
  }
} else if (clerkSecretKey && clerkSecretKey !== 'your_secret_key') {
  console.warn('⚠️  CLERK_PUBLISHABLE_KEY not set - Clerk middleware disabled')
  console.warn('   Add CLERK_PUBLISHABLE_KEY to server/.env for full authentication')
}

if (!clerkMiddlewareEnabled) {
  console.warn('⚠️  Clerk middleware not enabled - using fallback authentication')
  console.warn('   Set CLERK_SECRET_KEY in server.env for proper authentication')
  
  app.use(async (req, res, next) => {
    let clerkUserId = null
    
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
          clerkUserId = payload.sub || payload.user_id || payload.userId || null
          if (clerkUserId && typeof clerkUserId === 'string' && clerkUserId.startsWith('user_')) {
            console.log(`🔑 Extracted Clerk user ID from Bearer token: ${clerkUserId.substring(0, 20)}...`)
          } else {
            clerkUserId = null
          }
        }
      } catch (e) {
      }
    }
    
    if (!clerkUserId) {
      try {
        const sessionToken = req.cookies?.__session || req.cookies?.['__clerk_db_jwt']
        if (sessionToken) {
          try {
            const parts = sessionToken.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
              clerkUserId = payload.sub || payload.user_id || payload.userId || null
              if (clerkUserId && typeof clerkUserId === 'string' && clerkUserId.startsWith('user_')) {
                console.log(`🔑 Extracted Clerk user ID from session cookie: ${clerkUserId.substring(0, 20)}...`)
              } else {
                clerkUserId = null
              }
            }
          } catch (e) {
          }
        }
      } catch (error) {
      }
    }
    
    if (!clerkUserId && clerkSecretKey && clerkSecretKey !== 'your_secret_key') {
      try {
        const { getAuth } = await import('@clerk/express')
        const auth = getAuth(req)
        if (auth && auth.userId) {
          clerkUserId = auth.userId
          console.log(`🔑 Extracted Clerk user ID via getAuth: ${clerkUserId.substring(0, 20)}...`)
        }
      } catch (error) {
      }
    }
    
    if (!clerkUserId) {
      const sessionId = req.cookies?.['connect.sid'] || req.cookies?.session || req.headers['x-session-id']
      if (sessionId) {
        const crypto = await import('crypto')
        const hash = crypto.createHash('sha256').update(sessionId).digest('hex').substring(0, 24)
        clerkUserId = `session-${hash}`
        console.warn(`⚠️  Using session-based user ID (not ideal): ${clerkUserId}`)
      } else {
        const requestFingerprint = (req.ip || 'unknown') + (req.get('user-agent') || 'unknown')
        const crypto = await import('crypto')
        const hash = crypto.createHash('sha256').update(requestFingerprint).digest('hex').substring(0, 24)
        clerkUserId = `dev-${hash}`
        console.warn(`⚠️  Using fingerprint-based user ID (least ideal): ${clerkUserId}`)
        console.warn('   IMPORTANT: Set CLERK_SECRET_KEY in server.env for proper user isolation!')
      }
    }
    
    req.userId = clerkUserId
    
    req.dbUserId = clerkUserId
    
    next()
  })
}

app.get('/', (req, res) => {
  res.json({
    message: 'HouseHoppers Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      properties: '/api/properties',
      portfolios: '/api/portfolios',
      users: '/api/users',
      test: '/api/test'
    },
    documentation: 'This is the backend API server. Use the endpoints above to interact with the API.'
  })
})

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/test', async (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    backend: 'Firebase Firestore (to be implemented)',
    devMode: !clerkSecretKey || clerkSecretKey === 'your_secret_key'
  })
})

app.use('/api/properties', propertiesRouter)
app.use('/api/portfolios', portfoliosRouter)
app.use('/api/users', usersRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err, req, res, next) => {
  console.error('❌ Error:', err)
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`)
  console.log(`🌐 CORS enabled for: ${frontendUrl}`)
  
  try {
    initializeFirebase()
    console.log(`✅ Firebase Firestore initialized successfully`)
  } catch (error) {
    console.warn(`⚠️  Firebase Firestore not initialized: ${error.message}`)
    console.warn(`   Server will run but database operations will fail`)
    console.warn(`   Configure Firebase credentials in server.env or provide service account JSON file`)
  }
  
  console.log(`\n✅ Backend is ready to accept requests!`)
  console.log(`\n`)
})
