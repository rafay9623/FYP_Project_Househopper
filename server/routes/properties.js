import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getFirestore } from '../db/firebase.js'

export const propertiesRouter = Router()

propertiesRouter.use(requireAuth)

propertiesRouter.get('/', async (req, res) => {
  try {
    const db = getFirestore()
    const userId = req.dbUserId
    
    console.log(`📋 Fetching properties for user: ${userId}`)
    
    const propertiesRef = db.collection('properties')
    const snapshot = await propertiesRef
      .where('userId', '==', userId)
      .get()
    
    const properties = []
    snapshot.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    properties.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateB - dateA
    })
    
    console.log(`✅ Found ${properties.length} properties`)
    res.json(properties)
  } catch (error) {
    console.error('Error fetching properties:', error.message)
    res.status(500).json({ error: 'Failed to fetch properties' })
  }
})

propertiesRouter.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const db = getFirestore()
    
    console.log(`📋 Fetching properties for user ID: ${userId}`)
    
    const propertiesRef = db.collection('properties')
    const snapshot = await propertiesRef
      .where('userId', '==', userId)
      .get()
    
    const properties = []
    snapshot.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    properties.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateB - dateA
    })
    
    res.json(properties)
  } catch (error) {
    console.error('Error fetching user properties:', error)
    res.status(500).json({ error: 'Failed to fetch user properties' })
  }
})

propertiesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = getFirestore()
    const userId = req.dbUserId
    
    console.log(`📋 Fetching property with ID: ${id}`)
    
    const propertyRef = db.collection('properties').doc(id)
    const doc = await propertyRef.get()
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Property not found' })
    }
    
    const property = doc.data()
    
    if (property.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    res.json({
      id: doc.id,
      ...property
    })
  } catch (error) {
    console.error('Error fetching property:', error)
    res.status(500).json({ error: 'Failed to fetch property' })
  }
})

propertiesRouter.post('/', async (req, res) => {
  try {
    console.log('\n📝 Received property creation request')
    console.log('   User ID:', req.dbUserId)
    const logBody = { ...req.body }
    if (logBody.image_url) {
      logBody.image_url = `[Base64 image data: ${logBody.image_url.length} characters]`
    }
    console.log('   Request body:', JSON.stringify(logBody, null, 2))
    
    const {
      name,
      address,
      purchase_price,
      current_value,
      monthly_rent,
      property_type,
      purchase_date,
      description,
      image_url,
    } = req.body

    const errors = []

    if (!name || typeof name !== 'string' || !name.trim() || name.trim().length < 3) {
      errors.push('Property name is required and must be at least 3 characters')
    }

    if (!address || typeof address !== 'string' || !address.trim() || address.trim().length < 5) {
      errors.push('Address is required and must be at least 5 characters')
    }

    if (purchase_price === undefined || purchase_price === null) {
      errors.push('Purchase price is required')
    } else {
      const price = parseFloat(purchase_price)
      if (isNaN(price) || price <= 0) {
        errors.push('Purchase price must be a positive number')
      }
    }

    if (current_value !== undefined && current_value !== null) {
      const value = parseFloat(current_value)
      if (isNaN(value) || value < 0) {
        errors.push('Current value must be a positive number or zero')
      }
    }

    if (monthly_rent !== undefined && monthly_rent !== null) {
      const rent = parseFloat(monthly_rent)
      if (isNaN(rent) || rent < 0) {
        errors.push('Monthly rent must be a positive number or zero')
      }
    }

    if (purchase_date) {
      const date = new Date(purchase_date)
      if (isNaN(date.getTime())) {
        errors.push('Invalid purchase date format')
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (date > today) {
          errors.push('Purchase date cannot be in the future')
        }
      }
    }

    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors)
      return res.status(400).json({ 
        error: errors.join(', '),
        details: errors 
      })
    }

    console.log('✅ Validation passed, saving to Firestore...')
    
    let db
    try {
      db = getFirestore()
    } catch (firebaseError) {
      console.error('❌ Firebase not initialized:', firebaseError.message)
      return res.status(503).json({
        error: 'Database not available',
        message: 'Firebase Firestore is not configured. Please add firebase-service-account.json file to server/ directory.',
        details: process.env.NODE_ENV === 'development' ? firebaseError.message : undefined
      })
    }
    
    const propertyData = {
      userId: req.dbUserId,
      name: name.trim(),
      address: address.trim(),
      purchase_price: parseFloat(purchase_price),
      current_value: current_value ? parseFloat(current_value) : null,
      monthly_rent: monthly_rent ? parseFloat(monthly_rent) : null,
      property_type: property_type ? property_type.trim() : null,
      purchase_date: purchase_date || null,
      description: description ? description.trim() : null,
      image_url: image_url || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    console.log('Property data to save:', {
      ...propertyData,
      image_url: propertyData.image_url ? `[Base64 image, ${propertyData.image_url.length} chars]` : null
    })
    
    const docRef = await db.collection('properties').add(propertyData)
    
    const savedProperty = {
      id: docRef.id,
      ...propertyData
    }
    
    console.log('✅ Property created successfully!')
    console.log('   Property ID:', docRef.id)
    console.log('   Property Name:', savedProperty.name)
    
    res.status(201).json(savedProperty)
  } catch (error) {
    console.error('❌ Error creating property:', error.message)
    console.error('Error stack:', error.stack)
    
    if (error.message && (error.message.includes('Firebase') || error.message.includes('Firestore') || error.message.includes('not initialized'))) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Firebase Firestore is not set up. Please download firebase-service-account.json from Firebase Console and place it in server/ directory. See FIREBASE_SETUP.md for instructions.',
        details: error.message
      })
    }
    
    if (error.code === 'permission-denied' || error.code === 7) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Firebase security rules are blocking this operation. Please check your Firestore security rules.'
      })
    }
    
    res.status(500).json({ 
      error: 'Failed to create property. Please try again.',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

propertiesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = getFirestore()
    const userId = req.dbUserId
    
    const {
      name,
      address,
      purchase_price,
      current_value,
      monthly_rent,
      property_type,
      purchase_date,
      description,
      image_url,
    } = req.body

    const propertyRef = db.collection('properties').doc(id)
    const doc = await propertyRef.get()
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Property not found' })
    }
    
    const existingProperty = doc.data()
    if (existingProperty.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const updateData = {
      updatedAt: new Date().toISOString(),
    }
    
    if (name !== undefined) updateData.name = name.trim()
    if (address !== undefined) updateData.address = address.trim()
    if (purchase_price !== undefined) updateData.purchase_price = parseFloat(purchase_price)
    if (current_value !== undefined) updateData.current_value = current_value ? parseFloat(current_value) : null
    if (monthly_rent !== undefined) updateData.monthly_rent = monthly_rent ? parseFloat(monthly_rent) : null
    if (property_type !== undefined) updateData.property_type = property_type ? property_type.trim() : null
    if (purchase_date !== undefined) updateData.purchase_date = purchase_date || null
    if (description !== undefined) updateData.description = description ? description.trim() : null
    if (image_url !== undefined) updateData.image_url = image_url || null
    
    await propertyRef.update(updateData)
    
    const updatedDoc = await propertyRef.get()
    
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data()
    })
  } catch (error) {
    console.error('Error updating property:', error)
    res.status(500).json({ error: 'Failed to update property' })
  }
})

propertiesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = getFirestore()
    const userId = req.dbUserId
    
    const propertyRef = db.collection('properties').doc(id)
    const doc = await propertyRef.get()
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Property not found' })
    }
    
    const property = doc.data()
    if (property.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    await propertyRef.delete()
    
    res.json({ message: 'Property deleted successfully', id })
  } catch (error) {
    console.error('Error deleting property:', error)
    res.status(500).json({ error: 'Failed to delete property' })
  }
})
