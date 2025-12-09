import { getAuth, clerkClient } from '@clerk/express'
import { getFirestore } from '../db/firebase.js'

export async function requireAuth(req, res, next) {
  try {
    let clerkUserId = null
    let clerkUserData = null
    
    try {
      const auth = getAuth(req)
      if (auth && auth.userId) {
        clerkUserId = auth.userId
        console.log(`✅ requireAuth: Found Clerk user ID: ${clerkUserId.substring(0, 20)}...`)
        
        try {
          const user = await clerkClient.users.getUser(clerkUserId)
          if (user) {
            clerkUserData = {
              email: user.emailAddresses?.[0]?.emailAddress || null,
              firstName: user.firstName || null,
              lastName: user.lastName || null,
              imageUrl: user.imageUrl || null,
            }
            console.log(`👤 Clerk user details: ${clerkUserData.firstName || 'No name'} (${clerkUserData.email || 'No email'})`)
          }
        } catch (clerkError) {
          console.warn(`⚠️  Could not fetch Clerk user details: ${clerkError.message}`)
        }
      }
    } catch (getAuthError) {
    }
    
    if (clerkUserId) {
      req.userId = clerkUserId
      req.dbUserId = clerkUserId
      
      try {
        const db = getFirestore()
        const usersRef = db.collection('users')
        
        const userSnapshot = await usersRef
          .where('clerkUserId', '==', clerkUserId)
          .limit(1)
          .get()
        
        if (userSnapshot.empty) {
          const userData = {
            clerkUserId: clerkUserId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          
          if (clerkUserData) {
            userData.email = clerkUserData.email
            userData.firstName = clerkUserData.firstName
            userData.lastName = clerkUserData.lastName
            userData.imageUrl = clerkUserData.imageUrl
          }
          
          await usersRef.add(userData)
          console.log(`✅ Created new user in Firestore: ${clerkUserData?.firstName || clerkUserId.substring(0, 20)}...`)
        } else {
          const userDoc = userSnapshot.docs[0]
          const updateData = {
            updatedAt: new Date().toISOString(),
          }
          
          if (clerkUserData) {
            if (clerkUserData.email) updateData.email = clerkUserData.email
            if (clerkUserData.firstName) updateData.firstName = clerkUserData.firstName
            if (clerkUserData.lastName) updateData.lastName = clerkUserData.lastName
            if (clerkUserData.imageUrl) updateData.imageUrl = clerkUserData.imageUrl
          }
          
          await userDoc.ref.update(updateData)
        }
      } catch (firestoreError) {
        console.warn(`⚠️  Could not sync user to Firestore: ${firestoreError.message}`)
      }
      
      return next()
    }
    
    if (req.userId && req.dbUserId) {
      console.log(`⚠️  requireAuth: Using fallback user ID: ${req.userId.substring(0, 30)}...`)
      return next()
    }

    console.warn('❌ requireAuth: No user ID found in request')
    return res.status(401).json({ error: 'Unauthorized - please sign in' })
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
