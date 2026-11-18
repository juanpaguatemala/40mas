import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Lector from '../../../components/Lector';
import { LECTURAS, etiquetaDia, getMeta, tituloLimpio, vecinas } from '../../../lib/contenido';

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return LECTURAS.map((l) => ({ id: l.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const l = getMeta((await params).id);
  return { title: l ? `${etiquetaDia(l.dia)} · ${tituloLimpio(l.titulo)} — 24 más` : '24 más' };
}

/** La página solo lleva el título; el texto y el audio los entrega /api/lectura a quien ya tiene el día abierto. */
export default async function PaginaDia({ params }: Params) {
  const l = getMeta((await params).id);
  if (!l) notFound();
  const { anterior, siguiente } = vecinas(l.id);
  const ref = (x: typeof anterior) => (x ? { id: x.id, etiqueta: etiquetaDia(x.dia) } : null);
  return (
    <Lector id={l.id} dia={l.dia} etiqueta={etiquetaDia(l.dia)} titulo={tituloLimpio(l.titulo)} anterior={ref(anterior)} siguiente={ref(siguiente)} />
  );
}
