import indice from './indice.json';
import publico from './publico.json';

/** Bloque de texto del libro, extraído del PDF original sin cambios de redacción. */
export interface Bloque {
  /** p párrafo · h encabezado de ejercicio · q pregunta para responder · li elemento de lista */
  t: 'p' | 'h' | 'q' | 'li';
  s: string;
  b?: boolean;
  i?: boolean;
  c?: boolean;
}

/** Datos públicos de cada lectura (sin el texto, que solo entrega el servidor). */
export interface LecturaMeta {
  id: string;
  dia: number;
  titulo: string;
}

/** Las 41 lecturas en el orden del libro (el día 25 aparece dos veces). */
export const LECTURAS: LecturaMeta[] = indice;

export const INTRODUCCION = publico.introduccion as { titulo: string; bloques: Bloque[] };
export const ORACION_DIFUNTOS = publico.oracion_difuntos as { titulo: string; bloques: Bloque[] };

export function getMeta(id: string): LecturaMeta | undefined {
  return LECTURAS.find((l) => l.id === id);
}

export function vecinas(id: string) {
  const i = LECTURAS.findIndex((l) => l.id === id);
  return { anterior: i > 0 ? LECTURAS[i - 1] : null, siguiente: i >= 0 && i < LECTURAS.length - 1 ? LECTURAS[i + 1] : null };
}

/** Título sin el punto final con el que aparece en el libro. */
export function tituloLimpio(t: string) {
  return t.replace(/\.\s*$/, '');
}

export function etiquetaDia(dia: number) {
  return `Día ${String(dia).padStart(2, '0')}`;
}

export const OFRENDA = {
  monto: 'Q40.00',
  url: 'https://payments.qpaypro.com/checkout/iuKP9yz1l8Pb4892/476253',
};
