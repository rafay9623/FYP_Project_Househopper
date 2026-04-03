import { getFirestore } from '../config/firebase_config.js'

const CONVERSATIONS_COLLECTION = 'conversations'

/**
 * Create a new conversation
 */
export async function createConversation(req, res) {
    try {
        const db = getFirestore()
        const userId = req.user.uid

        const conversationData = {
            userId,
            title: 'New Conversation',
            lastMessage: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        const docRef = await db.collection(CONVERSATIONS_COLLECTION).add(conversationData)
        console.log('Created conversation:', docRef.id, 'for user:', userId)

        res.status(201).json({
            success: true,
            conversation: {
                id: docRef.id,
                ...conversationData
            }
        })
    } catch (error) {
        console.error('Error creating conversation:', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

/**
 * Get all conversations for the user
 */
export async function getAllConversations(req, res) {
    try {
        const db = getFirestore()
        const userId = req.user.uid
        console.log('Fetching conversations for user UID from token:', userId)

        console.log('Fetching all conversations for diag...')
        const allSnapshot = await db.collection(CONVERSATIONS_COLLECTION).get()
        console.log('Total conversations in system:', allSnapshot.size)

        const conversations = []
        allSnapshot.forEach(doc => {
            const data = doc.data()
            if (data.userId === userId) {
                conversations.push({ id: doc.id, ...data })
            }
        })
        console.log(`Filtered down to ${conversations.length} for user ${userId}`)

        res.json({ success: true, conversations, searchingForUID: userId })
    } catch (error) {
        console.error('Error fetching conversations:', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

/**
 * Get messages for a specific conversation
 */
export async function getConversationMessages(req, res) {
    try {
        const db = getFirestore()
        const { id } = req.params
        const userId = req.user.uid

        // Check ownership
        const convDoc = await db.collection(CONVERSATIONS_COLLECTION).doc(id).get()
        if (!convDoc.exists || convDoc.data().userId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized or not found' })
        }

        const snapshot = await db.collection(CONVERSATIONS_COLLECTION)
            .doc(id)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .get()

        const messages = []
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() })
        })

        res.json({ success: true, messages })
    } catch (error) {
        console.error('Error fetching messages:', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(req, res) {
    try {
        const db = getFirestore()
        const { id } = req.params
        const userId = req.user.uid

        const convDoc = await db.collection(CONVERSATIONS_COLLECTION).doc(id).get()
        if (!convDoc.exists || convDoc.data().userId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized or not found' })
        }

        // Delete subcollection messages first (small scale, for large scale use recursive delete or cloud function)
        const messagesSnapshot = await db.collection(CONVERSATIONS_COLLECTION)
            .doc(id)
            .collection('messages')
            .get()

        const batch = db.batch()
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref)
        })
        batch.delete(db.collection(CONVERSATIONS_COLLECTION).doc(id))

        await batch.commit()

        res.json({ success: true, message: 'Conversation deleted' })
    } catch (error) {
        console.error('Error deleting conversation:', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

/**
 * GET /api/conversations/admin/all
 * Get all conversations in the system (Admin only)
 */
export async function getAdminAllConversations(req, res) {
    try {
        const db = getFirestore()

        console.log('🛡️ Admin fetching ALL system conversations')

        // 1. Fetch all conversations and all users in parallel
        const [convSnapshot, usersSnapshot] = await Promise.all([
            db.collection(CONVERSATIONS_COLLECTION).orderBy('updatedAt', 'desc').get(),
            db.collection('users').get()
        ])

        // 2. Map users for quick lookup
        const userMap = {}
        usersSnapshot.forEach(doc => {
            const data = doc.data()
            userMap[doc.id] = data.email || 'unknown@user.com'
        })

        // 3. Process conversations and fetch message counts
        // Note: For high volume, we'd store messageCount on the conversation doc itself.
        // For now, we fetch message counts in parallel.
        const conversations = await Promise.all(convSnapshot.docs.map(async (doc) => {
            const data = doc.data()
            const messagesSnapshot = await db.collection(CONVERSATIONS_COLLECTION)
                .doc(doc.id)
                .collection('messages')
                .get()

            return {
                id: doc.id,
                participants: [userMap[data.userId] || 'Deleted User', 'HouseHopper AI'],
                messageCount: messagesSnapshot.size,
                lastActive: data.updatedAt,
                title: data.title || 'Conversation',
                lastMessage: data.lastMessage || '',
                status: 'Normal', // Default to normal until flagging is implemented
                createdAt: data.createdAt,
                userId: data.userId
            }
        }))

        console.log(`✅ Admin fetched ${conversations.length} system conversations`)

        res.json({
            success: true,
            conversations,
            count: conversations.length
        })
    } catch (error) {
        console.error('Error fetching all conversations (Admin):', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

