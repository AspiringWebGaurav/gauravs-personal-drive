#!/usr/bin/env node

/**
 * Background Quota Sync Script
 * 
 * This script syncs the usage_snapshots collection with actual file storage data.
 * Can be run manually or scheduled via cron/task scheduler.
 * 
 * Usage:
 * node scripts/sync-quota.js [--api-key=YOUR_KEY] [--base-url=http://localhost:3000]
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
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function syncQuota(baseUrl, apiKey) {
  console.log('🔄 Starting quota sync...');
  console.log('📍 Base URL:', baseUrl);
  
  const url = `${baseUrl}/api/quota/sync`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (apiKey) {
    options.headers.Authorization = `Bearer ${apiKey}`;
    console.log('🔑 Using API key authentication');
  } else {
    console.log('⚠️  No API key provided - using open endpoint');
  }
  
  try {
    const result = await makeRequest(url, options);
    
    if (result.error) {
      console.error('❌ Sync failed:', result.error);
      console.error('Status code:', result.statusCode);
      process.exit(1);
    }
    
    console.log('✅ Sync completed successfully!');
    console.log('📊 Results:');
    console.log('  - Month:', result.monthKey);
    console.log('  - Physical Storage:', Math.round(result.usedPhysicalBytes / (1024 * 1024)), 'MB');
    console.log('  - Deleted (Billable):', Math.round(result.deletedBytesAccrued / (1024 * 1024)), 'MB');
    console.log('  - Total Billable:', Math.round(result.totalBillable / (1024 * 1024)), 'MB');
    console.log('  - Files:', result.fileCount);
    console.log('  - Synced at:', new Date(result.syncedAt).toLocaleString());
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

async function checkSyncStatus(baseUrl) {
  console.log('📊 Checking sync status...');
  
  const url = `${baseUrl}/api/quota/sync`;
  
  try {
    const result = await makeRequest(url, { method: 'GET' });
    
    if (result.error) {
      console.error('❌ Status check failed:', result.error);
      return;
    }
    
    console.log('📈 Current Status:');
    console.log('  - Month:', result.monthKey);
    
    if (result.snapshot) {
      console.log('  - Physical Storage:', Math.round(result.snapshot.usedPhysicalBytes / (1024 * 1024)), 'MB');
      console.log('  - Deleted Bytes:', Math.round(result.snapshot.deletedBytesAccrued / (1024 * 1024)), 'MB');
      console.log('  - Last Updated:', new Date(result.snapshot.updatedAt.seconds * 1000).toLocaleString());
    } else {
      console.log('  - No snapshot data found');
    }
    
    console.log('  - Recent Syncs:', result.recentSyncs.length);
    if (result.lastSync) {
      console.log('  - Last Sync:', new Date(result.lastSync.seconds * 1000).toLocaleString());
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const apiKey = args.find(arg => arg.startsWith('--api-key='))?.split('=')[1];
const baseUrl = args.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:3000';
const command = args.find(arg => !arg.startsWith('--')) || 'sync';

async function main() {
  console.log('🚀 Quota Sync Tool');
  console.log('==================');
  
  if (command === 'status') {
    await checkSyncStatus(baseUrl);
  } else {
    await syncQuota(baseUrl, apiKey);
  }
}

main().catch(console.error);