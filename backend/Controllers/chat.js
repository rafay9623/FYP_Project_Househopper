import { model } from '../Configs/gemini_config.js'
import { getFirestore } from '../Configs/firebase_config.js'

const CONVERSATIONS_COLLECTION = 'conversations'

/**
 * Handle chat message
 * POST /api/chat/message
 */
export async function handleMessage(req, res) {
    try {
        const { message, history, conversationId } = req.body
        const userId = req.user.uid // From verifyToken middleware
        const db = getFirestore()

        if (!message) {
            return res.status(400).json({ error: 'Message is required' })
        }

        // 1. Fetch "Your Properties"
        const userPropsSnapshot = await db.collection('properties')
            .where('userId', '==', userId)
            .get()

        const userProperties = []
        userPropsSnapshot.forEach(doc => {
            userProperties.push({ id: doc.id, ...doc.data() })
        })

        // 2. Fetch "All Properties"
        const allPropsSnapshot = await db.collection('properties')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get()

        const allProperties = []
        allPropsSnapshot.forEach(doc => {
            const data = doc.data()
            allProperties.push({
                id: doc.id,
                ...data,
                isOwn: data.userId === userId
            })
        })

        // 3. Construct System Context
        const systemInstruction = `
      You are HouseHopper AI, an expert real estate assistant.
      
      CONTEXT:
      User ID: ${userId}
      
      USER'S PROPERTIES (The user owns these):
      ${JSON.stringify(userProperties)}

      ALL AVAILABLE PROPERTIES (Database):
      ${JSON.stringify(allProperties)}

      INSTRUCTIONS:
      1. Answer questions based ONLY on the provided property data.
      2. If the user asks about their own properties, refer to "USER'S PROPERTIES".
      3. If the user asks about available properties in general, refer to "ALL AVAILABLE PROPERTIES".
      4. If data is not available, say you don't have that information.
      5. BE HELPFUL and friendly.

      OUTPUT FORMAT:
      You must responding in valid JSON format ONLY. 
      Structure:
      {
        "response": "Your conversational answer here (can use markdown)",
        "properties": [ { "id": "property_id", "name": "property name" } ] // List of properties relevant to the answer, if any.
      }
    `

        // 4. Persistence Setup
        let activeConversationId = conversationId
        let conversationRef

        if (!activeConversationId) {
            // Create new conversation if none provided
            const convData = {
                userId,
                title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
                lastMessage: message,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
            conversationRef = await db.collection(CONVERSATIONS_COLLECTION).add(convData)
            activeConversationId = conversationRef.id
        } else {
            conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(activeConversationId)
        }

        // Save User Message
        await conversationRef.collection('messages').add({
            role: 'user',
            text: message,
            createdAt: new Date().toISOString()
        })

        // 5. Call Gemini
        let chatHistory = history ? history.map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }]
        })) : []

        // Filter out leading model messages
        while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
            chatHistory.shift()
        }

        const fullPrompt = `${systemInstruction}\n\nUser Message: ${message}`

        const chat = model.startChat({
            history: chatHistory,
        })

        const result = await chat.sendMessage(fullPrompt)
        const geminiResponse = await result.response
        const text = geminiResponse.text()

        // 6. Clean up JSON response
        let jsonResponse
        try {
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()
            jsonResponse = JSON.parse(cleanedText)
        } catch (e) {
            jsonResponse = {
                response: text,
                properties: []
            }
        }

        // Save Model Response
        await conversationRef.collection('messages').add({
            role: 'model',
            text: jsonResponse.response,
            properties: jsonResponse.properties || [],
            createdAt: new Date().toISOString()
        })

        // Update conversation summary
        await conversationRef.update({
            lastMessage: jsonResponse.response.substring(0, 100),
            updatedAt: new Date().toISOString()
        })

        res.json({
            ...jsonResponse,
            conversationId: activeConversationId
        })

    } catch (error) {
        console.error('Chat error details:', error)

        if (error.message && error.message.includes('429')) {
            return res.status(429).json({
                error: 'Too many requests. Please wait a moment before trying again.'
            })
        }

        res.status(500).json({
            error: 'Failed to generate response. Please try again.',
            details: error.message
        })
    }
}
