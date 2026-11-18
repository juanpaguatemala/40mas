import 'server-only';
import { createPublicKey, createVerify } from 'node:crypto';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin (solo servidor). Variables de entorno en Vercel:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Nota: no se usa firebase-admin/auth porque depende de un módulo (jose, vía jwks-rsa)
 * que el entorno de funciones de Vercel no puede cargar. El token de sesión se verifica
 * aquí mismo con las llaves públicas de Google, como indica la documentación de Firebase.
 */
function app(): App {
  const existente = getApps()[0];
  if (existente) return existente;
  const projectId = proyecto();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizarClave(process.env.FIREBASE_PRIVATE_KEY);
  if (clientEmail && privateKey) {
    try {
      return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
    } catch (e) {
      // Diagnóstico sin revelar la clave: solo su forma.
      const crudo = process.env.FIREBASE_PRIVATE_KEY ?? '';
      console.error('[24mas] FIREBASE_PRIVATE_KEY no válida', {
        longitud: crudo.length,
        tieneBegin: crudo.includes('BEGIN PRIVATE KEY'),
        tieneEnd: crudo.includes('END PRIVATE KEY'),
        lineasNormalizadas: privateKey.split('\n').length,
      });
      throw e;
    }
  }
  return initializeApp({ projectId });
}

/**
 * Acepta la clave privada tal como se haya pegado en Vercel: con o sin comillas,
 * con \n escritos como texto, con saltos de línea reales o con espacios en su lugar.
 * La reconstruye en formato PEM estándar a partir de su contenido base64.
 */
function normalizarClave(valor: string | undefined): string | undefined {
  if (!valor) return undefined;
  const texto = valor
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .replace(/,\s*$/, '');
  const m = /-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\s\S]*?)-----END \1-----/.exec(texto);
  if (!m) return texto;
  const cuerpo = m[2].replace(/[^A-Za-z0-9+/=]/g, '');
  const lineas = cuerpo.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${m[1]}-----\n${lineas.join('\n')}\n-----END ${m[1]}-----\n`;
}

function proyecto() {
  return (process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '').trim();
}

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

// --- Verificación del token de sesión de Firebase (ID token) ---

const URL_CERTS = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certs: { llaves: Record<string, string>; vence: number } | null = null;

async function certificados(forzar = false): Promise<Record<string, string>> {
  if (!forzar && certs && certs.vence > Date.now()) return certs.llaves;
  const r = await fetch(URL_CERTS, { cache: 'no-store' });
  if (!r.ok) throw new Error(`No se pudieron obtener las llaves de Google (${r.status})`);
  const maxAge = Number(/max-age=(\d+)/.exec(r.headers.get('cache-control') ?? '')?.[1] ?? 3600);
  certs = { llaves: (await r.json()) as Record<string, string>, vence: Date.now() + maxAge * 1000 };
  return certs.llaves;
}

function b64url(s: string) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

interface Claims {
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  email?: string;
  name?: string;
}

/** Verifica un ID token de Firebase y devuelve sus datos, o null si no es válido. */
export async function verificarIdToken(token: string): Promise<Claims | null> {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  let header: { alg?: string; kid?: string };
  let claims: Claims;
  try {
    header = JSON.parse(b64url(partes[0]).toString('utf8'));
    claims = JSON.parse(b64url(partes[1]).toString('utf8'));
  } catch {
    return null;
  }

  const projectId = proyecto();
  const ahora = Math.floor(Date.now() / 1000);
  const datosOk =
    Boolean(projectId) &&
    claims.aud === projectId &&
    claims.iss === `https://securetoken.google.com/${projectId}` &&
    typeof claims.sub === 'string' &&
    claims.sub.length > 0 &&
    claims.sub.length <= 128 &&
    typeof claims.exp === 'number' &&
    claims.exp > ahora &&
    typeof claims.iat === 'number' &&
    claims.iat <= ahora + 300 &&
    (claims.auth_time === undefined || claims.auth_time <= ahora + 300);
  if (!datosOk) return null;

  // Emulador local: los tokens no van firmados.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return claims;

  if (header.alg !== 'RS256' || !header.kid) return null;
  let llaves = await certificados();
  if (!llaves[header.kid]) llaves = await certificados(true);
  const pem = llaves[header.kid];
  if (!pem) return null;
  try {
    const ok = createVerify('RSA-SHA256')
      .update(`${partes[0]}.${partes[1]}`)
      .verify(createPublicKey(pem), b64url(partes[2]));
    return ok ? claims : null;
  } catch {
    return null;
  }
}

/** Verifica el token de Firebase que manda el navegador en «Authorization: Bearer …». */
export async function usuarioDeRequest(req: Request): Promise<Usuario | null> {
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return null;
  const c = await verificarIdToken(token);
  if (!c?.sub) return null;
  return { uid: c.sub, email: c.email ?? '', nombre: c.name ?? '', admin: esAdmin(c.email) };
}