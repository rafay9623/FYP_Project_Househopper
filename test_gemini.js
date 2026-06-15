import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

async function testChat() {
  try {
    console.log('Testing Gemini API with Key: ', process.env.GEMINI_API_KEY ? 'Present' : 'Missing')
    const result = await model.generateContent('Hi, say hello if you can see this.')
    const response = await result.response
    console.log('Response:', response.text())
    process.exit(0)
  } catch (error) {
    console.error('Gemini Test Failed:', error)
    process.exit(1)
  }
}

testChat()
