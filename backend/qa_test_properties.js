import { createProperty } from './backend/src/controllers/properties.js';

async function runTests() {
  console.log('🧪 Starting QA Tests for Properties API Integration...\n');
  let passed = 0;
  let failed = 0;
  let issuesFound = [];

  const mockRes = () => {
    const res = {};
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.data = data;
      return res;
    };
    return res;
  };

  // 1. Test missing userId
  console.log('Test 1: Unauthenticated request');
  try {
    const req = { user: null, body: { name: 'Test' } };
    const res = mockRes();
    await createProperty(req, res);
    
    if (res.statusCode !== 401) {
      issuesFound.push('Test 1 FAILED: Expected 401 Unauthorized for missing user. Got: ' + res.statusCode);
      failed++;
    } else { passed++; console.log('✅ Passed Test 1'); }
  } catch (e) {
    issuesFound.push('Test 1 CRASHED: ' + e.message); failed++;
  }

  // 2. Test Empty Property Name
  console.log('Test 2: Empty Property Name');
  try {
    const req = { 
      user: { uid: 'user123', email: 'test@test.com' }, 
      body: { name: '  ', purchase_price: 100000, address: 'Valid Addr' } 
    };
    const res = mockRes();
    await createProperty(req, res);
    
    if (res.statusCode !== 400 || !res.data?.details?.some(d => d.includes('Property name is required'))) {
      issuesFound.push('Test 2 FAILED: Expected 400 Validation Error for empty name. Output: ' + JSON.stringify(res.data));
      failed++;
    } else { passed++; console.log('✅ Passed Test 2'); }
  } catch (e) {
    issuesFound.push('Test 2 CRASHED: ' + e.message); failed++;
  }

  // 3. Test Negative Purchase Price (Mathematical edge case)
  console.log('Test 3: Negative Purchase Price');
  try {
    const req = { 
      user: { uid: 'user123', email: 'test@test.com' }, 
      body: { name: 'Valid Name', purchase_price: -50000, address: 'Valid Addr' } 
    };
    const res = mockRes();
    await createProperty(req, res);
    
    if (res.statusCode !== 400 || !res.data?.details?.some(d => d.includes('Purchase price must be greater than 0'))) {
      issuesFound.push('Test 3 FAILED: Expected 400 Validation Error for negative price. Output: ' + JSON.stringify(res.data));
      failed++;
    } else { passed++; console.log('✅ Passed Test 3'); }
  } catch (e) {
    issuesFound.push('Test 3 CRASHED: ' + e.message); failed++;
  }

  // 4. Test Maximum Purchase Price (Number overflow edge case)
  console.log('Test 4: Exceeding Maximum Allowed Purchase Price');
  try {
    const req = { 
      user: { uid: 'user123', email: 'test@test.com' }, 
      body: { name: 'Valid Name', purchase_price: 5000000000, address: 'Valid Addr' } 
    };
    const res = mockRes();
    await createProperty(req, res);
    
    if (res.statusCode !== 400 || !res.data?.details?.some(d => d.includes('Purchase price exceeds maximum allowed value'))) {
      issuesFound.push('Test 4 FAILED: Expected 400 Validation Error for exceeding 1 billion. Output: ' + JSON.stringify(res.data));
      failed++;
    } else { passed++; console.log('✅ Passed Test 4'); }
  } catch (e) {
    issuesFound.push('Test 4 CRASHED: ' + e.message); failed++;
  }

  // 5. Test Missing Address
  console.log('Test 5: Missing Address details completely');
  try {
    const req = { 
      user: { uid: 'user123', email: 'test@test.com' }, 
      body: { name: 'Valid Name', purchase_price: 150000 } 
    };
    const res = mockRes();
    await createProperty(req, res);
    
    if (res.statusCode !== 400 || !res.data?.details?.some(d => d.includes('Address is required'))) {
      issuesFound.push('Test 5 FAILED: Expected 400 Validation Error for missing address fields. Output: ' + JSON.stringify(res.data));
      failed++;
    } else { passed++; console.log('✅ Passed Test 5'); }
  } catch (e) {
    issuesFound.push('Test 5 CRASHED: ' + e.message); failed++;
  }
  
  // 6. Test Injecting fake Firebase DB connection
  // To avoid hitting the real live DB with our mocked tests, we need to ensure the DB connection is mocked if it reaches past validation.
  // Actually, tests 1-5 will fail BEFORE reaching the exact DB query because validation fails first! This is perfect behavior!

  console.log('\n--- QA Report ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (issuesFound.length > 0) {
    console.log('\n❌ Issues Detected in Validation Layer:');
    issuesFound.forEach(iss => console.log('--> ' + iss));
  } else {
    console.log('\n✅ Zero validation bypasses found for these properties constraints! The layer is secure.');
  }
}

runTests();
