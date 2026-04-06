/**
 * Firebase → SQLite migration: EXPORT step
 *
 * Run this script BEFORE switching to the new SQLite-based code:
 *
 *   npx tsx src/export-firebase.ts
 *
 * It reads all Firestore collections and writes them to firebase-export.json
 * in the current directory (or DATA_DIR if set).
 *
 * Then place firebase-export.json in your Docker volume's data directory
 * (/app/data inside the container, or the host path mapped to nico-neco-data).
 * On the first start of the new container the data will be auto-imported.
 */
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const OUTPUT_DIR = process.env.DATA_DIR || '.';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'firebase-export.json');

async function exportCollection(name: string) {
  const snap = await db.collection(name).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function run() {
  console.log('Exporting Firestore data...');

  const [admins, users, sources, tiers, serviceCategories] = await Promise.all([
    exportCollection('admins'),
    exportCollection('users'),
    exportCollection('sources'),
    exportCollection('tiers'),
    exportCollection('serviceCategories'),
  ]);

  const output = { admins, users, sources, tiers, serviceCategories };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`Export complete → ${OUTPUT_FILE}`);
  console.log(`  admins:            ${admins.length}`);
  console.log(`  users:             ${users.length}`);
  console.log(`  sources:           ${sources.length}`);
  console.log(`  tiers:             ${tiers.length}`);
  console.log(`  serviceCategories: ${serviceCategories.length}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Copy firebase-export.json into your Docker volume data directory.');
  console.log('     On a Synology NAS, find the nico-neco-data volume path with:');
  console.log('       docker volume inspect nico-neco-data');
  console.log('  2. Build and start the new container (docker compose up --build -d).');
  console.log('  3. On first start the data is imported automatically.');

  process.exit(0);
}

run().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
