#!/usr/bin/env node
/**
 * Test script for AI-Powered Conflict Resolution (US-016)
 * 
 * Tests the conflict detection and AI suggestion system with 5 overlapping appointments
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
// Note: In production, create a test user first via seed script (npm run seed:user)
// Then set TEST_USER_ID environment variable to the generated UUID
const USER_ID = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001';

// Helper to make API requests
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID,
      },
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

// Test scenarios
async function runTests() {
  console.log('🧪 AI-Powered Conflict Resolution Test (US-016)\n');
  console.log('=' .repeat(60));
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
  };
  
  // Test 1: Create base appointment
  console.log('\n📝 Test 1: Create base appointment at 10:00-11:00');
  testResults.total++;
  
  const baseTime = new Date();
  baseTime.setHours(10, 0, 0, 0);
  const baseEnd = new Date(baseTime);
  baseEnd.setHours(11, 0, 0, 0);
  
  const base = await apiRequest('POST', '/api/appointments', {
    title: 'Machine setup - CNC Router',
    startTime: baseTime.toISOString(),
    endTime: baseEnd.toISOString(),
    timezone: 'Europe/Zurich',
  });
  
  if (base.status === 201) {
    console.log('✅ Base appointment created');
    testResults.passed++;
  } else {
    console.log('❌ Failed to create base appointment');
    testResults.failed++;
  }
  
  // Test 2: Try to create overlapping appointment (should get AI suggestions)
  console.log('\n📝 Test 2: Create overlapping appointment at 10:30-11:30 (should conflict)');
  testResults.total++;
  
  const overlapTime = new Date(baseTime);
  overlapTime.setMinutes(30);
  const overlapEnd = new Date(overlapTime);
  overlapEnd.setHours(11, 30, 0, 0);
  
  const conflict1 = await apiRequest('POST', '/api/appointments', {
    title: 'Wood cutting - Oak panels',
    startTime: overlapTime.toISOString(),
    endTime: overlapEnd.toISOString(),
    timezone: 'Europe/Zurich',
  });
  
  if (conflict1.status === 409 && conflict1.data.aiSuggestions) {
    console.log('✅ Conflict detected with AI suggestions');
    console.log('   Suggestions:', conflict1.data.aiSuggestions.length);
    console.log('   Pattern:', conflict1.data.conflictPattern);
    
    // Display suggestions
    conflict1.data.aiSuggestions.forEach((sugg, i) => {
      console.log(`\n   Suggestion ${i + 1}: ${sugg.type} (confidence: ${(sugg.confidence * 100).toFixed(0)}%)`);
      console.log(`   ${sugg.description}`);
      if (sugg.proposedTime) {
        const start = new Date(sugg.proposedTime.startTime);
        const end = new Date(sugg.proposedTime.endTime);
        console.log(`   Time: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);
      }
    });
    
    testResults.passed++;
  } else {
    console.log('❌ Expected 409 conflict with AI suggestions');
    testResults.failed++;
  }
  
  // Test 3: Create another non-overlapping appointment
  console.log('\n📝 Test 3: Create second base appointment at 14:00-15:00');
  testResults.total++;
  
  const base2Time = new Date(baseTime);
  base2Time.setHours(14, 0, 0, 0);
  const base2End = new Date(base2Time);
  base2End.setHours(15, 0, 0, 0);
  
  const base2 = await apiRequest('POST', '/api/appointments', {
    title: 'Planning session - Next week schedule',
    startTime: base2Time.toISOString(),
    endTime: base2End.toISOString(),
    timezone: 'Europe/Zurich',
  });
  
  if (base2.status === 201) {
    console.log('✅ Second base appointment created');
    testResults.passed++;
  } else {
    console.log('❌ Failed to create second appointment');
    testResults.failed++;
  }
  
  // Test 4: Create appointment that spans multiple existing ones
  console.log('\n📝 Test 4: Create appointment spanning 9:00-16:00 (multiple conflicts)');
  testResults.total++;
  
  const spanTime = new Date(baseTime);
  spanTime.setHours(9, 0, 0, 0);
  const spanEnd = new Date(spanTime);
  spanEnd.setHours(16, 0, 0, 0);
  
  const conflict2 = await apiRequest('POST', '/api/appointments', {
    title: 'Full workshop maintenance',
    startTime: spanTime.toISOString(),
    endTime: spanEnd.toISOString(),
    timezone: 'Europe/Zurich',
  });
  
  if (conflict2.status === 409 && conflict2.data.aiSuggestions) {
    console.log('✅ Multiple conflicts detected with AI suggestions');
    console.log('   Conflicts:', conflict2.data.conflicts.length);
    console.log('   Suggestions:', conflict2.data.aiSuggestions.length);
    console.log('   Pattern:', conflict2.data.conflictPattern);
    
    // Show top suggestion
    if (conflict2.data.aiSuggestions[0]) {
      const top = conflict2.data.aiSuggestions[0];
      console.log(`\n   Top suggestion: ${top.type} (${(top.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`   ${top.description}`);
    }
    
    testResults.passed++;
  } else {
    console.log('❌ Expected 409 conflict with AI suggestions');
    testResults.failed++;
  }
  
  // Test 5: Try to force create (with ?force=true)
  console.log('\n📝 Test 5: Force create overlapping appointment');
  testResults.total++;
  
  const forceTime = new Date(baseTime);
  forceTime.setMinutes(15);
  const forceEnd = new Date(forceTime);
  forceEnd.setMinutes(45);
  
  const forced = await apiRequest('POST', '/api/appointments?force=true', {
    title: 'Urgent repair - Table saw',
    startTime: forceTime.toISOString(),
    endTime: forceEnd.toISOString(),
    timezone: 'Europe/Zurich',
  });
  
  if (forced.status === 201) {
    console.log('✅ Force create succeeded (bypassed AI suggestions)');
    testResults.passed++;
  } else {
    console.log('❌ Force create failed');
    testResults.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`   Total: ${testResults.total}`);
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch((err) => {
    console.error('❌ Test error:', err);
    process.exit(1);
  });
}

module.exports = { apiRequest, runTests };
