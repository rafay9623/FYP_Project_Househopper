import { Router } from 'express'
import { clerkClient } from '@clerk/express'
import { requireAuth } from '../middleware/auth.js'
import { getFirestore } from '../db/firebase.js'

export const usersRouter = Router()

async function getClerkUserDetails(clerkUserId) {
  try {
    const user = await clerkClient.users.getUser(clerkUserId)
    if (user) {
      return {
        email: user.emailAddresses?.[0]?.emailAddress || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        imageUrl: user.imageUrl || null,
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not fetch Clerk user ${clerkUserId}: ${error.message}`)
  }
  return null
}

usersRouter.use(requireAuth)

usersRouter.get('/', async (req, res) => {
  try {
    if (!req.dbUserId) {
      console.error('❌ No dbUserId found in request')
      return res.status(401).json({ error: 'User not authenticated' })
    }
    
    console.log(`\n👥 Fetching users for browsing (excluding user ID: ${req.dbUserId})`)
    
    const db = getFirestore()
    
    const propertiesRef = db.collection('properties')
    const propertiesSnapshot = await propertiesRef.get()
    
    const userPropertyCounts = {}
    propertiesSnapshot.forEach(doc => {
      const property = doc.data()
      const userId = property.userId
      if (userId && userId !== req.dbUserId) {
        userPropertyCounts[userId] = (userPropertyCounts[userId] || 0) + 1
      }
    })
    
    console.log(`📊 Found ${Object.keys(userPropertyCounts).length} other users with properties`)
    
    const usersRef = db.collection('users')
    const users = []
    
    for (const [userId, propertyCount] of Object.entries(userPropertyCounts)) {
      const userSnapshot = await usersRef
        .where('clerkUserId', '==', userId)
        .limit(1)
        .get()
      
      let userData = {}
      let userDocId = userId
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0]
        userData = userDoc.data()
        userDocId = userDoc.id
      }
      
      let firstName = userData.firstName || userData.first_name || null
      let lastName = userData.lastName || userData.last_name || null
      let email = userData.email || null
      
      if (!firstName && !lastName && userId.startsWith('user_')) {
        const clerkData = await getClerkUserDetails(userId)
        if (clerkData) {
          firstName = clerkData.firstName
          lastName = clerkData.lastName
          email = clerkData.email || email
          
          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0]
            await userDoc.ref.update({
              firstName: firstName,
              lastName: lastName,
              email: email,
              updatedAt: new Date().toISOString(),
            })
            console.log(`📝 Updated user details in Firestore for: ${firstName} ${lastName}`)
          }
        }
      }
      
      // Get the first property's image for this user
      let propertyImage = null
      const userPropertiesRef = db.collection('properties')
      const userPropertiesSnapshot = await userPropertiesRef
        .where('userId', '==', userId)
        .limit(1)
        .get()
      
      if (!userPropertiesSnapshot.empty) {
        const firstProperty = userPropertiesSnapshot.docs[0].data()
        if (firstProperty.image_url && firstProperty.image_url.trim()) {
          propertyImage = firstProperty.image_url
        }
      }
      
      users.push({
        id: userDocId,
        clerk_user_id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        property_count: propertyCount,
        property_image: propertyImage
      })
    }
    
    users.sort((a, b) => b.property_count - a.property_count)
    
    console.log(`✅ Found ${users.length} users with properties`)
    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

usersRouter.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const db = getFirestore()
    
    console.log(`👤 Fetching user with ID: ${userId}`)
    
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()
    
    if (!userDoc.exists) {
      const usersRef = db.collection('users')
      const snapshot = await usersRef
        .where('clerkUserId', '==', userId)
        .limit(1)
        .get()
      
      if (snapshot.empty) {
        if (userId.startsWith('user_')) {
          const clerkData = await getClerkUserDetails(userId)
          if (clerkData) {
            const propertiesRef = db.collection('properties')
            const propertiesSnapshot = await propertiesRef
              .where('userId', '==', userId)
              .get()
            
            return res.json({
              id: userId,
              clerk_user_id: userId,
              email: clerkData.email,
              first_name: clerkData.firstName,
              last_name: clerkData.lastName,
              property_count: propertiesSnapshot.size
            })
          }
        }
        return res.status(404).json({ error: 'User not found' })
      }
      
      const userData = snapshot.docs[0].data()
      const userDocId = snapshot.docs[0].id
      
      let firstName = userData.firstName || userData.first_name || null
      let lastName = userData.lastName || userData.last_name || null
      let email = userData.email || null
      
      if (!firstName && !lastName && userId.startsWith('user_')) {
        const clerkData = await getClerkUserDetails(userId)
        if (clerkData) {
          firstName = clerkData.firstName
          lastName = clerkData.lastName
          email = clerkData.email || email
        }
      }
      
      const propertiesRef = db.collection('properties')
      const propertiesSnapshot = await propertiesRef
        .where('userId', '==', userId)
        .get()
      
      return res.json({
        id: userDocId,
        clerk_user_id: userData.clerkUserId || userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        property_count: propertiesSnapshot.size
      })
    }
    
    const userData = userDoc.data()
    
    let firstName = userData.firstName || userData.first_name || null
    let lastName = userData.lastName || userData.last_name || null
    let email = userData.email || null
    const clerkUserId = userData.clerkUserId || userId
    
    if (!firstName && !lastName && clerkUserId.startsWith('user_')) {
      const clerkData = await getClerkUserDetails(clerkUserId)
      if (clerkData) {
        firstName = clerkData.firstName
        lastName = clerkData.lastName
        email = clerkData.email || email
      }
    }
    
    const propertiesRef = db.collection('properties')
    const propertiesSnapshot = await propertiesRef
      .where('userId', '==', clerkUserId)
      .get()
    
    res.json({
      id: userDoc.id,
      clerk_user_id: clerkUserId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      property_count: propertiesSnapshot.size
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})
