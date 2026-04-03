import { getFirestore } from '../config/firebase_config.js'
import { verifyToken } from '../middlewares/verify.js'
import { uploadPropertyImage, deletePropertyImage, isBase64DataUrl } from '../services/storage.js'
import NodeCache from 'node-cache'

// Global 2-minute TTL cache for public/heavy queries
const cache = new NodeCache({ stdTTL: 120 })

const PROPERTIES_COLLECTION = 'properties'

/**
 * Get all properties for the authenticated user
 * Supports field selection via query.fields (comma separated)
 */
export async function getAllProperties(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid
    const userEmail = req.user?.email

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    // Get query parameters
    const {
      sortBy = 'createdAt',
      order = 'desc',
      property_type,
      min_price,
      max_price,
      fields // New: field selection
    } = req.query

    console.log(`🔍 Fetching properties for user: ${userId}${fields ? ` (fields: ${fields})` : ''}`)

    let query = db.collection(PROPERTIES_COLLECTION).where('userId', '==', userId)

    if (property_type) query = query.where('property_type', '==', property_type)
    if (min_price) {
      const min = parseFloat(min_price)
      if (!isNaN(min)) query = query.where('purchase_price', '>=', min)
    }
    if (max_price) {
      const max = parseFloat(max_price)
      if (!isNaN(max)) query = query.where('purchase_price', '<=', max)
    }

    const validSortFields = ['createdAt', 'purchase_price', 'current_value', 'monthly_rent', 'updatedAt', 'purchase_date']
    if (validSortFields.includes(sortBy)) {
      query = query.orderBy(sortBy, order.toLowerCase() === 'asc' ? 'asc' : 'desc')
    } else {
      query = query.orderBy('createdAt', 'desc')
    }

    const propertiesSnapshot = await query.get()
    const requestedFields = fields ? fields.split(',').map(f => f.trim()) : null

    const properties = []
    propertiesSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.userId !== userId) return

      if (requestedFields) {
        const filteredData = { id: doc.id }
        requestedFields.forEach(f => {
          if (data[f] !== undefined) filteredData[f] = data[f]
        })
        properties.push(filteredData)
      } else {
        properties.push({ id: doc.id, ...data })
      }
    })

    res.json({
      success: true,
      properties,
      count: properties.length
    })
  } catch (error) {
    console.error('Error getting properties:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Get portfolio statistics for the authenticated user
 * Optimized for dashboard displays
 */
export async function getPropertyStats(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    // Check cache first
    const cacheKey = `stats_${userId}`
    const cachedStats = cache.get(cacheKey)
    if (cachedStats) {
      console.log(`🚀 Returning cached stats for user ${userId}`)
      return res.json({ success: true, ...cachedStats, cached: true })
    }

    console.log(`📊 Calculating property stats for user: ${userId}`)

    // Fetch only necessary fields for calculation
    const snapshot = await db.collection(PROPERTIES_COLLECTION)
      .where('userId', '==', userId)
      .select('purchase_price', 'current_value', 'monthly_rent')
      .get()

    let totalValue = 0
    let totalRentYearly = 0
    let totalPurchasePrice = 0
    const count = snapshot.size

    snapshot.forEach(doc => {
      const data = doc.data()
      const price = parseFloat(data.purchase_price || 0)
      const current = parseFloat(data.current_value || price)
      const rent = parseFloat(data.monthly_rent || 0)

      totalValue += current
      totalPurchasePrice += price
      totalRentYearly += (rent * 12)
    })

    const avgROI = totalPurchasePrice > 0 ? (totalRentYearly / totalPurchasePrice) * 100 : 0

    const stats = {
      propertyCount: count,
      totalValue,
      avgROI,
      timestamp: new Date().toISOString()
    }

    // Cache for 5 minutes
    cache.set(cacheKey, stats, 300)

    res.json({
      success: true,
      ...stats,
      cached: false
    })
  } catch (error) {
    console.error('Error calculating property stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}


/**
 * Get a single property by ID
 */
export async function getPropertyById(req, res) {
  try {
    const db = getFirestore()
    const { id } = req.params
    const userId = req.user?.uid
    const userEmail = req.user?.email

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    console.log(`🔍 Fetching property ${id} for user: ${userId} (${userEmail})`)

    const propertyDoc = await db
      .collection(PROPERTIES_COLLECTION)
      .doc(id)
      .get()

    if (!propertyDoc.exists) {
      console.log(`❌ Property ${id} not found`)
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      })
    }

    const propertyData = propertyDoc.data()

    // Verify the property belongs to the user
    if (propertyData.userId !== userId) {
      console.error(`❌ SECURITY WARNING: Property ${id} belongs to user ${propertyData.userId} but requested by ${userId}`)
      return res.status(403).json({
        success: false,
        error: 'Access denied - property does not belong to you'
      })
    }

    console.log(`✅ Property ${id} fetched successfully for user ${userId}`)

    res.json({
      success: true,
      property: {
        id: propertyDoc.id,
        ...propertyData
      }
    })
  } catch (error) {
    console.error('Error getting property:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get property'
    })
  }
}

/**
 * Create a new property
 */
export async function createProperty(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid
    const userEmail = req.user?.email

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    // Ensure userId from request body matches authenticated user (security)
    if (req.body.userId && req.body.userId !== userId) {
      console.error(`❌ SECURITY WARNING: Attempt to create property with different userId. Requested: ${req.body.userId}, Authenticated: ${userId}`)
      return res.status(403).json({
        success: false,
        error: 'Cannot create property for another user'
      })
    }

    // Validation checks
    const validationErrors = []

    // Required field validations
    if (!req.body.name || typeof req.body.name !== 'string' || !req.body.name.trim()) {
      validationErrors.push('Property name is required and must be a non-empty string')
    } else if (req.body.name.trim().length < 3) {
      validationErrors.push('Property name must be at least 3 characters long')
    } else if (req.body.name.trim().length > 200) {
      validationErrors.push('Property name must not exceed 200 characters')
    }

    // Address validation - support both legacy and new structured format
    const hasStructuredAddress = req.body.addressStreet && req.body.addressCity && req.body.addressProvince
    const hasLegacyAddress = req.body.address && typeof req.body.address === 'string' && req.body.address.trim()

    if (!hasStructuredAddress && !hasLegacyAddress) {
      validationErrors.push('Address is required. Provide either structured address fields (street, city, province) or a full address string.')
    }

    if (hasStructuredAddress) {
      if (typeof req.body.addressStreet !== 'string' || req.body.addressStreet.trim().length < 3) {
        validationErrors.push('Street address must be at least 3 characters')
      }
      if (typeof req.body.addressCity !== 'string' || req.body.addressCity.trim().length < 2) {
        validationErrors.push('City is required')
      }
      const validProvinces = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad', 'Gilgit-Baltistan', 'Azad Kashmir']
      if (!validProvinces.includes(req.body.addressProvince)) {
        validationErrors.push('Province must be one of: ' + validProvinces.join(', '))
      }
    } else if (hasLegacyAddress) {
      if (req.body.address.trim().length < 5) {
        validationErrors.push('Address must be at least 5 characters long')
      } else if (req.body.address.trim().length > 500) {
        validationErrors.push('Address must not exceed 500 characters')
      }
    }

    // Location coordinates validation (optional)
    if (req.body.location) {
      if (typeof req.body.location.latitude === 'number' && typeof req.body.location.longitude === 'number') {
        if (req.body.location.latitude < 23 || req.body.location.latitude > 37) {
          validationErrors.push('Latitude must be within Pakistan bounds (23-37)')
        }
        if (req.body.location.longitude < 60 || req.body.location.longitude > 77) {
          validationErrors.push('Longitude must be within Pakistan bounds (60-77)')
        }
      } else if (req.body.location.latitude !== null || req.body.location.longitude !== null) {
        validationErrors.push('Location coordinates must be valid numbers or null')
      }
    }

    if (req.body.purchase_price === undefined || req.body.purchase_price === null) {
      validationErrors.push('Purchase price is required')
    } else {
      const purchasePrice = parseFloat(req.body.purchase_price)
      if (isNaN(purchasePrice)) {
        validationErrors.push('Purchase price must be a valid number')
      } else if (purchasePrice <= 0) {
        validationErrors.push('Purchase price must be greater than 0')
      } else if (purchasePrice > 1000000000) { // 1 billion max
        validationErrors.push('Purchase price exceeds maximum allowed value')
      } else if (!isFinite(purchasePrice)) {
        validationErrors.push('Purchase price must be a finite number')
      }
    }

    // Optional field validations
    if (req.body.current_value !== undefined && req.body.current_value !== null) {
      const currentValue = parseFloat(req.body.current_value)
      if (isNaN(currentValue)) {
        validationErrors.push('Current value must be a valid number')
      } else if (currentValue < 0) {
        validationErrors.push('Current value cannot be negative')
      } else if (currentValue > 1000000000) {
        validationErrors.push('Current value exceeds maximum allowed value')
      } else if (!isFinite(currentValue)) {
        validationErrors.push('Current value must be a finite number')
      }
    }

    if (req.body.monthly_rent !== undefined && req.body.monthly_rent !== null) {
      const monthlyRent = parseFloat(req.body.monthly_rent)
      if (isNaN(monthlyRent)) {
        validationErrors.push('Monthly rent must be a valid number')
      } else if (monthlyRent < 0) {
        validationErrors.push('Monthly rent cannot be negative')
      } else if (monthlyRent > 1000000) { // 1 million max per month
        validationErrors.push('Monthly rent exceeds maximum allowed value')
      } else if (!isFinite(monthlyRent)) {
        validationErrors.push('Monthly rent must be a finite number')
      }
    }

    if (req.body.property_type !== undefined && req.body.property_type !== null) {
      if (typeof req.body.property_type !== 'string') {
        validationErrors.push('Property type must be a string')
      } else if (req.body.property_type.trim().length > 100) {
        validationErrors.push('Property type must not exceed 100 characters')
      }
    }

    if (req.body.purchase_date !== undefined && req.body.purchase_date !== null) {
      if (typeof req.body.purchase_date !== 'string') {
        validationErrors.push('Purchase date must be a string')
      } else {
        const purchaseDate = new Date(req.body.purchase_date)
        if (isNaN(purchaseDate.getTime())) {
          validationErrors.push('Purchase date must be a valid date')
        } else {
          const today = new Date()
          today.setHours(23, 59, 59, 999) // End of today
          if (purchaseDate > today) {
            validationErrors.push('Purchase date cannot be in the future')
          }
          // Check for reasonable past date (not more than 200 years ago)
          const minDate = new Date()
          minDate.setFullYear(minDate.getFullYear() - 200)
          if (purchaseDate < minDate) {
            validationErrors.push('Purchase date is too far in the past')
          }
        }
      }
    }

    if (req.body.description !== undefined && req.body.description !== null) {
      if (typeof req.body.description !== 'string') {
        validationErrors.push('Description must be a string')
      } else if (req.body.description.length > 5000) {
        validationErrors.push('Description must not exceed 5000 characters')
      }
    }

    if (req.body.image_url !== undefined && req.body.image_url !== null) {
      if (typeof req.body.image_url !== 'string') {
        validationErrors.push('Image URL must be a string')
      }
      // Allow large base64 payloads — they will be uploaded to Firebase Storage
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      })
    }

    // Sanitize and prepare property data
    const propertyData = {
      name: req.body.name.trim(),
      purchase_price: parseFloat(req.body.purchase_price),
      userId, // Always use authenticated user's ID
      country: 'Pakistan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Handle structured address fields
    if (req.body.addressStreet && req.body.addressCity && req.body.addressProvince) {
      propertyData.addressStreet = req.body.addressStreet.trim()
      propertyData.addressCity = req.body.addressCity.trim()
      propertyData.addressProvince = req.body.addressProvince.trim()
      if (req.body.addressTown) propertyData.addressTown = req.body.addressTown.trim()
      if (req.body.addressPostalCode) propertyData.addressPostalCode = req.body.addressPostalCode.trim()
      // Build legacy address string for backward compatibility
      propertyData.address = `${propertyData.addressStreet}, ${propertyData.addressTown ? propertyData.addressTown + ', ' : ''}${propertyData.addressCity}, ${propertyData.addressProvince}, Pakistan`
    } else if (req.body.address) {
      propertyData.address = req.body.address.trim()
    }

    // Handle location coordinates
    if (req.body.location && typeof req.body.location.latitude === 'number' && typeof req.body.location.longitude === 'number') {
      propertyData.location = {
        latitude: req.body.location.latitude,
        longitude: req.body.location.longitude
      }
    }

    // Add optional fields only if they exist and are valid
    if (req.body.current_value !== undefined && req.body.current_value !== null) {
      propertyData.current_value = parseFloat(req.body.current_value)
    }

    if (req.body.monthly_rent !== undefined && req.body.monthly_rent !== null) {
      propertyData.monthly_rent = parseFloat(req.body.monthly_rent)
    }

    if (req.body.property_type !== undefined && req.body.property_type !== null && req.body.property_type.trim()) {
      propertyData.property_type = req.body.property_type.trim()
    }

    if (req.body.purchase_date !== undefined && req.body.purchase_date !== null && req.body.purchase_date.trim()) {
      propertyData.purchase_date = req.body.purchase_date.trim()
    }

    if (req.body.description !== undefined && req.body.description !== null && req.body.description.trim()) {
      propertyData.description = req.body.description.trim()
    }

    if (req.body.image_url !== undefined && req.body.image_url !== null && req.body.image_url.trim()) {
      propertyData.image_url = req.body.image_url.trim()
    }

    console.log(`📝 Creating property for user: ${userId} (${userEmail})`)

    const docRef = await db
      .collection(PROPERTIES_COLLECTION)
      .add(propertyData)

    // If image is a base64 data URL, upload to Firebase Storage
    if (propertyData.image_url && isBase64DataUrl(propertyData.image_url)) {
      try {
        const publicUrl = await uploadPropertyImage(userId, docRef.id, propertyData.image_url)
        // Update the document with the Storage URL instead of base64
        await db.collection(PROPERTIES_COLLECTION).doc(docRef.id).update({ image_url: publicUrl })
        propertyData.image_url = publicUrl
        console.log(`📸 Property image uploaded to Firebase Storage for property ${docRef.id}`)
      } catch (uploadError) {
        console.error('⚠️ Image upload to Storage failed (property saved without image):', uploadError.message)
        // Remove the base64 from the doc to avoid bloating Firestore
        await db.collection(PROPERTIES_COLLECTION).doc(docRef.id).update({ image_url: null })
        propertyData.image_url = null
      }
    }

    console.log(`✅ Property created: ${docRef.id} for user ${userId}`)

    // Invalidate caches
    const cacheKey = `stats_${userId}`
    cache.del(cacheKey)
    cache.del('global_property_locations_heatmap')
    cache.del('admin_all_properties_list')

    res.status(201).json({
      success: true,
      property: {
        id: docRef.id,
        ...propertyData
      }
    })
  } catch (error) {
    console.error('Error creating property:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create property'
    })
  }
}

/**
 * Update a property
 */
export async function updateProperty(req, res) {
  try {
    const db = getFirestore()
    const { id } = req.params
    const userId = req.user?.uid
    const userEmail = req.user?.email

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    console.log(`📝 Updating property ${id} for user: ${userId} (${userEmail})`)

    const propertyDoc = await db
      .collection(PROPERTIES_COLLECTION)
      .doc(id)
      .get()

    if (!propertyDoc.exists) {
      console.log(`❌ Property ${id} not found`)
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      })
    }

    const propertyData = propertyDoc.data()

    // Verify the property belongs to the user
    if (propertyData.userId !== userId) {
      console.error(`❌ SECURITY WARNING: Attempt to update property ${id} belonging to user ${propertyData.userId} by user ${userId}`)
      return res.status(403).json({
        success: false,
        error: 'Access denied - property does not belong to you'
      })
    }

    // Prevent userId from being changed
    if (req.body.userId && req.body.userId !== userId) {
      console.error(`❌ SECURITY WARNING: Attempt to change userId of property ${id}`)
      return res.status(403).json({
        success: false,
        error: 'Cannot change property ownership'
      })
    }

    const updateData = {
      updatedAt: new Date().toISOString()
    }

    // Handle structured address fields if provided
    if (req.body.addressStreet && req.body.addressCity && req.body.addressProvince) {
      updateData.addressStreet = req.body.addressStreet.trim()
      updateData.addressCity = req.body.addressCity.trim()
      updateData.addressProvince = req.body.addressProvince.trim()
      if (req.body.addressTown) updateData.addressTown = req.body.addressTown.trim()
      if (req.body.addressPostalCode) updateData.addressPostalCode = req.body.addressPostalCode.trim()
      updateData.address = `${updateData.addressStreet}, ${updateData.addressTown ? updateData.addressTown + ', ' : ''}${updateData.addressCity}, ${updateData.addressProvince}, Pakistan`
      updateData.country = 'Pakistan'
    } else if (req.body.address) {
      updateData.address = req.body.address.trim()
    }

    // Handle location coordinates
    if (req.body.location) {
      if (typeof req.body.location.latitude === 'number' && typeof req.body.location.longitude === 'number') {
        updateData.location = {
          latitude: req.body.location.latitude,
          longitude: req.body.location.longitude
        }
      } else if (req.body.location.latitude === null && req.body.location.longitude === null) {
        updateData.location = null
      }
    }

    // Copy and validate other allowed fields from body
    const numericFields = ['purchase_price', 'current_value', 'monthly_rent']
    const stringFields = ['name', 'property_type', 'purchase_date', 'description', 'image_url']
    
    for (const field of numericFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        const val = parseFloat(req.body[field])
        if (isNaN(val) || val < 0 || val > 1000000000 || !isFinite(val)) {
          return res.status(400).json({ success: false, error: `Invalid value for ${field}` })
        }
        updateData[field] = val
      }
    }

    for (const field of stringFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        const val = String(req.body[field]).trim()
        if (field === 'name' && (val.length < 3 || val.length > 200)) {
          return res.status(400).json({ success: false, error: 'Property name must be between 3 and 200 characters' })
        }
        updateData[field] = val
      }
    }

    // If image_url is a base64 data URL, upload to Firebase Storage
    if (updateData.image_url && isBase64DataUrl(updateData.image_url)) {
      try {
        // Delete old image from Storage if it exists
        if (propertyData.image_url) {
          await deletePropertyImage(propertyData.image_url)
        }
        const publicUrl = await uploadPropertyImage(userId, id, updateData.image_url)
        updateData.image_url = publicUrl
        console.log(`📸 Property image updated in Firebase Storage for property ${id}`)
      } catch (uploadError) {
        console.error('⚠️ Image upload failed during update:', uploadError.message)
        delete updateData.image_url // Don't save base64 to Firestore
      }
    }

    // Remove userId from updateData to prevent changes
    delete updateData.userId

    await db
      .collection(PROPERTIES_COLLECTION)
      .doc(id)
      .update(updateData)

    console.log(`✅ Property ${id} updated successfully for user ${userId}`)

    // Invalidate caches
    cache.del(`stats_${userId}`)
    cache.del('global_property_locations_heatmap')
    cache.del('admin_all_properties_list')

    res.json({
      success: true,
      property: {
        id,
        ...propertyData,
        ...updateData
      }
    })
  } catch (error) {
    console.error('Error updating property:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update property'
    })
  }
}

/**
 * Get properties by user ID (for browsing other users' properties)
 * This allows authenticated users to view properties of other users
 */
export async function getPropertiesByUserId(req, res) {
  try {
    const db = getFirestore()
    const { userId: targetUserId } = req.params
    const authenticatedUserId = req.user?.uid
    const userEmail = req.user?.email

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    console.log(`🔍 Fetching properties for user ${targetUserId} (requested by ${authenticatedUserId})`)

    // Query properties for the target user
    const propertiesSnapshot = await db
      .collection(PROPERTIES_COLLECTION)
      .where('userId', '==', targetUserId)
      .orderBy('createdAt', 'desc')
      .get()

    const properties = []
    propertiesSnapshot.forEach(doc => {
      const data = doc.data()
      properties.push({
        id: doc.id,
        ...data
      })
    })

    console.log(`✅ Found ${properties.length} properties for user ${targetUserId}`)

    res.json({
      success: true,
      properties,
      count: properties.length
    })
  } catch (error) {
    console.error('Error getting properties by user ID:', error)

    // Check if error is about missing index
    if (error.message && error.message.includes('index')) {
      return res.status(500).json({
        success: false,
        error: 'Query requires a Firestore index. Please create the required index in Firebase Console.',
        details: error.message,
        hint: 'See firestore.indexes.json for required indexes'
      })
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get properties'
    })
  }
}

/**
 * Delete a property
 */
export async function deleteProperty(req, res) {
  try {
    const db = getFirestore()
    const { id } = req.params
    const userId = req.user?.uid
    const userEmail = req.user?.email

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    console.log(`🗑️ Deleting property ${id} for user: ${userId} (${userEmail})`)

    const propertyDoc = await db
      .collection(PROPERTIES_COLLECTION)
      .doc(id)
      .get()

    if (!propertyDoc.exists) {
      console.log(`❌ Property ${id} not found`)
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      })
    }

    const propertyData = propertyDoc.data()

    // Verify the property belongs to the user
    if (propertyData.userId !== userId) {
      console.error(`❌ SECURITY WARNING: Attempt to delete property ${id} belonging to user ${propertyData.userId} by user ${userId}`)
      return res.status(403).json({
        success: false,
        error: 'Access denied - property does not belong to you'
      })
    }

    // Delete image from Firebase Storage if it exists
    if (propertyData.image_url) {
      await deletePropertyImage(propertyData.image_url)
    }

    await db
      .collection(PROPERTIES_COLLECTION)
      .doc(id)
      .delete()

    console.log(`✅ Property ${id} deleted successfully for user ${userId}`)

    // Invalidate caches
    cache.del(`stats_${userId}`)
    cache.del('global_property_locations_heatmap')
    cache.del('admin_all_properties_list')

    res.json({
      success: true,
      message: 'Property deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting property:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete property'
    })
  }
}

/**
 * Get all property locations for heat map (PUBLIC - no auth required)
 * Returns only non-sensitive data: id, name, location, city
 */
export async function getAllPropertyLocations(req, res) {
  try {
    const db = getFirestore()

    console.log('🗺️ Fetching all property locations for heat map')

    // Check Cache
    const CACHE_KEY = 'global_property_locations_heatmap'
    const cachedLocations = cache.get(CACHE_KEY)
    if (cachedLocations) {
      console.log(`✅ Served ${cachedLocations.length} heatmap locations from CACHE (0 latency)`)
      return res.json({
        success: true,
        locations: cachedLocations,
        count: cachedLocations.length,
        cached: true
      })
    }

    const propertiesSnapshot = await db
      .collection(PROPERTIES_COLLECTION)
      .get()

    const locations = []
    propertiesSnapshot.forEach(doc => {
      const data = doc.data()
      // Only include properties with valid location coordinates
      if (data.location && typeof data.location.latitude === 'number' && typeof data.location.longitude === 'number') {
        locations.push({
          id: doc.id,
          name: data.name,
          city: data.addressCity || null,
          province: data.addressProvince || null,
          propertyType: data.property_type || null,
          location: data.location
        })
      }
    })

    console.log(`✅ Found ${locations.length} properties with location data`)

    // Save to Cache
    cache.set(CACHE_KEY, locations)

    res.json({
      success: true,
      locations,
      count: locations.length,
      cached: false
    })
  } catch (error) {
    console.error('Error getting property locations:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get property locations'
    })
  }
}

/**
 * GET /api/properties/admin/all
 * Get all properties in the system (Admin only)
 */
export async function getAdminAllProperties(req, res) {
  try {
    const db = getFirestore()
    
    console.log(`🛡️ Admin fetching ALL properties across all users`)

    // Check Cache
    const CACHE_KEY = 'admin_all_properties_list'
    const cachedProperties = cache.get(CACHE_KEY)
    if (cachedProperties) {
      console.log(`✅ Admin served ${cachedProperties.length} properties from CACHE`)
      return res.json({
        success: true,
        properties: cachedProperties,
        count: cachedProperties.length,
        cached: true
      })
    }

    const propertiesSnapshot = await db
      .collection(PROPERTIES_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get()

    const properties = []
    propertiesSnapshot.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data()
      })
    })

    console.log(`✅ Admin fetched ${properties.length} properties`)

    // Save to Cache
    cache.set(CACHE_KEY, properties)

    res.json({
      success: true,
      properties,
      count: properties.length,
      cached: false
    })
  } catch (error) {
    console.error('Error getting all properties (Admin):', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get properties'
    })
  }
}

/**
 * GET /api/properties/admin/stats
 * Get platform-wide statistics (Admin only)
 * Optimized version of fetching full lists for counts
 */
export async function getAdminStats(req, res) {
  try {
    const db = getFirestore()
    
    console.log('🛡️ Admin fetching platform-wide stats')

    // Using parallel aggregation for maximum speed
    const [
      usersCount,
      propsCount,
      authRequestsCount,
      flaggedPropsCount,
      allUsersSnapshot // For subscription count
    ] = await Promise.all([
      db.collection('users').count().get(),
      db.collection(PROPERTIES_COLLECTION).count().get(),
      db.collection('property_auth_requests').where('status', '==', 'pending').count().get(),
      db.collection(PROPERTIES_COLLECTION).where('status', '==', 'flagged').count().get(),
      db.collection('users').select('subscriptionPlan').get()
    ])

    // Subscription calculation
    let activeSubscriptions = 0
    allUsersSnapshot.forEach(doc => {
      const plan = doc.data().subscriptionPlan || 'basic'
      if (plan !== 'basic' && plan !== 'free') {
        activeSubscriptions++
      }
    })

    const stats = {
      users: usersCount.data().count,
      properties: propsCount.data().count,
      subscriptions: activeSubscriptions,
      fraudAlerts: flaggedPropsCount.data().count,
      pendingVerifications: authRequestsCount.data().count,
      timestamp: new Date().toISOString()
    }

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error getting admin stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

