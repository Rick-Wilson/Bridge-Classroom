#!/usr/bin/env node
/**
 * Setup Admin Viewer
 *
 * Generates an RSA keypair for the admin and registers with the API.
 * Run this once before users can register.
 *
 * Usage: node scripts/setup-admin.js
 *
 * SAVE THE PRIVATE KEY TO 1PASSWORD - you'll need it for the teacher dashboard!
 */

import crypto from 'crypto';

// Configuration
const API_URL = process.env.API_URL || 'https://api.harmonicsystems.com/api';
const API_KEY = process.env.API_KEY || '';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Rick Wilson';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rick@harmonicsystems.com';

async function main() {
  console.log('='.repeat(70));
  console.log('ADMIN VIEWER SETUP');
  console.log('='.repeat(70));
  console.log();

  // Generate RSA-2048 keypair
  console.log('Generating RSA-2048 keypair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Convert to base64
  const publicKeyBase64 = publicKey.toString('base64');
  const privateKeyBase64 = privateKey.toString('base64');

  console.log('Keypair generated successfully!');
  console.log();

  // Display keys
  console.log('='.repeat(70));
  console.log('SAVE THESE TO 1PASSWORD');
  console.log('='.repeat(70));
  console.log();

  console.log('--- PRIVATE KEY (KEEP SECRET!) ---');
  console.log();
  console.log(privateKeyBase64);
  console.log();

  console.log('--- PUBLIC KEY ---');
  console.log();
  console.log(publicKeyBase64);
  console.log();

  // Also output in PEM format for convenience
  const publicKeyPEM = crypto.createPublicKey({
    key: publicKey,
    format: 'der',
    type: 'spki'
  }).export({ type: 'spki', format: 'pem' });

  const privateKeyPEM = crypto.createPrivateKey({
    key: privateKey,
    format: 'der',
    type: 'pkcs8'
  }).export({ type: 'pkcs8', format: 'pem' });

  console.log('--- PRIVATE KEY (PEM FORMAT) ---');
  console.log();
  console.log(privateKeyPEM);

  console.log('--- PUBLIC KEY (PEM FORMAT) ---');
  console.log();
  console.log(publicKeyPEM);

  console.log('='.repeat(70));
  console.log();

  // Register with API
  if (!API_KEY) {
    console.log('No API_KEY set - skipping API registration.');
    console.log('To register manually, POST to /api/viewers with:');
    console.log(JSON.stringify({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      public_key: publicKeyBase64,
      role: 'admin'
    }, null, 2));
    return;
  }

  console.log(`Registering admin viewer with ${API_URL}...`);
  console.log(`  Name: ${ADMIN_NAME}`);
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Role: admin`);
  console.log();

  try {
    const response = await fetch(`${API_URL}/viewers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        public_key: publicKeyBase64,
        role: 'admin'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Registration failed:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('Registration successful!');
    console.log('Viewer ID:', result.viewer_id);
    console.log();
    console.log('='.repeat(70));
    console.log('SETUP COMPLETE');
    console.log('='.repeat(70));
    console.log();
    console.log('Next steps:');
    console.log('1. Save the PRIVATE KEY to 1Password');
    console.log('2. You\'ll use it to log into the teacher dashboard');
    console.log('3. Users can now register and their data will be shared with you');
  } catch (err) {
    console.error('Registration error:', err.message);
    console.log();
    console.log('You can register manually later by POSTing to /api/viewers');
  }
}

main().catch(console.error);
