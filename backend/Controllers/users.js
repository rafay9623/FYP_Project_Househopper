import { getFirestore } from '../Configs/firebase_config.js'

/**
 * Users Controller - Handles HTTP requests for user browsing
 */

/**
 * GET /api/users
 * Get all users with their property counts (for browsing)
 */
export async function getAllUsers(req, res) {
  try {
    const db = getFirestore()
    const currentUserId = req.user?.uid
    const currentUserEmail = req.user?.email

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    console.log(`🔍 Fetching all users (excluding: ${currentUserId} - ${currentUserEmail})`)

    // Get all users and all properties in parallel
    const [usersSnapshot, propertiesSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('properties').get()
    ])
    
    // Count properties per user
    const propertyCountsByUser = {}
    const propertyImagesByUser = {}
    
    propertiesSnapshot.forEach(doc => {
      const property = doc.data()
      const userId = property.userId
      
      if (!propertyCountsByUser[userId]) {
        propertyCountsByUser[userId] = 0
        propertyImagesByUser[userId] = null
      }
      
      propertyCountsByUser[userId]++
      
      // Store first property image for display (check both field names)
      if (!propertyImagesByUser[userId]) {
        propertyImagesByUser[userId] = property.image_url || property.property_image || null
      }
    })

    // Build user list (exclude current user)
    const users = []
    usersSnapshot.forEach(doc => {
      const userData = doc.data()
      const userId = doc.id
      
      // Skip current user
      if (userId === currentUserId) {
        return
      }
      
      // Only include users who have properties
      if (propertyCountsByUser[userId] > 0) {
        users.push({
          id: userId,
          uid: userId,
          email: userData.email,
          first_name: userData.firstName || '',
          last_name: userData.lastName || '',
          displayName: userData.displayName || '',
          property_count: propertyCountsByUser[userId] || 0,
          property_image: propertyImagesByUser[userId] || null
        })
      }
    })

    console.log(`✅ Found ${users.length} users with properties (excluding current user)`)

    res.json({
      success: true,
      users
    })
  } catch (error) {
    console.error('Error getting users:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get users'
    })
  }
}

/**
 * GET /api/users/:userId
 * Get user by ID
 */
export async function getUserById(req, res) {
  try {
    const db = getFirestore()
    const { userId } = req.params
    const currentUserId = req.user?.uid

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    console.log(`🔍 Fetching user ${userId} (requested by: ${currentUserId})`)

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    const userData = userDoc.data()

    // Get user's property count
    const propertiesSnapshot = await db
      .collection('properties')
      .where('userId', '==', userId)
      .get()

    const user = {
      id: userId,
      uid: userId,
      email: userData.email,
      first_name: userData.firstName || '',
      last_name: userData.lastName || '',
      displayName: userData.displayName || '',
      property_count: propertiesSnapshot.size
    }

    console.log(`✅ User ${userId} fetched successfully (${propertiesSnapshot.size} properties)`)

    res.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('Error getting user:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user'
    })
  }
}

