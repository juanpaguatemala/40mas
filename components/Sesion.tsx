'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import { firebase, firebaseConfigurado } from '../lib/firebase';
import type { Estado } from '../lib/desbloqueo';

export interface Cuenta {
  acceso: boolean;
  completados: Record<string, number>;
  ofrenda: { estado: 'pendiente' | 'aprobada' | 'rechazada'; autorizacion: string; creada: number } | null;
  estados: Record<string, Estado>;
  admin: boolean;
}

interface Ctx {
  /** undefined = cargando; null = sin sesión */
  usuario: User | null | undefined;
  cuenta: Cuenta | null;
  error: string | null;
  entrar: () => Promise<void>;
  salir: () => Promise<void>;
  refrescar: () => Promise<void>;
  api: <T = unknown>(ruta: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; data: T }>;
  setCuenta: (c: Cuenta) => void;
}

const SesionCtx = createContext<Ctx | null>(null);

export function useSesion() {
  const c = useContext(SesionCtx);
  if (!c) throw new Error('useSesion fuera de <SesionProvider>');
  return c;
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null | undefined>(firebaseConfigurado ? undefined : null);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [error, setError] = useState<string | null>(firebaseConfigurado ? null : 'firebase-sin-configurar');

  const api = useCallback(
    async <T,>(ruta: string, init?: RequestInit) => {
      const u = firebase().auth.currentUser;
      const token = u ? await u.getIdToken() : '';
      const r = await fetch(ruta, {
        ...init,
        headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      const data = (await r.json().catch(() => ({}))) as T;
      return { ok: r.ok, status: r.status, data };
    },
    [],
  );

  const refrescar = useCallback(async () => {
    const r = await api<Cuenta>('/api/estado');
    if (r.ok) {
      setCuenta(r.data);
      setError(null);
    } else {
      setError('estado');
    }
  }, [api]);

  // Solo con emuladores: permite a las pruebas automáticas iniciar sesión sin la ventana de Google.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_EMULATORS !== '1') return;
    (window as unknown as Record<string, unknown>).__entrarPrueba = (email: string, nombre: string) =>
      signInWithCredential(
        firebase().auth,
        GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name: nombre })),
      );
  }, []);

  useEffect(() => {
    if (!firebaseConfigurado) return;
    return onAuthStateChanged(firebase().auth, (u) => {
      setUsuario(u);
      if (u) void refrescar();
      else setCuenta(null);
    });
  }, [refrescar]);

  const entrar = useCallback(async () => {
    const proveedor = new GoogleAuthProvider();
    proveedor.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(firebase().auth, proveedor);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      // Navegadores que bloquean ventanas emergentes: se usa redirección.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(firebase().auth, proveedor);
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('entrar');
      }
    }
  }, []);

  const salir = useCallback(async () => {
    await signOut(firebase().auth);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cuenta, error, entrar, salir, refrescar, api, setCuenta }),
    [usuario, cuenta, error, entrar, salir, refrescar, api],
  );
  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>;
}

/** Botón «Entrar con Google». */
export function BotonGoogle({ texto = 'Entrar con Google' }: { texto?: string }) {
  const { entrar } = useSesion();
  return (
    <button type="button" className="btn btn-google" onClick={() => void entrar()}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {texto}
    </button>
  );
}
