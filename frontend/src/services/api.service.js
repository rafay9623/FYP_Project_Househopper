import { auth } from '@/config/firebase.config'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function fetchWithAuth(url, options = {}) {
  const fullUrl = `${API_BASE_URL}${url}`

  // Get auth token — either from Firebase or from admin bypass session
  let token = null
  try {
    if (auth && auth.currentUser) {
      token = await auth.currentUser.getIdToken()
    }
    // Fallback: check for admin bypass session stored by AuthContext
    if (!token) {
      const adminSession = localStorage.getItem('__admin_session__')
      if (adminSession) {
        token = 'admin-token'
      }
    }
  } catch (error) {
    console.warn('Could not get auth token:', error)
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`)

  try {
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      headers,
    })

    console.log(`📡 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      let errorDetails = null

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        errorDetails = errorData.details || errorData
        console.error('❌ API Error:', errorData)
      } catch (e) {
        try {
          const text = await response.text()
          if (text) {
            errorMessage = text
            console.error('❌ API Error (text):', text)
          }
        } catch (e2) {
          console.error('❌ Could not parse error response')
        }
      }

      const error = new Error(errorMessage)
      error.status = response.status
      error.details = errorDetails
      throw error
    }

    const data = await response.json()
    console.log('✅ API Success:', data)
    return data
  } catch (error) {
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('❌ Network error:', error)
      const networkError = new Error('Unable to connect to server. Please make sure the backend server is running on port 3001.')
      networkError.isNetworkError = true
      throw networkError
    }
    console.error('❌ API request failed:', error)
    throw error
  }
}

// Auth API
export const authApi = {
  signup: async (email, password, userData = {}, idToken = null) => {
    // NEW FLOW: User already created on frontend with Firebase
    // Just create backend profile
    const body = { email, password, ...userData }
    // Include idToken if provided (user already created in Firebase Auth)
    if (idToken) {
      body.idToken = idToken
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Signup failed')
    }
    return await response.json()
  },
  verifyEmail: async (idToken) => {
    // Complete user profile after email verification
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Email verification failed')
    }
    return await response.json()
  },
  login: async (idToken) => {
    // Use direct fetch to include token in body
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }
    return await response.json()
  },
  logout: () => fetchWithAuth('/api/auth/logout', {
    method: 'POST',
  }),
  getProfile: async (idToken) => {
    // Use direct fetch to include token in Authorization header
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      credentials: 'include',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get profile')
    }
    return await response.json()
  },
  updateProfile: (updateData) => fetchWithAuth('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }),
  verifyToken: (idToken) => fetchWithAuth('/api/auth/verify-token', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  }),
}

// Properties API
export const propertiesApi = {
  getAll: async (fields = null) => {
    const url = fields ? `/api/properties?fields=${fields}` : '/api/properties'
    const response = await fetchWithAuth(url)
    // Handle both response formats: { properties: [] } or []
    return response.properties || response
  },
  getStats: async () => {
    const response = await fetchWithAuth('/api/properties/stats')
    return response
  },

  adminGetAll: async () => {
    const response = await fetchAsAdmin('/api/properties/admin/all')
    return response.properties || response
  },
  adminGetStats: async () => {
    const response = await fetchAsAdmin('/api/properties/admin/stats')
    return response.stats || response
  },
  getById: async (id) => {
    const response = await fetchWithAuth(`/api/properties/${id}`)
    return response.property || response
  },
  create: async (data) => {
    const response = await fetchWithAuth('/api/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.property || response
  },
  update: async (id, data) => {
    const response = await fetchWithAuth(`/api/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.property || response
  },
  delete: (id) => fetchWithAuth(`/api/properties/${id}`, {
    method: 'DELETE',
  }),
}

// Portfolios API
export const portfoliosApi = {
  getAll: () => fetchWithAuth('/api/portfolios'),
  getById: (id) => fetchWithAuth(`/api/portfolios/${id}`),
  create: (data) => fetchWithAuth('/api/portfolios', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => fetchWithAuth(`/api/portfolios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => fetchWithAuth(`/api/portfolios/${id}`, {
    method: 'DELETE',
  }),
  addProperty: (portfolioId, propertyId) =>
    fetchWithAuth(`/api/portfolios/${portfolioId}/properties`, {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId }),
    }),
  removeProperty: (portfolioId, propertyId) =>
    fetchWithAuth(`/api/portfolios/${portfolioId}/properties/${propertyId}`, {
      method: 'DELETE',
    }),
}

// Conversations API
export const conversationsApi = {
  adminGetAll: async () => {
    const response = await fetchAsAdmin('/api/conversations/admin/all')
    return response.conversations || response
  },
}

// Users API
export const usersApi = {
  getAll: async () => {
    const response = await fetchWithAuth('/api/users')
    // Handle both response formats: { users: [] } or []
    return response.users || response
  },
  adminGetAll: async () => {
    const response = await fetchAsAdmin('/api/users/admin/all')
    return response.users || response
  },
  getById: async (id) => {
    const response = await fetchWithAuth(`/api/users/${id}`)
    return response.user || response
  },
  getPropertiesByUserId: async (userId) => {
    const response = await fetchWithAuth(`/api/properties/user/${userId}`)
    return response.properties || response
  },
}

// Recommendations API
export const recommendationsApi = {
  getForProperty: async (propertyId, topN = 5) => {
    return fetchWithAuth(`/api/recommendations/${propertyId}?topN=${topN}`)
  },
  checkHealth: async () => {
    return fetchWithAuth('/api/recommendations/service/health')
  },
}

/**
 * Fetch helper for admin-only endpoints.
 * Uses the hardcoded 'admin-token' from the admin bypass session.
 */
async function fetchAsAdmin(url, options = {}) {
  const fullUrl = `${API_BASE_URL}${url}`

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-token',
    ...options.headers,
  }

  console.log(`🛡️ Admin API Request: ${options.method || 'GET'} ${fullUrl}`)

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch (e) { /* ignore parse errors */ }
      const error = new Error(errorMessage)
      error.status = response.status
      throw error
    }

    return await response.json()
  } catch (error) {
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      const networkError = new Error('Unable to connect to server. Please make sure the backend server is running.')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

// Property Authentication API
export const propertyAuthApi = {
  // User endpoints
  submitRequest: (propertyId, { idCardImage, propertyDocument }) =>
    fetchWithAuth(`/api/property-auth/request/${propertyId}`, {
      method: 'POST',
      body: JSON.stringify({ idCardImage, propertyDocument }),
    }),

  getMyRequests: () =>
    fetchWithAuth('/api/property-auth/my-requests'),

  // Admin endpoints
  getAllRequests: async (status) => {
    const query = status ? `?status=${status}` : ''
    return fetchAsAdmin(`/api/property-auth/admin/all${query}`)
  },

  reviewRequest: (requestId, action, adminNote = '') =>
    fetchAsAdmin(`/api/property-auth/admin/review/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ action, adminNote }),
    }),
}

// Subscription API
export const subscriptionApi = {
  getPlan: () => fetchWithAuth('/api/subscription/plan'),

  createCheckout: (planId) =>
    fetchWithAuth('/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  verifySession: (sessionId) =>
    fetchWithAuth('/api/subscription/verify-session', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  createPortalSession: () =>
    fetchWithAuth('/api/subscription/portal', { method: 'POST' }),
}
