import { getFirestore } from '../config/firebase_config.js'
import { verifyToken } from '../middlewares/verify.js'
import { uploadPropertyImage, deletePropertyImage, isBase64DataUrl } from '../services/storage.js'
import { PLANS } from './subscription.js'
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

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const {
      sortBy = 'createdAt',
      order = 'desc',
      property_type,
      min_price,
      max_price,
      fields
    } = req.query

    const cacheKey = `portfolio_${userId}_${sortBy}_${order}_${property_type || 'all'}_${min_price || '0'}_${max_price || 'inf'}_${fields || 'full'}`
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      console.log(`🚀 Serving portfolio from cache for user ${userId}`)
      return res.json({ success: true, properties: cachedData, count: cachedData.length, cached: true })
    }

    let query = db.collection(PROPERTIES_COLLECTION).where('userId', '==', userId)

    if (property_type && property_type !== 'All') query = query.where('property_type', '==', property_type)
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

    res.json({ success: true, properties, count: properties.length })
    
    // Cache the result for 60 seconds
    cache.set(cacheKey, properties, 60)
  } catch (error) {
    console.error('Error getting properties:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Get portfolio statistics for the authenticated user
 */
export async function getPropertyStats(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid

    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' })

    const cacheKey = `stats_${userId}`
    const cachedStats = cache.get(cacheKey)
    if (cachedStats) return res.json({ success: true, ...cachedStats, cached: true })

    const snapshot = await db.collection(PROPERTIES_COLLECTION)
      .where('userId', '==', userId)
      .select('purchase_price', 'current_value', 'monthly_rent')
      .get()

    let totalValue = 0, totalRentYearly = 0, totalPurchasePrice = 0
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

    const stats = {
      propertyCount: count,
      totalValue,
      avgROI: totalPurchasePrice > 0 ? (totalRentYearly / totalPurchasePrice) * 100 : 0,
      timestamp: new Date().toISOString()
    }

    cache.set(cacheKey, stats, 300)
    res.json({ success: true, ...stats, cached: false })
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

    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' })

    const propertyDoc = await db.collection(PROPERTIES_COLLECTION).doc(id).get()
    if (!propertyDoc.exists) return res.status(404).json({ success: false, error: 'Property not found' })

    const propertyData = propertyDoc.data()
    if (propertyData.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied - property does not belong to you' })
    }

    res.json({ success: true, property: { id: propertyDoc.id, ...propertyData } })
  } catch (error) {
    console.error('Error getting property:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Create a new property
 */
export async function createProperty(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid

    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' })

    // 1. Plan-based limit check
    const userDoc = await db.collection('users').doc(userId).get()
    const userPlan = userDoc.exists ? (userDoc.data().subscriptionPlan || 'basic') : 'basic'
    const LIMITS = { basic: 5, intermediate: 20, premium: 1000 }
    const currentLimit = LIMITS[userPlan] || 5
    
    const userPropertiesSnapshot = await db.collection(PROPERTIES_COLLECTION).where('userId', '==', userId).get()
    if (userPropertiesSnapshot.size >= currentLimit) {
      return res.status(403).json({ success: false, error: `Property limit reached for ${userPlan} plan` })
    }

    // 2. Pattern Validation (Anti-Junk)
    const alphaNumericRegex = /^(?!\d+$)[a-zA-Z0-9\s.,'-]+$/
    const postalCodeRegex = /^\d{5}$/
    
    const { name, addressCity, addressStreet, addressProvince, addressTown, addressPostalCode, purchase_price } = req.body

    if (!name || name.trim().length < 3 || !alphaNumericRegex.test(name)) {
      return res.status(400).json({ success: false, error: 'Valid property name is required (min 3 chars, must contain letters)' })
    }
    if (!addressCity || !alphaNumericRegex.test(addressCity)) {
       return res.status(400).json({ success: false, error: 'Valid city name is required' })
    }
    if (addressTown && !alphaNumericRegex.test(addressTown)) {
       return res.status(400).json({ success: false, error: 'Town/Neighborhood name must contain letters' })
    }
    if (addressPostalCode && !postalCodeRegex.test(addressPostalCode)) {
       return res.status(400).json({ success: false, error: 'Postal code must be exactly 5 digits' })
    }

    // 3. Duplicate detection
    const duplicateCheck = await db.collection(PROPERTIES_COLLECTION)
      .where('userId', '==', userId)
      .where('name', '==', name.trim())
      .limit(1).get()
    
    if (!duplicateCheck.empty) {
      return res.status(400).json({ success: false, error: `A property with name "${name.trim()}" already exists` })
    }

    // 4. Sanitize and prepare property data
    const pPrice = parseFloat(purchase_price)
    const propertyData = {
      ...req.body,
      name: name.trim(),
      purchase_price: pPrice,
      current_value: req.body.current_value ? parseFloat(req.body.current_value) : pPrice,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const docRef = await db.collection(PROPERTIES_COLLECTION).add(propertyData)

    // Handle image upload if base64
    if (propertyData.image_url && isBase64DataUrl(propertyData.image_url)) {
      try {
        const publicUrl = await uploadPropertyImage(userId, docRef.id, propertyData.image_url)
        await db.collection(PROPERTIES_COLLECTION).doc(docRef.id).update({ image_url: publicUrl })
        propertyData.image_url = publicUrl
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError)
        await db.collection(PROPERTIES_COLLECTION).doc(docRef.id).update({ image_url: null })
      }
    }

    cache.del(`stats_${userId}`)
    cache.del('global_property_locations_heatmap')
    
    // Invalidate all portfolio caches for this user
    const allKeys = cache.keys()
    const userPortfolioKeys = allKeys.filter(k => k.startsWith(`portfolio_${userId}`))
    userPortfolioKeys.forEach(k => cache.del(k))
    cache.del('public_browse_all') // Also clear public browse
    
    res.status(201).json({ success: true, property: { id: docRef.id, ...propertyData } })
  } catch (error) {
    console.error('Error creating property:', error)
    res.status(500).json({ success: false, error: error.message })
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

    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' })

    const propertyDoc = await db.collection(PROPERTIES_COLLECTION).doc(id).get()
    if (!propertyDoc.exists) return res.status(404).json({ success: false, error: 'Property not found' })

    const propertyData = propertyDoc.data()
    if (propertyData.userId !== userId) return res.status(403).json({ success: false, error: 'Access denied' })

    const updateData = { ...req.body, updatedAt: new Date().toISOString() }
    delete updateData.userId // Prevent ownership change

    // Handle image upload if base64
    if (updateData.image_url && isBase64DataUrl(updateData.image_url)) {
      try {
        if (propertyData.image_url) await deletePropertyImage(propertyData.image_url)
        const publicUrl = await uploadPropertyImage(userId, id, updateData.image_url)
        updateData.image_url = publicUrl
      } catch (uploadError) {
        console.error('Image upload update failed:', uploadError)
        delete updateData.image_url
      }
    }

    await db.collection(PROPERTIES_COLLECTION).doc(id).update(updateData)
    cache.del(`stats_${userId}`)
    cache.del('global_property_locations_heatmap')
    
    // Invalidate all portfolio caches for this user
    const allKeys = cache.keys()
    const userPortfolioKeys = allKeys.filter(k => k.startsWith(`portfolio_${userId}`))
    userPortfolioKeys.forEach(k => cache.del(k))
    cache.del('public_browse_all')

    res.json({ success: true, property: { id, ...propertyData, ...updateData } })
  } catch (error) {
    console.error('Error updating property:', error)
    res.status(500).json({ success: false, error: error.message })
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

    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' })

    const propertyDoc = await db.collection(PROPERTIES_COLLECTION).doc(id).get()
    if (!propertyDoc.exists) return res.status(404).json({ success: false, error: 'Property not found' })

    const propertyData = propertyDoc.data()
    if (propertyData.userId !== userId) return res.status(403).json({ success: false, error: 'Access denied' })

    if (propertyData.image_url) await deletePropertyImage(propertyData.image_url).catch(e => console.error('Image delete failed:', e))

    await db.collection(PROPERTIES_COLLECTION).doc(id).delete()
    cache.del(`stats_${userId}`)
    cache.del('global_property_locations_heatmap')
    
    // Invalidate all portfolio caches for this user
    const allKeys = cache.keys()
    const userPortfolioKeys = allKeys.filter(k => k.startsWith(`portfolio_${userId}`))
    userPortfolioKeys.forEach(k => cache.del(k))
    cache.del('public_browse_all')

    res.json({ success: true, message: 'Property deleted successfully' })
  } catch (error) {
    console.error('Error deleting property:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Get properties by user ID
 */
export async function getPropertiesByUserId(req, res) {
  try {
    const db = getFirestore()
    const { userId: targetUserId } = req.params

    const snapshot = await db.collection(PROPERTIES_COLLECTION)
      .where('userId', '==', targetUserId)
      .orderBy('createdAt', 'desc').get()

    const properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, properties, count: properties.length })
  } catch (error) {
    console.error('Error getting properties by user ID:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Heat map locations (PUBLIC)
 */
export async function getAllPropertyLocations(req, res) {
  try {
    const db = getFirestore()
    const CACHE_KEY = 'global_property_locations_heatmap'
    const cached = cache.get(CACHE_KEY)
    if (cached) return res.json({ success: true, locations: cached, count: cached.length, cached: true })

    const snapshot = await db.collection(PROPERTIES_COLLECTION).get()
    const locations = []
    snapshot.forEach(doc => {
      const data = doc.data()
      if (data.location?.latitude && data.location?.longitude) {
        locations.push({
          id: doc.id, name: data.name, city: data.addressCity, 
          propertyType: data.property_type, location: data.location
        })
      }
    })

    cache.set(CACHE_KEY, locations)
    res.json({ success: true, locations, count: locations.length, cached: false })
  } catch (error) {
    console.error('Error heatmap:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Get all properties (Admin only)
 */
export async function getAdminAllProperties(req, res) {
  try {
    const db = getFirestore()
    const snapshot = await db.collection(PROPERTIES_COLLECTION).orderBy('createdAt', 'desc').get()
    const properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ success: true, properties, count: properties.length })
  } catch (error) {
    console.error('Error admin properties:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Get platform stats (Admin only)
 */
export async function getAdminStats(req, res) {
  try {
    const db = getFirestore()
    const [uCount, pCount, aCount, fCount] = await Promise.all([
      db.collection('users').count().get(),
      db.collection(PROPERTIES_COLLECTION).count().get(),
      db.collection('property_auth_requests').where('status', '==', 'pending').count().get(),
      db.collection(PROPERTIES_COLLECTION).where('status', '==', 'flagged').count().get()
    ])

    res.json({
      success: true,
      stats: {
        users: uCount.data().count,
        properties: pCount.data().count,
        fraudAlerts: fCount.data().count,
        pendingVerifications: aCount.data().count,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error admin stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Publicly browse ALL properties with filtering
 */
export async function getPublicProperties(req, res) {
  try {
    const db = getFirestore()
    const { sortBy = 'createdAt', order = 'desc', property_type, min_price, max_price, search } = req.query

    const cacheKey = `public_browse_${sortBy}_${order}_${property_type || 'all'}_${min_price || '0'}_${max_price || 'inf'}_${search || 'none'}`
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      console.log(`🚀 Serving public browse from cache`)
      return res.json({ success: true, properties: cachedData, count: cachedData.length, cached: true })
    }

    let query = db.collection(PROPERTIES_COLLECTION)

    if (property_type && property_type !== 'All') {
      query = query.where('property_type', '==', property_type)
    }
    if (min_price && !isNaN(parseFloat(min_price))) {
      query = query.where('purchase_price', '>=', parseFloat(min_price))
    }
    if (max_price && !isNaN(parseFloat(max_price))) {
      query = query.where('purchase_price', '<=', parseFloat(max_price))
    }

    // IMPORTANT: No orderBy in Firestore if multiple filters are used (to avoid index issues)
    // We sort in-memory instead.
    const hasFilters = (property_type && property_type !== 'All') || min_price || max_price
    if (!hasFilters) {
      const validSort = ['createdAt', 'purchase_price', 'monthly_rent']
      query = query.orderBy(validSort.includes(sortBy) ? sortBy : 'createdAt', order === 'asc' ? 'asc' : 'desc')
    }

    query = query.limit(200)
    const snapshot = await query.get()
    let properties = []
    const searchLower = search?.toLowerCase()

    snapshot.forEach(doc => {
      const data = doc.data()
      if (searchLower) {
        const text = `${data.name} ${data.description} ${data.addressCity}`.toLowerCase()
        if (!text.includes(searchLower)) return
      }
      properties.push({ id: doc.id, ...data })
    })

    if (hasFilters) {
      properties.sort((a, b) => {
        const factor = order === 'asc' ? 1 : -1
        if (sortBy === 'createdAt') return (new Date(b.createdAt) - new Date(a.createdAt)) * factor * -1
        return ((a[sortBy] || 0) - (b[sortBy] || 0)) * factor
      })
    }

    res.json({ success: true, properties, count: properties.length })
    
    // Cache discovery for 5 minutes
    cache.set(cacheKey, properties, 300)
  } catch (error) {
    console.error('Error public browse:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}
