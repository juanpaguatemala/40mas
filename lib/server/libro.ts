import 'server-only';
import datos from './capitulos.json';
import type { Bloque } from '../contenido';

export interface Lectura {
  id: string;
  dia: number;
  titulo: string;
  pagina: number;
  bloques: Bloque[];
}

/** Texto completo del libro. Solo se usa en el servidor y se entrega a usuarios autorizados. */
const LIBRO: Lectura[] = datos.dias as Lectura[];

export function getLectura(id: string): Lectura | undefined {
  return LIBRO.find((l) => l.id === id);
}

export function preguntas(l: Lectura): string[] {
  return l.bloques.filter((b) => b.t === 'q').map((b) => b.s);
}
