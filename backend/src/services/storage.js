import { getStorage } from '../config/firebase_config.js'
import { randomUUID } from 'crypto'

/**
 * Upload a property image to Firebase Storage.
 *
 * @param {string} userId   – Firebase Auth UID of the property owner
 * @param {string} propertyId – Firestore document ID of the property
 * @param {string} base64Data – Full data-URL string, e.g. "data:image/png;base64,iVBOR..."
 * @returns {Promise<string>} – Public download URL of the uploaded file
 */
export async function uploadPropertyImage(userId, propertyId, base64Data) {
  const bucket = getStorage()
  if (!bucket) {
    throw new Error('Firebase Storage is not initialized')
  }

  // Parse the data URL
  const matches = base64Data.match(/^data:image\/([\w+]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 image data URL')
  }

  const extension = matches[1].replace('+', '') // jpeg, png, webp
  const buffer = Buffer.from(matches[2], 'base64')

  const fileName = `properties/${userId}/${propertyId}/${randomUUID()}.${extension}`
  const file = bucket.file(fileName)

  await file.save(buffer, {
    metadata: {
      contentType: `image/${extension}`,
      metadata: {
        uploadedBy: userId,
        propertyId: propertyId,
      },
    },
  })

  // Make the file publicly readable
  await file.makePublic()

  // Build the public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`
  console.log(`📸 Image uploaded to Firebase Storage: ${publicUrl}`)

  return publicUrl
}

/**
 * Delete a property image from Firebase Storage.
 *
 * @param {string} imageUrl – The full public URL of the image in Firebase Storage
 */
export async function deletePropertyImage(imageUrl) {
  if (!imageUrl) return

  const bucket = getStorage()
  if (!bucket) {
    console.warn('⚠️ Firebase Storage not initialized — cannot delete image')
    return
  }

  // Only handle images stored in our Firebase Storage bucket
  const bucketName = bucket.name
  const prefix = `https://storage.googleapis.com/${bucketName}/`

  if (!imageUrl.startsWith(prefix)) {
    // Not a Firebase Storage URL (e.g. external URL or legacy base64) — skip
    return
  }

  const filePath = imageUrl.replace(prefix, '')

  try {
    await bucket.file(filePath).delete()
    console.log(`🗑️ Image deleted from Firebase Storage: ${filePath}`)
  } catch (error) {
    // File may already be deleted — don't crash
    if (error.code === 404) {
      console.warn(`⚠️ Image not found in Storage (already deleted?): ${filePath}`)
    } else {
      console.error('❌ Error deleting image from Storage:', error.message)
    }
  }
}

/**
 * Check if a string is a base64 data URL (as opposed to a regular URL).
 */
export function isBase64DataUrl(str) {
  return typeof str === 'string' && str.startsWith('data:image/')
}
