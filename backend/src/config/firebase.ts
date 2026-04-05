import * as admin from 'firebase-admin';
import path from 'path';
import bcrypt from 'bcrypt';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();
export default admin;

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin';

export async function ensureDefaultAdmin() {
  const adminsRef = db.collection('admins');
  const snapshot = await adminsRef.limit(1).get();

  if (snapshot.empty) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
    await adminsRef.add({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    console.log(`Default admin created (username: ${DEFAULT_ADMIN_USERNAME}, password: ${DEFAULT_ADMIN_PASSWORD})`);
    console.log('⚠️  Please change the default password after first login!');
  }
}
