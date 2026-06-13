import { model } from '../config/gemini_config.js'
import { getFirestore } from '../config/firebase_config.js'

const CONVERSATIONS_COLLECTION = 'conversations'

/**
 * Handle chat message
 * POST /api/chat/message
 */
export async function handleMessage(req, res) {
    try {
        const { message, history, conversationId } = req.body
        const userId = req.user.uid
        const db = getFirestore()

        if (!message) {
            return res.status(400).json({ error: 'Message is required' })
        }

        // 1. Parallelize initial setup data fetching
        const CHAT_USAGE_COLLECTION = 'chat_usage'
        const USERS_COLLECTION = 'users'
        
        const [userDoc, usageDoc, userPropsSnapshot, allPropsSnapshot] = await Promise.all([
            db.collection(USERS_COLLECTION).doc(userId).get(),
            db.collection(CHAT_USAGE_COLLECTION).doc(userId).get(),
            db.collection('properties').where('userId', '==', userId).get(),
            db.collection('properties').orderBy('createdAt', 'desc').limit(15).get() // Reduced limit to 15 for speed
        ])

        const userPlan = userDoc.exists ? (userDoc.data().subscriptionPlan || 'basic') : 'basic'

        // 2. Rate limiting check for Basic plan
        if (userPlan === 'basic') {
            const now = new Date()
            if (usageDoc.exists) {
                const usage = usageDoc.data()
                const windowStart = new Date(usage.windowStart)
                const hoursDiff = (now - windowStart) / (1000 * 60 * 60)

                if (hoursDiff < 24) {
                    if (usage.messageCount >= 10) {
                        const resetsAt = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000)
                        return res.status(429).json({
                            error: 'Daily limit reached (10 messages).',
                            resetsAt: resetsAt.toISOString(),
                            upgradeUrl: '/pricing',
                        })
                    }
                    // Update count in background (non-blocking for this request response time)
                    db.collection(CHAT_USAGE_COLLECTION).doc(userId).update({ messageCount: usage.messageCount + 1 })
                } else {
                    db.collection(CHAT_USAGE_COLLECTION).doc(userId).set({ userId, messageCount: 1, windowStart: now.toISOString() })
                }
            } else {
                db.collection(CHAT_USAGE_COLLECTION).doc(userId).set({ userId, messageCount: 1, windowStart: now.toISOString() })
            }
        }

        const pruneProperty = (p) => ({
            id: p.id || 'unknown',
            name: p.name || 'Property',
            location: p.location || p.address || 'N/A',
            price: p.current_value || p.purchase_price || 'N/A',
            type: p.type || 'residential'
        })

        const userProperties = []
        userPropsSnapshot.forEach(doc => userProperties.push(pruneProperty({ id: doc.id, ...doc.data() })))

        const allProperties = []
        allPropsSnapshot.forEach(doc => {
            const data = doc.data()
            allProperties.push({ ...pruneProperty({ id: doc.id, ...data }), isOwn: data.userId === userId })
        })

        // 3. Conversation Management
        let activeConversationId = conversationId
        let conversationRef

        if (!activeConversationId) {
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

        // Save User Message (background)
        const userMsgPromise = conversationRef.collection('messages').add({
            role: 'user',
            text: message,
            createdAt: new Date().toISOString()
        })

        // 4. AISDK Setup
        const systemInstruction = `
      You are HouseHopper AI, the official real estate assistant.
      User ID: ${userId}
      User's Properties: ${JSON.stringify(userProperties.slice(0, 10))}
      Market Properties: ${JSON.stringify(allProperties)}

      BEHAVIOR:
      1. For greetings, be friendly and brief.
      2. Only list properties when relevant.
      3. Reply in JSON ONLY: { "response": "Your markdown answer", "properties": [{id, name}] }.
    `

        const chatHistory = history ? history.slice(-6).map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }]
        })) : []

        // Remove leading model msg if any
        while (chatHistory.length > 0 && chatHistory[0].role === 'model') chatHistory.shift()

        const chat = model.startChat({ history: chatHistory })

        // 5. AI Call with Timeout (25 seconds)
        const TIMEOUT_MS = 25000
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI response timed out')), TIMEOUT_MS)
        )

        let text
        try {
            const aiCallPromise = (async () => {
                const result = await chat.sendMessage(`${systemInstruction}\n\nUser: ${message}`)
                const resObj = await result.response
                return resObj.text()
            })()

            text = await Promise.race([aiCallPromise, timeoutPromise])
        } catch (aiError) {
            console.error('AI SDK/Timeout Error:', aiError)
            return res.status(aiError.message === 'AI response timed out' ? 504 : 500).json({
                error: aiError.message === 'AI response timed out' 
                    ? 'The AI is taking too long to respond. Please try a simpler question.' 
                    : 'AI service unavailable.'
            })
        }

        // 6. Robust JSON Extraction
        let jsonResponse
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            const cleanedText = jsonMatch ? jsonMatch[0] : text
            const parsed = JSON.parse(cleanedText)
            
            jsonResponse = {
                response: parsed.response || parsed.answer || parsed.text || "I couldn't format the response correctly, but here is what I found: " + text,
                properties: Array.isArray(parsed.properties) ? parsed.properties : []
            }
        } catch (e) {
            console.warn('JSON Parse semi-failed, using raw text')
            jsonResponse = { response: text, properties: [] }
        }

        // 7. Post-response Database Updates (Background)
        const saveModelMessage = async () => {
            await conversationRef.collection('messages').add({
                role: 'model',
                text: jsonResponse.response,
                properties: jsonResponse.properties,
                createdAt: new Date().toISOString()
            })
            await conversationRef.update({
                lastMessage: jsonResponse.response.substring(0, 100),
                updatedAt: new Date().toISOString()
            })
            await userMsgPromise // Ensure user message is also saved
        }
        
        saveModelMessage().catch(err => console.error('Background save error:', err))

        // Return immediately
        res.json({
            ...jsonResponse,
            conversationId: activeConversationId
        })

    } catch (error) {
        console.error('Chat controller crash:', error)
        res.status(500).json({ error: 'Internal server error during chat.' })
    }
}
