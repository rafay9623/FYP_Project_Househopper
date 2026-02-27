import { getFirestore } from '../Configs/firebase_config.js'

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
