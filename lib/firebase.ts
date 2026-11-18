'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

/** Configuración pública de Firebase (Consola de Firebase → Configuración del proyecto → Tus apps → Web). */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let instancias: { app: FirebaseApp; auth: Auth } | null = null;

export function firebase() {
  if (instancias) return instancias;
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === '1') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  instancias = { app, auth };
  return instancias;
}

export const firebaseConfigurado = Boolean(config.apiKey && config.projectId);
