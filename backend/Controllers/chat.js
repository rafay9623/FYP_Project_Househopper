import { model } from '../Configs/gemini_config.js'
import { getFirestore } from '../Configs/firebase_config.js'

/**
 * Handle chat message
 * POST /api/chat/message
 */
export async function handleMessage(req, res) {
    try {
        const { message, history } = req.body
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

        // 2. Fetch "All Properties" (limit to recent 20 for context window efficiency, or fetch all if dataset is small)
        // For now, let's fetch topmost 50 recent properties to give broader context
        const allPropsSnapshot = await db.collection('properties')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get()

        const allProperties = []
        allPropsSnapshot.forEach(doc => {
            const data = doc.data()
            // Avoid duplicating user's own properties in the "public" list if possible, or just include all.
            // Let's include all but mark ownership in the prompt context.
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

        // 4. Call Gemini
        // We use generateContent instead of startChat for simpler context injection on single turn, 
        // or we can prepend history. For a proper "chat" with context, we need to inject system instruction.
        // gemini-pro / 1.5 supports systemInstruction.

        // Note: The 'model' instance from config is generic. We might need to instantiate a new one with systemInstruction if supported,
        // or just prepend the instruction to the first message of the chat. 
        // Since we are stateless here (history comes from frontend), let's rebuild the history with system prompt at the start.

        let chatHistory = history ? history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        })) : []

        // Gemini requires the first message in history to be from 'user'.
        // Filter out any leading 'model' messages from the history.
        while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
            chatHistory.shift()
        }

        // Prepend system instruction as a "user" message (or part of the first turn) if systemModel is not available.
        // However, Gemini 1.5/2.0 supports systemInstruction in model config.
        // To keep it simple and compatible with the existing instance, we'll prepend context to the current prompt 
        // or add it as the first history item if existing history is empty.

        const fullPrompt = `${systemInstruction}\n\nUser Message: ${message}`

        // Start chat with history
        const chat = model.startChat({
            history: chatHistory,
        })

        const result = await chat.sendMessage(fullPrompt)
        const response = await result.response
        const text = response.text()

        // 5. Clean up JSON response (sometimes models add markdown code blocks)
        let jsonResponse
        try {
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()
            jsonResponse = JSON.parse(cleanedText)
        } catch (e) {
            // Fallback if model fails to output JSON
            jsonResponse = {
                response: text,
                properties: []
            }
        }

        res.json(jsonResponse)

    } catch (error) {
        console.error('Chat error details:', error)

        // Handle specific Gemini API errors
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
