import admin from "firebase-admin";

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY
} = process.env;

// Em alguns ambientes, a chave vem com aspas e precisa do replace
const privateKey = FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !privateKey) {
  console.error("Firebase Admin ENV incompleto: verifique variáveis.");
  throw new Error("Firebase Admin ENV missing");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });
}

export const firestore = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
