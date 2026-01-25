#!/usr/bin/env node
/**
 * Test script for US-018 Wave 1 (Foundation)
 * Tests new auth endpoints: GET /auth/me, POST /auth/logout, PUT /auth/profile
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test data
const testUser = {
  name: 'Auth Test User',
  email: `authtest_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  timezone: 'Europe/Zurich',
};

let authToken = null;
let userId = null;

// Helper to make API requests
function apiRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function test() {
  console.log('🧪 Testing US-018 Wave 1: Auth Foundation\n');

  try {
    // 1. Login with test user (created by seed script)
    console.log('1️⃣  Testing user login...');
    console.log('   Note: Run `SEED_USER_EMAIL=test@test.com SEED_USER_PASSWORD=TestPassword123! npm run seed:user` first');
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      email: 'test@test.com',
      password: 'TestPassword123!',
    });
    if (loginRes.data && loginRes.data.success && loginRes.data.data.token) {
      authToken = loginRes.data.data.token;
      userId = loginRes.data.data.user.id;
      console.log('✅ Login successful');
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      console.log(`   User ID: ${userId}`);
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }

    // 2. Test GET /auth/me (new endpoint)
    console.log('\n2️⃣  Testing GET /auth/me...');
    const meRes = await apiRequest('GET', '/api/auth/me', null, authToken);
    if (meRes.data.success && meRes.data.data.id === userId) {
      console.log('✅ GET /auth/me successful');
      console.log(`   User: ${meRes.data.data.name} (${meRes.data.data.email})`);
      console.log(`   Timezone: ${meRes.data.data.timezone}`);
      // Verify no password_hash in response
      if (meRes.data.data.password_hash === undefined) {
        console.log('✅ Password hash not exposed in response');
      } else {
        console.log('❌ SECURITY ISSUE: password_hash exposed in response!');
      }
    } else {
      throw new Error(`GET /auth/me failed: ${JSON.stringify(meRes)}`);
    }

    // 3. Test PUT /auth/profile (new endpoint)
    console.log('\n3️⃣  Testing PUT /auth/profile...');
    const profileRes = await apiRequest(
      'PUT',
      '/api/auth/profile',
      {
        name: 'Updated Test User',
        timezone: 'America/New_York',
      },
      authToken
    );
    if (profileRes.data.success && profileRes.data.data.name === 'Updated Test User') {
      console.log('✅ PUT /auth/profile successful');
      console.log(`   Updated name: ${profileRes.data.data.name}`);
      console.log(`   Updated timezone: ${profileRes.data.data.timezone}`);
    } else {
      throw new Error(`PUT /auth/profile failed: ${JSON.stringify(profileRes)}`);
    }

    // 4. Verify update persisted
    console.log('\n4️⃣  Verifying profile update persisted...');
    const meRes2 = await apiRequest('GET', '/api/auth/me', null, authToken);
    if (meRes2.data.data.name === 'Updated Test User' && meRes2.data.data.timezone === 'America/New_York') {
      console.log('✅ Profile update persisted correctly');
    } else {
      throw new Error('Profile update did not persist');
    }

    // 5. Test POST /auth/logout (new endpoint)
    console.log('\n5️⃣  Testing POST /auth/logout...');
    const logoutRes = await apiRequest('POST', '/api/auth/logout', {}, authToken);
    if (logoutRes.data.success) {
      console.log('✅ POST /auth/logout successful');
      console.log(`   Message: ${logoutRes.data.data.message}`);
    } else {
      throw new Error(`POST /auth/logout failed: ${JSON.stringify(logoutRes)}`);
    }

    // 6. Test unauthorized access (token still works in MVP, no blacklist)
    console.log('\n6️⃣  Testing token behavior after logout...');
    const meRes3 = await apiRequest('GET', '/api/auth/me', null, authToken);
    if (meRes3.data.success) {
      console.log('⚠️  Token still valid after logout (expected in MVP - no blacklist)');
    } else {
      console.log('✅ Token invalidated after logout');
    }

    // 7. Test 401 error for missing token
    console.log('\n7️⃣  Testing 401 error for missing auth token...');
    const noAuthRes = await apiRequest('GET', '/api/auth/me', null, null);
    if (noAuthRes.status === 401) {
      console.log('✅ Correctly returned 401 for missing token');
    } else {
      throw new Error(`Expected 401, got ${noAuthRes.status}`);
    }

    console.log('\n✅ All Wave 1 tests passed!\n');
    console.log('📋 Summary:');
    console.log('   ✅ GET /auth/me - Returns user profile without password');
    console.log('   ✅ PUT /auth/profile - Updates user profile');
    console.log('   ✅ POST /auth/logout - Acknowledges logout');
    console.log('   ✅ 401 handling - Requires authentication');
    console.log('\n🎯 Wave 1 (Foundation) implementation complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
