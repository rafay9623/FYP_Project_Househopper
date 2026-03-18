import { getFirestore } from '../Configs/firebase_config.js'

const PYTHON_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5001'
const PROPERTIES_COLLECTION = 'properties'

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

    res.json({
      success: true,
      targetPropertyId: propertyId,
      recommendations: enrichedRecommendations,
      count: enrichedRecommendations.length
    })
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
