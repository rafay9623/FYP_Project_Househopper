import { getFirestore } from '../config/firebase_config.js'

const PYTHON_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5001'
const PROPERTIES_COLLECTION = 'properties'

// Simple in-memory cache for recommendations (propertyId -> recommendations data)
const recommendationsCache = new Map()

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function ratioSimilarity(a, b) {
  if (a === null || b === null) return 0
  const max = Math.max(Math.abs(a), Math.abs(b), 1)
  const diff = Math.abs(a - b)
  return Math.max(0, 1 - diff / max)
}

function computeFirestoreSimilarity(target, candidate) {
  let score = 0
  let totalWeight = 0

  const add = (weight, value) => {
    score += weight * value
    totalWeight += weight
  }

  if (target.property_type && candidate.property_type) {
    add(0.25, target.property_type === candidate.property_type ? 1 : 0)
  }

  if (target.addressCity && candidate.addressCity) {
    add(0.2, target.addressCity === candidate.addressCity ? 1 : 0)
  }

  if (target.addressProvince && candidate.addressProvince) {
    add(0.1, target.addressProvince === candidate.addressProvince ? 1 : 0)
  }

  add(0.2, ratioSimilarity(toNumber(target.purchase_price), toNumber(candidate.purchase_price)))
  add(0.1, ratioSimilarity(toNumber(target.monthly_rent), toNumber(candidate.monthly_rent)))
  add(0.075, ratioSimilarity(toNumber(target.bedrooms), toNumber(candidate.bedrooms)))
  add(0.075, ratioSimilarity(toNumber(target.baths), toNumber(candidate.baths)))

  if (totalWeight === 0) return 0
  return score / totalWeight
}

/**
 * Get property recommendations based on content similarity
 * Uses the Python recommendation microservice (Hugging Face model)
 */
export async function getRecommendations(req, res) {
  try {
    const { propertyId } = req.params
    const userId = req.user?.uid
    const topN = parseInt(req.query.topN) || 5

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      })
    }

    // Check Cache first
    const cacheKey = `${propertyId}_${topN}`
    if (recommendationsCache.has(cacheKey)) {
      console.log(`⚡ Returning cached recommendations for property ${propertyId}`)
      return res.json(recommendationsCache.get(cacheKey))
    }

    console.log(`🤖 Fetching recommendations for property ${propertyId} (user: ${userId})`)

    // Call the Python recommendation service
    const response = await fetch(`${PYTHON_SERVICE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, topN })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Recommendation service error:', errorData)

      // Fallback path:
      // The selected property may exist in Firestore but not in the ML dataset
      // used by the Python service. In that case, build recommendations from
      // Firestore directly so the UI remains usable.
      if (response.status === 404 && errorData?.detail?.includes('not found in the dataset')) {
        const db = getFirestore()
        const targetDoc = await db.collection(PROPERTIES_COLLECTION).doc(propertyId).get()

        if (!targetDoc.exists) {
          return res.status(404).json({
            success: false,
            error: `Property '${propertyId}' not found in Firestore.`,
          })
        }

        const target = { id: targetDoc.id, ...targetDoc.data() }

        let candidatesSnapshot
        if (target.addressCity) {
          candidatesSnapshot = await db
            .collection(PROPERTIES_COLLECTION)
            .where('addressCity', '==', target.addressCity)
            .limit(300)
            .get()
        } else {
          candidatesSnapshot = await db.collection(PROPERTIES_COLLECTION).limit(300).get()
        }

        const fallbackRecommendations = []
        candidatesSnapshot.forEach((doc) => {
          if (doc.id === propertyId) return
          const candidate = { id: doc.id, ...doc.data() }
          const sim = computeFirestoreSimilarity(target, candidate)
          fallbackRecommendations.push({
            id: candidate.id,
            score: sim,
            matchPercentage: Math.round(sim * 100),
            name: candidate.name || 'Property',
            property_type: candidate.property_type || null,
            purchase_price: candidate.purchase_price || null,
            current_value: candidate.current_value || candidate.purchase_price || null,
            monthly_rent: candidate.monthly_rent || null,
            address: candidate.address || null,
            addressCity: candidate.addressCity || null,
            addressProvince: candidate.addressProvince || null,
            description: candidate.description || null,
            image_url: candidate.image_url || null,
            location: candidate.location || null,
            bedrooms: candidate.bedrooms || null,
            baths: candidate.baths || null,
            area: candidate.area || null,
            area_type: candidate.area_type || null,
            purpose: candidate.purpose || null,
            userId: candidate.userId || null,
          })
        })

        const sorted = fallbackRecommendations
          .sort((a, b) => b.score - a.score)
          .slice(0, topN)

        const fallbackPayload = {
          success: true,
          targetPropertyId: propertyId,
          recommendations: sorted,
          count: sorted.length,
          source: 'firestore-fallback',
        }

        recommendationsCache.set(cacheKey, fallbackPayload)
        return res.json(fallbackPayload)
      }

      return res.status(response.status).json({
        success: false,
        error: errorData.detail || 'Recommendation service unavailable'
      })
    }

    const recommendationData = await response.json()

    // The Python service returns full property data from the dataset.
    // We try to enrich from Firestore, but fall back to the Python data if
    // the property isn't stored in Firestore (e.g. Zameen dataset entries).
    const db = getFirestore()
    const enrichedRecommendations = []

    for (const rec of recommendationData.recommendations) {
      const recId = rec.propertyId || rec.id
      let entry = {
        id: recId,
        score: rec.score,
        matchPercentage: Math.round((rec.score || 0) * 100),
        name: rec.name || 'Property',
        property_type: rec.property_type || null,
        purchase_price: rec.purchase_price || rec.price || null,
        current_value: rec.current_value || rec.price || null,
        monthly_rent: rec.monthly_rent || null,
        address: rec.address || rec.location || null,
        addressCity: rec.addressCity || rec.city || null,
        addressProvince: rec.addressProvince || null,
        description: rec.description || null,
        image_url: rec.image_url || null,
        location: rec.location || null,
        bedrooms: rec.bedrooms || null,
        baths: rec.baths || null,
        area: rec.area || null,
        area_type: rec.area_type || null,
        purpose: rec.purpose || null,
      }

      // Try Firestore enrichment (overwrite with richer data if it exists)
      try {
        const doc = await db.collection(PROPERTIES_COLLECTION).doc(recId).get()
        if (doc.exists) {
          const data = doc.data()
          entry = {
            ...entry,
            name: data.name || entry.name,
            property_type: data.property_type || entry.property_type,
            purchase_price: data.purchase_price || entry.purchase_price,
            current_value: data.current_value || entry.current_value,
            monthly_rent: data.monthly_rent || entry.monthly_rent,
            address: data.address || entry.address,
            addressCity: data.addressCity || entry.addressCity,
            addressProvince: data.addressProvince || entry.addressProvince,
            description: data.description || entry.description,
            image_url: data.image_url || entry.image_url,
            location: data.location || entry.location,
            userId: data.userId || null,
          }
        }
      } catch (fetchError) {
        console.warn(`⚠️ Could not fetch property ${recId} from Firestore:`, fetchError.message)
      }

      enrichedRecommendations.push(entry)
    }

    console.log(`✅ Returning ${enrichedRecommendations.length} recommendations for property ${propertyId}`)

    const responsePayload = {
      success: true,
      targetPropertyId: propertyId,
      recommendations: enrichedRecommendations,
      count: enrichedRecommendations.length
    }

    // Save to Cache
    recommendationsCache.set(cacheKey, responsePayload)

    res.json(responsePayload)
  } catch (error) {
    console.error('❌ Error getting recommendations:', error)

    // Check if Python service is unreachable
    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return res.status(503).json({
        success: false,
        error: 'Recommendation service is not running. Please start the Python recommendation service on port 5001.',
        hint: 'Run: cd ml && uvicorn app:app --port 5001'
      })
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recommendations'
    })
  }
}

/**
 * Check health of the recommendation service
 */
export async function getRecommendationHealth(req, res) {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`)
    const data = await response.json()

    res.json({
      success: true,
      service: 'recommendation',
      ...data
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Recommendation service is not running',
      hint: 'Run: cd recommendation-service && python -m uvicorn app:app --port 5001'
    })
  }
}
