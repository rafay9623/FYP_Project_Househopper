import { getFirestore } from '../config/firebase_config.js'
import { getStorage } from '../config/firebase_config.js'
import { randomUUID } from 'crypto'

const AUTH_REQUESTS_COLLECTION = 'property_auth_requests'
const PROPERTIES_COLLECTION = 'properties'
const REGISTRY_COLLECTION = 'admin_property_registry'

/**
 * Helper: Find a match in the admin registry
 */
async function findPropertyMatch(propertyData, db) {
  try {
    const registrySnapshot = await db.collection(REGISTRY_COLLECTION).get()
    const records = []
    registrySnapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }))

    const normalize = (str) => String(str || '').toLowerCase().replace(/\s+/g, ' ').trim()
    
    const propAddress = normalize(propertyData.address)
    const propArea = parseFloat(propertyData.area)
    const propType = normalize(propertyData.property_type)

    for (const record of records) {
      const regAddress = normalize(record.propertyAddress)
      const regArea = parseFloat(record.area)
      const regType = normalize(record.property_type)

      const addressMatch = regAddress === propAddress || regAddress.includes(propAddress) || propAddress.includes(regAddress)
      const areaMatch = Math.abs(regArea - propArea) < 0.1 // Allow small float diff
      const typeMatch = regType === propType

      if (addressMatch && areaMatch && typeMatch) {
        return { status: 'Match Found', matchType: 'exact', record }
      }
      
      if (addressMatch && (areaMatch || typeMatch)) {
        return { status: 'Match Found', matchType: 'partial', record }
      }
    }

    return { status: 'No Match Found', matchType: 'none', record: null }
  } catch (error) {
    console.error('Error in matching logic:', error)
    return { status: 'No Match Found', matchType: 'error', record: null }
  }
}

/**
 * Helper: Upload a base64 document/image to Firebase Storage for verification
 * @returns {Promise<string>} Public URL
 */
async function uploadVerificationDoc(userId, propertyId, base64Data, docType) {
  const bucket = getStorage()
  if (!bucket) throw new Error('Firebase Storage not initialized')

  const matches = base64Data.match(/^data:([\w/+.-]+);base64,(.+)$/)
  if (!matches) throw new Error(`Invalid base64 data for ${docType}`)

  const mimeType = matches[1]
  const buffer = Buffer.from(matches[2], 'base64')

  const extMap = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'application/pdf': 'pdf',
  }
  const extension = extMap[mimeType] || 'bin'

  const fileName = `verification/${userId}/${propertyId}/${docType}_${randomUUID()}.${extension}`
  const file = bucket.file(fileName)

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: { uploadedBy: userId, propertyId, docType },
    },
  })

  await file.makePublic()
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`
  console.log(`📄 Verification doc uploaded: ${publicUrl}`)
  return publicUrl
}

/**
 * Submit an authentication request for a property
 * POST /api/property-auth/request/:propertyId
 */
export async function submitAuthRequest(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid
    const userEmail = req.user?.email
    const { propertyId } = req.params

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

    console.log(`🔐 Authentication request for property ${propertyId} by user ${userId}`)

    // Validate uploaded documents
    const { idCardImage, propertyDocument } = req.body

    if (!idCardImage) {
      return res.status(400).json({
        success: false,
        error: 'ID card image is required for verification'
      })
    }

    if (!propertyDocument) {
      return res.status(400).json({
        success: false,
        error: 'Property document is required for verification'
      })
    }

    // Verify the property exists and belongs to the user
    const propertyDoc = await db
      .collection(PROPERTIES_COLLECTION)
      .doc(propertyId)
      .get()

    if (!propertyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      })
    }

    const propertyData = propertyDoc.data()

    if (propertyData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied — property does not belong to you'
      })
    }

    // Check if there is already a pending or verified request
    const existingSnapshot = await db
      .collection(AUTH_REQUESTS_COLLECTION)
      .where('propertyId', '==', propertyId)
      .where('status', 'in', ['pending', 'verified'])
      .get()

    if (!existingSnapshot.empty) {
      const existingStatus = existingSnapshot.docs[0].data().status
      return res.status(409).json({
        success: false,
        error: existingStatus === 'pending'
          ? 'An authentication request is already pending for this property'
          : 'This property is already verified'
      })
    }

    // Upload documents to Firebase Storage
    let idCardUrl = null
    let propertyDocUrl = null

    try {
      idCardUrl = await uploadVerificationDoc(userId, propertyId, idCardImage, 'id_card')
    } catch (uploadErr) {
      console.error('Failed to upload ID card:', uploadErr.message)
      return res.status(400).json({
        success: false,
        error: 'Failed to upload ID card image. Please try again.'
      })
    }

    try {
      propertyDocUrl = await uploadVerificationDoc(userId, propertyId, propertyDocument, 'property_doc')
    } catch (uploadErr) {
      console.error('Failed to upload property document:', uploadErr.message)
      return res.status(400).json({
        success: false,
        error: 'Failed to upload property document. Please try again.'
      })
    }

    // Perform automatic matching
    const matchResult = await findPropertyMatch(propertyData, db)

    // Create the authentication request
    const requestData = {
      propertyId,
      propertyName: propertyData.name || 'Unnamed Property',
      propertyAddress: propertyData.address || '',
      userId,
      userEmail: userEmail || '',
      status: 'pending',
      // Uploaded document URLs
      idCardUrl,
      propertyDocUrl,
      // Matching
      verificationStatus: matchResult.status,
      matchType: matchResult.matchType,
      matchedPropertyId: matchResult.record?.id || null,
      matchedRegistryData: matchResult.record || null,
      submittedAt: new Date().toISOString(),
      requestTimestamp: new Date().toISOString(),
      reviewedAt: null,
      adminNote: null,
      updatedAt: new Date().toISOString()
    }

    const docRef = await db
      .collection(AUTH_REQUESTS_COLLECTION)
      .add(requestData)

    // Update property document with authStatus and verificationStatus
    await db
      .collection(PROPERTIES_COLLECTION)
      .doc(propertyId)
      .update({
        authStatus: 'pending',
        verificationStatus: matchResult.status,
        updatedAt: new Date().toISOString()
      })

    console.log(`✅ Authentication request ${docRef.id} created for property ${propertyId}`)

    res.status(201).json({
      success: true,
      request: {
        id: docRef.id,
        ...requestData
      }
    })
  } catch (error) {
    console.error('Error submitting auth request:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit authentication request'
    })
  }
}

/**
 * Get authentication requests for the current user
 * GET /api/property-auth/my-requests
 */
export async function getMyAuthRequests(req, res) {
  try {
    const db = getFirestore()
    const userId = req.user?.uid

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    console.log(`🔍 Fetching auth requests for user ${userId}`)

    const snapshot = await db
      .collection(AUTH_REQUESTS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('submittedAt', 'desc')
      .get()

    const requests = []
    snapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data()
      })
    })

    console.log(`✅ Found ${requests.length} auth requests for user ${userId}`)

    res.json({
      success: true,
      requests,
      count: requests.length
    })
  } catch (error) {
    console.error('Error getting user auth requests:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get authentication requests'
    })
  }
}

/**
 * Get all authentication requests (admin only)
 * GET /api/property-auth/admin/all
 * Query params: ?status=pending|verified|rejected
 */
export async function getAllAuthRequests(req, res) {
  try {
    const db = getFirestore()
    const { status } = req.query

    console.log(`🔍 Admin fetching all auth requests (status filter: ${status || 'all'})`)

    let query = db.collection(AUTH_REQUESTS_COLLECTION)

    if (status && ['pending', 'verified', 'rejected'].includes(status)) {
      query = query.where('status', '==', status)
    }

    query = query.orderBy('submittedAt', 'desc')

    const snapshot = await query.get()

    const requests = []
    snapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data()
      })
    })

    // Count by status
    const counts = { pending: 0, verified: 0, rejected: 0 }
    requests.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++
    })

    console.log(`✅ Found ${requests.length} auth requests`)

    res.json({
      success: true,
      requests,
      count: requests.length,
      counts
    })
  } catch (error) {
    console.error('Error getting all auth requests:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get authentication requests'
    })
  }
}

/**
 * Review (approve/reject) an authentication request (admin only)
 * PUT /api/property-auth/admin/review/:requestId
 * Body: { action: 'approve' | 'reject', adminNote?: string }
 */
export async function reviewAuthRequest(req, res) {
  try {
    const db = getFirestore()
    const { requestId } = req.params
    const { action, adminNote } = req.body

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Request ID is required'
      })
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be "approve" or "reject"'
      })
    }

    console.log(`📋 Admin reviewing request ${requestId}: ${action}`)

    // Get the request document
    const requestDoc = await db
      .collection(AUTH_REQUESTS_COLLECTION)
      .doc(requestId)
      .get()

    if (!requestDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Authentication request not found'
      })
    }

    const requestData = requestDoc.data()

    if (requestData.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Request has already been ${requestData.status}`
      })
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected'
    const finalVerificationStatus = action === 'approve' ? 'Verified' : 'Rejected'
    const now = new Date().toISOString()

    // Update the request document
    await db
      .collection(AUTH_REQUESTS_COLLECTION)
      .doc(requestId)
      .update({
        status: newStatus,
        verificationStatus: finalVerificationStatus,
        reviewedAt: now,
        adminNote: adminNote || null,
        updatedAt: now
      })

    // Update the property document's authStatus and verificationStatus
    await db
      .collection(PROPERTIES_COLLECTION)
      .doc(requestData.propertyId)
      .update({
        authStatus: newStatus,
        verificationStatus: finalVerificationStatus,
        updatedAt: now
      })

    console.log(`✅ Request ${requestId} ${newStatus} — property ${requestData.propertyId} updated`)

    res.json({
      success: true,
      request: {
        id: requestId,
        ...requestData,
        status: newStatus,
        reviewedAt: now,
        adminNote: adminNote || null,
        updatedAt: now
      }
    })
  } catch (error) {
    console.error('Error reviewing auth request:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to review authentication request'
    })
  }
}
