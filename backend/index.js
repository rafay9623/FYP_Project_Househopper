import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { initializeFirebase } from './Configs/firebase_config.js'
import authRoutes from './Routes/auth.js'
import propertiesRoutes from './Routes/properties.js'
import usersRoutes from './Routes/users.js'
import chatRoutes from './Routes/chat.js'
import conversationRoutes from './Routes/conversations.js'

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Firebase
initializeFirebase()

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Request logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/properties', propertiesRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/conversations', conversationRoutes)

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/profile',
      logout: 'POST /api/auth/logout'
    }
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message)
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`)
  console.log(`✅ Backend is ready!\n`)
})
