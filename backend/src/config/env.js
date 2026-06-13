import dotenv from 'dotenv'

// Load environment variables based on NODE_ENV if needed, or just default .env
dotenv.config()

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RECOMMENDATION_SERVICE_URL: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5001',
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  // ... any other env vars
}

export default env
