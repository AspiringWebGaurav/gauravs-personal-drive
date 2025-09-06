#!/usr/bin/env node

/**
 * Quota System Testing Script
 * 
 * This script tests the complete quota system workflow to identify issues
 * and verify that the progress bar updates correctly.
 * 
 * Usage:
 * node scripts/test-quota-system.js [--base-url=http://localhost:3000]
 */

const https = require('https');
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = res.statusCode >= 200 && res.statusCode < 300 
            ? JSON.parse(data)
            : { error: data, statusCode: res.statusCode };
          resolve(result);
        } catch (e) {
          resolve({ error: data, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testQuotaAPI(baseUrl) {
  console.log('🧪 Testing Quota API...');
  console.log('='.repeat(50));
  
  try {
    // Test real-time calculation
    console.log('📡 Testing real-time calculation...');
    const realTimeResponse = await makeRequest(`${baseUrl}/api/quota?realtime=true&_t=${Date.now()}`);
    
    if (realTimeResponse.error) {
      console.error('❌ Real-time API failed:', realTimeResponse.error);
      return false;
    }
    
    console.log('✅ Real-time API Response:');
    console.log('  - Used:', Math.round(realTimeResponse.usedBytes / (1024 * 1024)), 'MB');
    console.log('  - Limit:', Math.round(realTimeResponse.limitBytes / (1024 * 1024)), 'MB');
    console.log('  - Percentage:', realTimeResponse.usagePercentage + '%');
    console.log('  - Method:', realTimeResponse.calculationMethod);
    console.log('  - Timestamp:', realTimeResponse.timestamp);
    
    if (realTimeResponse.debug) {
      console.log('  - Files (Valid/Total):', realTimeResponse.debug.validFiles + '/' + realTimeResponse.debug.totalFiles);
      if (realTimeResponse.debug.invalidFiles > 0) {
        console.log('  ⚠️  Invalid files found:', realTimeResponse.debug.invalidFiles);
      }
    }
    
    // Test snapshot fallback
    console.log('\n📊 Testing snapshot fallback...');
    const snapshotResponse = await makeRequest(`${baseUrl}/api/quota?realtime=false&_t=${Date.now()}`);
    
    if (snapshotResponse.error) {
      console.error('❌ Snapshot API failed:', snapshotResponse.error);
      return false;
    }
    
    console.log('✅ Snapshot API Response:');
    console.log('  - Used:', Math.round(snapshotResponse.usedBytes / (1024 * 1024)), 'MB');
    console.log('  - Method:', snapshotResponse.calculationMethod);
    
    // Analyze results
    console.log('\n🔍 Analysis:');
    if (realTimeResponse.usagePercentage === 0 && realTimeResponse.usedBytes === 0) {
      console.log('❌ ISSUE: Progress bar stuck at 0% - no usage data found');
      console.log('💡 Possible causes:');
      console.log('   - No files in Firestore "files" collection');
      console.log('   - Files exist but missing "size" field');
      console.log('   - Files have invalid size data (non-number)');
      console.log('   - Real-time calculation is failing');
      
      if (realTimeResponse.debug) {
        if (realTimeResponse.debug.totalFiles === 0) {
          console.log('   🔥 ROOT CAUSE: No files found in Firestore collection');
        } else if (realTimeResponse.debug.validFiles === 0) {
          console.log('   🔥 ROOT CAUSE: Files exist but all have invalid size data');
        }
      }
      return false;
    } else {
      console.log('✅ Progress calculation looks healthy');
      console.log('   - Real usage detected:', realTimeResponse.usagePercentage + '%');
      return true;
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
}

async function testSyncStatus(baseUrl) {
  console.log('\n🔄 Testing Sync Status...');
  console.log('='.repeat(50));
  
  try {
    const syncResponse = await makeRequest(`${baseUrl}/api/quota/sync`);
    
    if (syncResponse.error) {
      console.error('❌ Sync status failed:', syncResponse.error);
      return false;
    }
    
    console.log('✅ Sync Status:');
    console.log('  - Month:', syncResponse.monthKey);
    if (syncResponse.snapshot) {
      console.log('  - Snapshot Physical:', Math.round(syncResponse.snapshot.usedPhysicalBytes / (1024 * 1024)), 'MB');
      console.log('  - Snapshot Updated:', new Date(syncResponse.snapshot.updatedAt.seconds * 1000).toLocaleString());
    } else {
      console.log('  ⚠️  No snapshot data found');
    }
    
    console.log('  - Recent syncs:', syncResponse.recentSyncs.length);
    if (syncResponse.lastSync) {
      console.log('  - Last sync:', new Date(syncResponse.lastSync.seconds * 1000).toLocaleString());
    }
    
    return true;
  } catch (error) {
    console.error('❌ Sync test failed:', error.message);
    return false;
  }
}

async function runManualSync(baseUrl) {
  console.log('\n🔧 Running Manual Sync...');
  console.log('='.repeat(50));
  
  try {
    const syncResponse = await makeRequest(`${baseUrl}/api/quota/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (syncResponse.error) {
      console.error('❌ Manual sync failed:', syncResponse.error);
      return false;
    }
    
    console.log('✅ Manual sync completed:');
    console.log('  - Physical Storage:', Math.round(syncResponse.usedPhysicalBytes / (1024 * 1024)), 'MB');
    console.log('  - Files:', syncResponse.fileCount);
    console.log('  - Total Billable:', Math.round(syncResponse.totalBillable / (1024 * 1024)), 'MB');
    
    return true;
  } catch (error) {
    console.error('❌ Manual sync failed:', error.message);
    return false;
  }
}

function printTestResults(apiHealthy, syncHealthy, manualSyncHealthy) {
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`📡 Quota API Test: ${apiHealthy ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔄 Sync Status Test: ${syncHealthy ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔧 Manual Sync Test: ${manualSyncHealthy ? '✅ PASS' : '❌ FAIL'}`);
  
  if (apiHealthy && syncHealthy && manualSyncHealthy) {
    console.log('\n🎉 ALL TESTS PASSED - Quota system is healthy!');
    console.log('\n📝 Next steps:');
    console.log('   1. Upload a file through your app');
    console.log('   2. Check browser console for quota calculation logs');
    console.log('   3. Verify progress bar updates in real-time');
    console.log('   4. Test manual refresh button in UsageBar component');
  } else {
    console.log('\n🚨 ISSUES DETECTED - See details above');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Verify Firestore "files" collection has documents with valid "size" fields');
    console.log('   2. Check Firebase Admin SDK permissions');
    console.log('   3. Review browser console for detailed error logs');
    console.log('   4. Try uploading a test file and monitor logs');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const baseUrl = args.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:3000';

async function main() {
  console.log('🚀 Quota System Test Suite');
  console.log('Target URL:', baseUrl);
  console.log('='.repeat(50));
  
  const apiHealthy = await testQuotaAPI(baseUrl);
  const syncHealthy = await testSyncStatus(baseUrl);
  const manualSyncHealthy = await runManualSync(baseUrl);
  
  printTestResults(apiHealthy, syncHealthy, manualSyncHealthy);
}

main().catch(console.error);