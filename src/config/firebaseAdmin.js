import "dotenv/config";             
import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";

function loadCredential() {
  const b64 = process.env.FIREBASE_ADMIN_SA_B64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return admin.credential.cert(json);
  }

  const rawJson = process.env.FIREBASE_ADMIN_KEY_JSON;
  if (rawJson) {
    const json = JSON.parse(rawJson);
    return admin.credential.cert(json);
  }

  const keyFile = process.env.FIREBASE_ADMIN_KEY_FILE;
  if (keyFile) {
    const resolved = path.isAbsolute(keyFile) ? keyFile : path.join(process.cwd(), keyFile);
    if (fs.existsSync(resolved)) {
      const json = JSON.parse(fs.readFileSync(resolved, "utf8"));
      return admin.credential.cert(json);
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  const pkB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
  if (!privateKey && pkB64) {
    privateKey = Buffer.from(pkB64, "base64").toString("utf8");
  }

  if (projectId && clientEmail && privateKey) {
    if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    return admin.credential.cert({ projectId, clientEmail, privateKey });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }

  throw new Error(
    "Firebase Admin credentials not provided.\n" +
      "Defina UMA das opções no .env:\n" +
      " - FIREBASE_ADMIN_SA_B64\n" +
      " - FIREBASE_ADMIN_KEY_JSON\n" +
      " - FIREBASE_ADMIN_KEY_FILE\n" +
      " - FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY\n" +
      " - GOOGLE_APPLICATION_CREDENTIALS"
  );
}

let app;
if (!admin.apps?.length) {
  const credential = loadCredential();
  app = admin.initializeApp({ credential });
} else {
  app = admin.app();
}

const firestore = admin.firestore(app);
firestore.settings?.({ ignoreUndefinedProperties: true }); 

export const adminAuth = admin.auth(app);
export { firestore };
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

export { adminAuth as auth };
