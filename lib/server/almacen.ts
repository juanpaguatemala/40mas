import 'server-only';
import { db } from './firebaseAdmin';

/**
 * Acceso a datos. En producción usa Firestore (Firebase Admin).
 * Con DATOS_EN_MEMORIA=1 guarda todo en memoria: solo para pruebas locales, nunca en Vercel.
 *
 * Firestore:
 *   usuarios/{uid}                       acceso, avance (completados), datos básicos
 *   usuarios/{uid}/respuestas/{lectura}  respuestas escritas por el participante
 *   ofrendas/{uid}                       número de autorización y estado de revisión
 */
type Doc = Record<string, unknown>;

export interface Almacen {
  leer(ruta: string): Promise<Doc | null>;
  fusionar(ruta: string, datos: Doc): Promise<void>;
  listar(coleccion: string): Promise<Doc[]>;
  listarConId(coleccion: string): Promise<{ id: string; datos: Doc }[]>;
}

function fusionProfunda(a: Doc, b: Doc): Doc {
  const out: Doc = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && prev && typeof prev === 'object' ? fusionProfunda(prev as Doc, v as Doc) : v;
  }
  return out;
}

const memoria: Almacen = (() => {
  const g = globalThis as unknown as { __almacen24?: Map<string, Doc> };
  const m = (g.__almacen24 ??= new Map());
  const hijos = (col: string) => [...m.entries()].filter(([k]) => k.startsWith(col + '/') && !k.slice(col.length + 1).includes('/'));
  return {
    async leer(ruta) {
      return m.get(ruta) ?? null;
    },
    async fusionar(ruta, datos) {
      m.set(ruta, fusionProfunda(m.get(ruta) ?? {}, datos));
    },
    async listar(col) {
      return hijos(col).map(([, v]) => v);
    },
    async listarConId(col) {
      return hijos(col).map(([k, v]) => ({ id: k.slice(col.length + 1), datos: v }));
    },
  };
})();

const firestore: Almacen = {
  async leer(ruta) {
    const s = await db().doc(ruta).get();
    return s.exists ? (s.data() as Doc) : null;
  },
  async fusionar(ruta, datos) {
    await db().doc(ruta).set(datos, { merge: true });
  },
  async listar(col) {
    const s = await db().collection(col).limit(1000).get();
    return s.docs.map((d) => d.data());
  },
  async listarConId(col) {
    const s = await db().collection(col).limit(1000).get();
    return s.docs.map((d) => ({ id: d.id, datos: d.data() }));
  },
};

export function almacen(): Almacen {
  if (process.env.DATOS_EN_MEMORIA === '1') {
    if (process.env.VERCEL_ENV === 'production') throw new Error('DATOS_EN_MEMORIA no se puede usar en producción');
    return memoria;
  }
  return firestore;
}

/** Hora del servidor. En modo de prueba (memoria) se puede adelantar para simular el paso de los días. */
export function ahora(): number {
  const g = globalThis as unknown as { __desfase24?: number };
  return Date.now() + (process.env.DATOS_EN_MEMORIA === '1' ? g.__desfase24 ?? 0 : 0);
}

export function adelantarReloj(ms: number) {
  if (process.env.DATOS_EN_MEMORIA !== '1') throw new Error('solo en pruebas');
  const g = globalThis as unknown as { __desfase24?: number };
  g.__desfase24 = (g.__desfase24 ?? 0) + ms;
}
