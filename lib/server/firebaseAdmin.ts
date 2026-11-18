import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin (solo servidor). Variables de entorno en Vercel:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * Con los emuladores (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST) basta el PROJECT_ID.
 */
function app(): App {
  const existente = getApps()[0];
  if (existente) return existente;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }
  return initializeApp({ projectId });
}

export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  admin: boolean;
}

/** Correos con acceso al panel de administración (separados por comas en ADMIN_EMAILS). */
export function esAdmin(email: string | undefined) {
  const lista = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && lista.includes(email.toLowerCase()));
}

/** Verifica el token de Firebase que manda el navegador en «Authorization: Bearer …». */
export async function usuarioDeRequest(req: Request): Promise<Usuario | null> {
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  try {
    const t = await adminAuth().verifyIdToken(token);
    return { uid: t.uid, email: t.email ?? '', nombre: (t.name as string | undefined) ?? '', admin: esAdmin(t.email) };
  } catch {
    return null;
  }
}
