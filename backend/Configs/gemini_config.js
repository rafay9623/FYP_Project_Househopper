import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Get the model (using gemini-pro for text-only chat)
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

export { model }
