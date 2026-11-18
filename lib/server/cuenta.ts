import 'server-only';
import { ahora, almacen } from './almacen';
import type { Usuario } from './firebaseAdmin';
import { LECTURAS } from '../contenido';
import { calcularEstados, type Estado } from '../desbloqueo';

export type EstadoOfrenda = 'pendiente' | 'aprobada' | 'rechazada';

export interface Ofrenda {
  uid: string;
  email: string;
  nombre: string;
  autorizacion: string;
  nota: string;
  estado: EstadoOfrenda;
  creada: number;
  revisada?: number;
  revisadaPor?: string;
}

export interface Cuenta {
  acceso: boolean;
  completados: Record<string, number>;
  ofrenda: Pick<Ofrenda, 'estado' | 'autorizacion' | 'creada'> | null;
  estados: Record<string, Estado>;
  admin: boolean;
}

/** Lee (y crea la primera vez) la cuenta del participante. */
export async function obtenerCuenta(u: Usuario): Promise<Cuenta> {
  const a = almacen();
  const [usr, of] = await Promise.all([a.leer(`usuarios/${u.uid}`), a.leer(`ofrendas/${u.uid}`)]);
  if (!usr) {
    await a.fusionar(`usuarios/${u.uid}`, { email: u.email, nombre: u.nombre, creado: ahora(), acceso: false, completados: {} });
  }
  const acceso = usr?.acceso === true;
  const completados = ((usr?.completados ?? {}) as Record<string, number>) ?? {};
  const o = of as Ofrenda | null;
  return {
    acceso,
    completados,
    ofrenda: o ? { estado: o.estado, autorizacion: o.autorizacion, creada: o.creada } : null,
    estados: calcularEstados(LECTURAS, completados, acceso, ahora()),
    admin: u.admin,
  };
}

export async function marcarCompletado(uid: string, id: string) {
  await almacen().fusionar(`usuarios/${uid}`, { completados: { [id]: ahora() } });
}

export async function registrarOfrenda(u: Usuario, autorizacion: string, nota: string) {
  const actual = (await almacen().leer(`ofrendas/${u.uid}`)) as Ofrenda | null;
  if (actual?.estado === 'aprobada') return 'ya-aprobada' as const;
  const of: Ofrenda = { uid: u.uid, email: u.email, nombre: u.nombre, autorizacion, nota, estado: 'pendiente', creada: ahora() };
  await almacen().fusionar(`ofrendas/${u.uid}`, { ...of, revisada: null, revisadaPor: null });
  return 'ok' as const;
}

export async function listarOfrendas(): Promise<Ofrenda[]> {
  const lista = (await almacen().listar('ofrendas')) as unknown as Ofrenda[];
  return lista.sort((x, y) => y.creada - x.creada);
}

export async function revisarOfrenda(uid: string, aprobar: boolean, admin: string) {
  const a = almacen();
  if (!(await a.leer(`ofrendas/${uid}`))) return false;
  await a.fusionar(`ofrendas/${uid}`, { estado: aprobar ? 'aprobada' : 'rechazada', revisada: ahora(), revisadaPor: admin });
  await a.fusionar(`usuarios/${uid}`, { acceso: aprobar, accesoActualizado: ahora() });
  return true;
}

// --- Respuestas del participante ---

export type Respuestas = Record<string, string>;
const CAMPO = /^(q\d{1,2}|notas)$/;

export async function leerRespuestas(uid: string, id: string): Promise<Respuestas> {
  return limpiar(await almacen().leer(`usuarios/${uid}/respuestas/${id}`));
}

export async function guardarRespuestas(uid: string, id: string, cambios: Record<string, unknown>) {
  const datos: Respuestas = {};
  for (const [k, v] of Object.entries(cambios)) {
    if (CAMPO.test(k) && typeof v === 'string') datos[k] = v.slice(0, 20000);
  }
  if (!Object.keys(datos).length) return;
  await almacen().fusionar(`usuarios/${uid}/respuestas/${id}`, { ...datos, actualizado: ahora() });
}

export async function todasLasRespuestas(uid: string): Promise<Record<string, Respuestas>> {
  const filas = await almacen().listarConId(`usuarios/${uid}/respuestas`);
  return Object.fromEntries(filas.map((f) => [f.id, limpiar(f.datos)]));
}

function limpiar(d: Record<string, unknown> | null): Respuestas {
  const r: Respuestas = {};
  for (const [k, v] of Object.entries(d ?? {})) if (CAMPO.test(k) && typeof v === 'string') r[k] = v;
  return r;
}
