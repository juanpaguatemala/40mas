/**
 * Catálogo centralizado de audios de «24 más».
 * Narración original de Juan Pablo Mata, alojada en Cloudflare R2.
 *
 * Reglas:
 * - Solo se registran nombres de archivo confirmados en el bucket. No se construyen
 *   enlaces a partir de títulos del libro.
 * - El título del archivo NO se asume igual al título del capítulo del PDF.
 * - El día 25 tiene dos archivos distintos; se conservan ambos, sin renumerar.
 *   «CUANDO MUERAS» → lectura «Cuando mueras» (p. 63); «ACEPTACION» → «Aceptación» (p. 65).
 *
 * Verificación HTTP (17 nov 2026): los 25 archivos registrados respondieron
 * 206 audio/mpeg con cabecera MP3 válida.
 *
 * ⚠️ El dominio r2.dev es público. Antes de comercializar, cambiar R2_BASE por un
 * mecanismo privado o de URL firmada (ver getAudioUrl).
 */

export const NARRADOR = 'Juan Pablo Mata';

const R2_BASE = 'https://pub-05e2d968dd34408fbd00e1890907c2d8.r2.dev/40%20mas/';

export type EstadoAudio = 'disponible' | 'pendiente';

export interface AudioCapitulo {
  /** Identificador único. Para el día 25 distingue los dos archivos. */
  id: string;
  dia: number;
  /** Título tal como aparece en el nombre del archivo MP3. */
  tituloArchivo: string;
  /** Nombre exacto del archivo en R2 (sin codificar). */
  archivo: string | null;
  estado: EstadoAudio;
  /** Tamaño en bytes comprobado por HTTP; sirve para detectar cambios. */
  bytes?: number;
  /**
   * Id de la lectura en lib/capitulos.json a la que pertenece este audio,
   * asignado cotejando el título del archivo contra el título del libro.
   */
  capituloId: string;
}

const a = (dia: number, tituloArchivo: string, bytes: number, id: string, capituloId: string): AudioCapitulo => {
  const n = String(dia).padStart(2, '0');
  return { id, dia, tituloArchivo, archivo: `${n}. DIA ${n} - ${tituloArchivo}.mp3`, estado: 'disponible', bytes, capituloId };
};
const n2 = (dia: number) => String(dia).padStart(2, '0');

const pendiente = (dia: number, capituloId: string): AudioCapitulo => ({
  id: n2(dia),
  dia,
  tituloArchivo: 'Archivo no identificado en R2',
  archivo: null,
  estado: 'pendiente',
  capituloId,
});

export const AUDIOS: AudioCapitulo[] = [
  a(1, 'HOY', 6354968, n2(1), '01-hoy'),
  a(2, 'SOMOS VALIOSOS', 6832277, n2(2), '02-somos-valiosos'),
  a(3, 'LOS 40', 4302788, n2(3), '03-los-40'),
  a(4, 'UN ENSORDECEDOR SILENCIO', 9428639, n2(4), '04-un-ensordecedor-silencio'),
  a(5, 'EL DOLOR ME ACERCA', 9810654, n2(5), '05-el-dolor-me-acerca'),
  a(6, 'HACERLE FRENTE AL DOLOR CON ESPERANZA', 6975219, n2(6), '06-hacerle-frente-al-dolor-con-esperanza'),
  a(7, 'EMPEZAR A PEDIR PAZ', 5577563, n2(7), '07-empieza-a-pedir-paz'),
  pendiente(8, '08-radiografia-del-luto'),
  a(9, 'PREPARANDO EL CAMINO A LA ADAPTACION', 7552839, n2(9), '09-preparando-el-camino-de-la-adaptacion'),
  a(10, 'LA NEGACION', 6928408, n2(10), '10-la-negacion'),
  a(11, 'LA IRA', 6587353, n2(11), '11-la-ira'),
  a(12, 'LA MALA NEGOCIACION', 6306484, n2(12), '12-la-mala-negociacion'),
  a(13, 'EL DUELO ES ALGO PERSONAL', 4294429, n2(13), '13-el-duelo-algo-muy-personal'),
  a(14, 'LO QUE ACARREA', 8402968, n2(14), '14-el-duelo-y-todo-lo-que-acarrea'),
  a(15, 'NO SUBESTIMES EL DUELO', 8283431, n2(15), '15-no-subestimes-el-duelo'),
  a(16, 'LA DEPRESION', 7944884, n2(16), '16-la-depresion'),
  a(17, 'ENFRENTAMIENTO', 7188378, n2(17), '17-es-momento-de-enfrentarme-a-todo'),
  a(18, 'YA NO QUIERO SEGUIR', 7636430, n2(18), '18-ya-no-quiero-seguir'),
  a(19, 'EL CIELO LO CURA TODO', 7135715, n2(19), '19-no-hay-ninguna-tristeza-que-el-cielo-no-pueda-curar'),
  a(20, 'TODO LLEVA SU TIEMPO', 8532535, n2(20), '20-todo-lleva-su-tiempo'),
  a(21, 'EL TIEMPO ES VALIOSO', 7183363, n2(21), '21-aprovechando-bien-el-tiempo-porque-los-dias-son-malos'),
  a(22, 'EL SUBE Y BAJA', 4072910, n2(22), '22-conociendo-el-sube-y-baja'),
  a(23, 'UNA MARCA', 8400460, n2(23), '23-te-dejara-una-marca-para-siempre'),
  a(24, 'NACES PARA MORIR', 12984636, n2(24), '24-al-morir-naces-para-vivir'),
  // Día 25 duplicado: dos archivos distintos. No eliminar ni renumerar sin autorización.
  a(25, 'ACEPTACION', 3910094, '25-aceptacion', '25-aceptacion'),
  a(25, 'CUANDO MUERAS', 5274125, '25-cuando-mueras', '25-cuando-mueras'),
  pendiente(26, '26-nada-es-para-siempre'),
  pendiente(27, '27-la-linea-de-la-vida-continua'),
  pendiente(28, '28-lo-que-vives-hoy-tambien-pasara'),
  pendiente(29, '29-vamos-a-descubrir'),
  pendiente(30, '30-las-festividades-y-ocasiones-especiales'),
  pendiente(31, '31-carta-de-despedida'),
  pendiente(32, '32-ahora-abre-tu-corazon'),
  pendiente(33, '33-lo-que-nos-dejo-el-luto'),
  pendiente(34, '34-sanar-no-significa-olvidar'),
  pendiente(35, '35-el-verdadero-amor-te-visita'),
  pendiente(36, '36-hoy-ya-no-eres-igual-que-hace-35-dias-atras'),
  pendiente(37, '37-maria-ejemplo-de-sanidad'),
  pendiente(38, '38-el-servicio-sana'),
  pendiente(39, '39-este-no-es-el-cierre'),
  pendiente(40, '40-nos-vemos-luego'),
];

/** URL pública del audio. Punto único a cambiar al migrar a URLs firmadas. */
export function getAudioUrl(audio: AudioCapitulo): string | null {
  if (audio.estado !== 'disponible' || !audio.archivo) return null;
  return R2_BASE + encodeURIComponent(audio.archivo);
}

/** Todos los audios registrados para un día (el 25 devuelve dos). */
export function audiosDelDia(dia: number): AudioCapitulo[] {
  return AUDIOS.filter((x) => x.dia === dia);
}

/** Audio vinculado a una lectura concreta del libro (o null si no hay vínculo). */
export function audioDeLectura(capituloId: string): AudioCapitulo | null {
  return AUDIOS.find((x) => x.capituloId === capituloId) ?? null;
}
