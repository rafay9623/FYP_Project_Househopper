/**
 * Backend API Testing Script
 * Run with: node test-backend.js
 * Make sure backend server is running on port 3001
 */

const API_BASE_URL = 'http://localhost:3001'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(name) {
  log(`\n🧪 Testing: ${name}`, 'cyan')
  testResults.total++
}

function logPass(message) {
  log(`✅ PASS: ${message}`, 'green')
  testResults.passed++
}

function logFail(message, error = '') {
  log(`❌ FAIL: ${message}`, 'red')
  if (error) log(`   Error: ${error}`, 'red')
  testResults.failed++
}

async function testEndpoint(method, path, options = {}) {
  try {
    const url = `${API_BASE_URL}${path}`
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...(options.body && { body: JSON.stringify(options.body) })
    }

    const response = await fetch(url, config)
    const data = await response.json().catch(() => ({}))

    return {
      status: response.status,
      ok: response.ok,
      data
    }
  } catch (error) {
    return {
      error: error.message
    }
  }
}

async function runTests() {
  log('\n════════════════════════════════════════', 'blue')
  log('🚀 Backend API Testing Suite', 'blue')
  log('════════════════════════════════════════\n', 'blue')

  // Test 1: Health Check
  logTest('Health Check Endpoint')
  const health = await testEndpoint('GET', '/api/health')
  if (health.status === 200 && health.data.status === 'ok') {
    logPass('Health check endpoint working')
  } else {
    logFail('Health check endpoint failed', health.error || health.data)
  }

  // Test 2: Root Endpoint
  logTest('Root Endpoint')
  const root = await testEndpoint('GET', '/')
  if (root.status === 200 && root.data.message === 'Backend API') {
    logPass('Root endpoint working')
  } else {
    logFail('Root endpoint failed', root.error || root.data)
  }

  // Test 3: 404 Handler
  logTest('404 Handler')
  const notFound = await testEndpoint('GET', '/api/nonexistent')
  if (notFound.status === 404 && notFound.data.error) {
    logPass('404 handler working correctly')
  } else {
    logFail('404 handler not working', notFound.error || notFound.data)
  }

  // Test 4: Protected Route Without Token
  logTest('Protected Route Without Token')
  const protectedRoute = await testEndpoint('GET', '/api/properties')
  if (protectedRoute.status === 401) {
    logPass('Protected route correctly returns 401 without token')
  } else {
    logFail('Protected route should return 401 without token', `Got status: ${protectedRoute.status}`)
  }

  // Test 5: Invalid Token
  logTest('Protected Route With Invalid Token')
  const invalidToken = await testEndpoint('GET', '/api/properties', {
    headers: {
      'Authorization': 'Bearer invalid-token-12345'
    }
  })
  if (invalidToken.status === 401) {
    logPass('Protected route correctly rejects invalid token')
  } else {
    logFail('Protected route should reject invalid token', `Got status: ${invalidToken.status}`)
  }

  // Test 6: Signup Endpoint (Should fail without proper data)
  logTest('Signup Endpoint Validation')
  const signupEmpty = await testEndpoint('POST', '/api/auth/signup', {
    body: {}
  })
  if (signupEmpty.status === 400 || signupEmpty.status === 500) {
    logPass('Signup endpoint validates input')
  } else {
    logFail('Signup endpoint should validate input', `Got status: ${signupEmpty.status}`)
  }

  // Test 7: Login Endpoint (Should fail without token)
  logTest('Login Endpoint Validation')
  const loginEmpty = await testEndpoint('POST', '/api/auth/login', {
    body: {}
  })
  if (loginEmpty.status === 400) {
    logPass('Login endpoint validates input')
  } else {
    logFail('Login endpoint should validate input', `Got status: ${loginEmpty.status}`)
  }

  // Test 8: CORS Headers
  logTest('CORS Configuration')
  const corsTest = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:5173'
    }
  })
  if (corsTest.headers.get('access-control-allow-origin')) {
    logPass('CORS headers present')
  } else {
    logFail('CORS headers missing')
  }

  // Summary
  log('\n════════════════════════════════════════', 'blue')
  log('📊 Test Summary', 'blue')
  log('════════════════════════════════════════', 'blue')
  log(`Total Tests: ${testResults.total}`, 'cyan')
  log(`Passed: ${testResults.passed}`, 'green')
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green')
  log('════════════════════════════════════════\n', 'blue')

  if (testResults.failed === 0) {
    log('🎉 All tests passed!', 'green')
    process.exit(0)
  } else {
    log('⚠️  Some tests failed. Please review the errors above.', 'yellow')
    process.exit(1)
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  log('❌ This script requires Node.js 18+ or install node-fetch', 'red')
  process.exit(1)
}

// Run tests
runTests().catch(error => {
  log(`❌ Test runner error: ${error.message}`, 'red')
  log('Make sure the backend server is running on http://localhost:3001', 'yellow')
  process.exit(1)
})

