import { getFirestore } from '../config/firebase_config.js'

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
    const propertyNamesByUser = {}
    
    propertiesSnapshot.forEach(doc => {
      const property = doc.data()
      // If a property was manually added to Firestore without a userId, group them under 'system'
      const userId = property.userId || 'system-properties'
      
      if (!propertyCountsByUser[userId]) {
        propertyCountsByUser[userId] = 0
        propertyImagesByUser[userId] = null
        propertyNamesByUser[userId] = property.name || property.title || 'Unknown Property'
      }
      
      propertyCountsByUser[userId]++
      
      // Store first property image for display (check both field names)
      if (!propertyImagesByUser[userId]) {
        propertyImagesByUser[userId] = property.image_url || property.property_image || null
      }
    })

    // Build user list
    const users = []
    const processedUserIds = new Set()

    usersSnapshot.forEach(doc => {
      const userData = doc.data()
      const userId = doc.id
      processedUserIds.add(userId)
      
      // We no longer skip the current user so they can see their own profile and properties during testing and demonstration

      // Only include users who have properties
      if (propertyCountsByUser[userId] > 0) {
        users.push({
          id: userId,
          uid: userId,
          email: userData.email || 'No email',
          first_name: userData.firstName || '',
          last_name: userData.lastName || '',
          displayName: userData.displayName || '',
          property_count: propertyCountsByUser[userId] || 0,
          property_image: propertyImagesByUser[userId] || null
        })
      }
    })

    // Find any orphaned properties (e.g. manually added to DB with invalid/missing userIds) and show them!
    Object.keys(propertyCountsByUser).forEach(userId => {
      if (!processedUserIds.has(userId) && propertyCountsByUser[userId] > 0) {
        const propName = propertyNamesByUser[userId]
        users.push({
          id: userId,
          uid: userId,
          email: 'Property Owner',
          first_name: propName,
          last_name: '',
          displayName: propName,
          property_count: propertyCountsByUser[userId],
          property_image: propertyImagesByUser[userId] || null
        })
      }
    })

    console.log(`✅ Found ${users.length} active property groups to display`)

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
/**
 * GET /api/users/admin/all
 * Get all users in the system (Admin only)
 * Returns full user data including subscription info
 */
export async function getAdminAllUsers(req, res) {
  try {
    const db = getFirestore()

    console.log('🛡️ Admin fetching ALL users')

    const usersSnapshot = await db.collection('users').get()

    const users = []
    usersSnapshot.forEach(doc => {
      const userData = doc.data()
      users.push({
        id: doc.id,
        uid: doc.id,
        email: userData.email || '',
        first_name: userData.firstName || '',
        last_name: userData.lastName || '',
        displayName: userData.displayName || '',
        subscriptionPlan: userData.subscriptionPlan || 'basic',
        subscriptionStatus: userData.subscriptionStatus || null,
        role: userData.role || 'user',
        createdAt: userData.createdAt || null,
      })
    })

    console.log(`✅ Admin fetched ${users.length} users`)

    res.json({
      success: true,
      users,
      count: users.length
    })
  } catch (error) {
    console.error('Error getting all users (Admin):', error)
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

