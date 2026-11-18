/**
 * Reglas de avance de «24 más» (funciones puras, sin dependencias de Firebase).
 *
 * - El día 1 está abierto para cualquier persona con sesión iniciada.
 * - Del día 2 en adelante hace falta la ofrenda aprobada.
 * - Un día se abre a partir del día calendario siguiente (hora de Guatemala)
 *   a aquel en que se terminaron TODAS las lecturas del día anterior.
 * - El día 25 tiene dos lecturas: se abren juntas y ambas cuentan para abrir el 26.
 */

export const ZONA = 'America/Guatemala';

export type Estado = 'completado' | 'disponible' | 'pago' | 'anterior' | 'manana';

export interface LecturaBase {
  id: string;
  dia: number;
}

/** Fecha calendario (AAAA-MM-DD) en Guatemala. */
export function fechaLocal(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

export function calcularEstados(
  lecturas: LecturaBase[],
  completados: Record<string, number>,
  acceso: boolean,
  ahora: number,
): Record<string, Estado> {
  const porDia = new Map<number, LecturaBase[]>();
  for (const l of lecturas) porDia.set(l.dia, [...(porDia.get(l.dia) ?? []), l]);
  const hoy = fechaLocal(ahora);
  const estados: Record<string, Estado> = {};

  for (const l of lecturas) {
    if (l.dia > 1 && !acceso) {
      estados[l.id] = 'pago';
      continue;
    }
    if (completados[l.id]) {
      estados[l.id] = 'completado';
      continue;
    }
    if (l.dia === 1) {
      estados[l.id] = 'disponible';
      continue;
    }
    const previas = porDia.get(l.dia - 1) ?? [];
    if (previas.some((p) => !completados[p.id])) {
      estados[l.id] = 'anterior';
      continue;
    }
    const fin = Math.max(...previas.map((p) => completados[p.id]));
    estados[l.id] = fechaLocal(fin) < hoy ? 'disponible' : 'manana';
  }
  return estados;
}

export function puedeLeer(e: Estado | undefined) {
  return e === 'completado' || e === 'disponible';
}
