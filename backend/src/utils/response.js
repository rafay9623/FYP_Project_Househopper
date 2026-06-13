/**
 * Standard API Response Utility
 */

export function successResponse(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  })
}

export function errorResponse(res, error = 'An error occurred', statusCode = 500, details = null) {
  const payload = {
    success: false,
    error: typeof error === 'string' ? error : error.message || 'Unknown error'
  }
  
  if (details) {
    payload.details = details
  }

  return res.status(statusCode).json(payload)
}

export default {
  success: successResponse,
  error: errorResponse
}
