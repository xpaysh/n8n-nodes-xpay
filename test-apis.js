#!/usr/bin/env node

/**
 * API Test Script for n8n-nodes-xpay
 *
 * Run this before publishing to verify all APIs are working.
 *
 * Usage:
 *   node test-apis.js YOUR_API_KEY
 *
 * Or set environment variable:
 *   export XPAY_API_KEY=your_key
 *   node test-apis.js
 */

const API_KEY = process.argv[2] || process.env.XPAY_API_KEY;

if (!API_KEY) {
  console.error('Error: API key required');
  console.error('Usage: node test-apis.js YOUR_API_KEY');
  console.error('   Or: export XPAY_API_KEY=your_key && node test-apis.js');
  process.exit(1);
}

// API URLs (from shared/constants.ts)
const CORE_URL = 'https://7qzahhyw77.execute-api.us-east-1.amazonaws.com/dev';
const ROUTER_URL = 'https://zn3nt9p4tf.execute-api.us-east-1.amazonaws.com/dev';
const SMART_PROXY_URL = 'https://nrq1ybv1u6.execute-api.us-east-1.amazonaws.com/dev';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    const result = await fn();
    console.log('✅ PASSED');
    if (result) {
      console.log(`   └─ ${JSON.stringify(result).slice(0, 100)}${JSON.stringify(result).length > 100 ? '...' : ''}`);
    }
    passed++;
    return result;
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`   └─ Error: ${error.message}`);
    failed++;
    return null;
  }
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           n8n-nodes-xpay API Test Suite                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📍 API Endpoints:');
  console.log(`   Core:   ${CORE_URL}`);
  console.log(`   Router: ${ROUTER_URL}`);
  console.log(`   Proxy:  ${SMART_PROXY_URL}\n`);

  // ============================================
  // GLYPHRUN CORE TESTS
  // ============================================
  console.log('─── Glyphrun Core API ───────────────────────────────────────\n');

  await test('Health check (no auth)', async () => {
    const data = await fetch(`${CORE_URL}/health`).then(r => r.json());
    return { status: data.status || 'ok' };
  });

  const glyphs = await test('List glyphs', async () => {
    const data = await fetchJSON(`${CORE_URL}/glyphs?limit=5`);
    return { count: data.glyphs?.length || 0 };
  });

  if (glyphs?.count > 0) {
    await test('Search glyphs', async () => {
      const data = await fetchJSON(`${CORE_URL}/glyphs?search=analysis&limit=3`);
      return { found: data.glyphs?.length || 0 };
    });

    await test('Get glyph by slug', async () => {
      const listData = await fetchJSON(`${CORE_URL}/glyphs?limit=1`);
      const slug = listData.glyphs?.[0]?.slug;
      if (!slug) throw new Error('No glyphs found');
      const data = await fetchJSON(`${CORE_URL}/glyph/${slug}`);
      return { name: data.name || data.glyph?.name, type: data.type || data.glyph?.type };
    });

    await test('List by category', async () => {
      const data = await fetchJSON(`${CORE_URL}/glyphs?category=launch&limit=3`);
      return { found: data.glyphs?.length || 0 };
    });

    await test('List by type', async () => {
      const data = await fetchJSON(`${CORE_URL}/glyphs?type=prompt&limit=3`);
      return { found: data.glyphs?.length || 0 };
    });
  }

  // ============================================
  // MODEL CATALOG TESTS
  // ============================================
  console.log('\n─── Model Catalog API ──────────────────────────────────────\n');

  const models = await test('List models', async () => {
    const data = await fetchJSON(`${CORE_URL}/models`);
    return { count: data.models?.length || 0 };
  });

  if (models?.count > 0) {
    await test('List models by provider', async () => {
      const data = await fetchJSON(`${CORE_URL}/models?provider=openai`);
      return { found: data.models?.length || 0 };
    });

    await test('Estimate cost', async () => {
      const data = await fetchJSON(`${CORE_URL}/models/estimate`, {
        method: 'POST',
        body: JSON.stringify({
          modelId: 'gpt-4o-mini',
          inputTokens: 1000,
          outputTokens: 500
        })
      });
      return { total: data.total };
    });
  }

  // ============================================
  // COLLECTION TESTS
  // ============================================
  console.log('\n─── Collection API ─────────────────────────────────────────\n');

  await test('List collections', async () => {
    const data = await fetchJSON(`${CORE_URL}/collections`);
    return { count: data.collections?.length || 0 };
  });

  // ============================================
  // WALLET TESTS
  // ============================================
  console.log('\n─── Wallet API ─────────────────────────────────────────────\n');

  await test('Get wallet balance', async () => {
    const data = await fetchJSON(`${CORE_URL}/wallet/balance`);
    return {
      available: data.available ?? data.balance?.available ?? 'N/A',
      currency: data.currency || 'USDC'
    };
  });

  // ============================================
  // ROUTER TESTS
  // ============================================
  console.log('\n─── Glyphrun Router API ────────────────────────────────────\n');

  await test('Router health check', async () => {
    const data = await fetch(`${ROUTER_URL}/health`).then(r => r.json());
    return { status: data.status || 'ok' };
  });

  // Note: Skip actual run test to avoid charges
  console.log('\n   ⚠️  Skipping /run test to avoid charges');
  console.log('   ⚠️  Skipping /run/async test to avoid charges');

  // ============================================
  // SMART PROXY TESTS (optional)
  // ============================================
  console.log('\n─── Smart Proxy API (optional) ─────────────────────────────\n');

  await test('Smart Proxy health check', async () => {
    const response = await fetch(`${SMART_PROXY_URL}/health`);
    if (!response.ok) {
      return { status: 'endpoint may not exist', code: response.status };
    }
    const data = await response.json();
    return { status: data.status || 'ok' };
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Safe to publish.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review errors before publishing.\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error.message);
  process.exit(1);
});
