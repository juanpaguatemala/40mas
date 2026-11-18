import { NextResponse } from 'next/server';
import { usuarioDeRequest } from '../../../../lib/server/firebaseAdmin';
import { obtenerCuenta } from '../../../../lib/server/cuenta';
import { getLectura, preguntas } from '../../../../lib/server/libro';
import { audioDeLectura, getAudioUrl } from '../../../../lib/audios';
import { puedeLeer } from '../../../../lib/desbloqueo';

export const dynamic = 'force-dynamic';

/** Entrega el texto y el audio de una lectura solo si el participante ya la tiene desbloqueada. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioDeRequest(req);
  if (!u) return NextResponse.json({ error: 'sin-sesion' }, { status: 401 });
  const l = getLectura(id);
  if (!l) return NextResponse.json({ error: 'no-existe' }, { status: 404 });

  const cuenta = await obtenerCuenta(u);
  const estado = cuenta.estados[id];
  if (!puedeLeer(estado)) return NextResponse.json({ error: 'bloqueada', estado }, { status: 403 });

  const audio = audioDeLectura(id);
  return NextResponse.json(
    {
      id,
      estado,
      bloques: l.bloques,
      preguntas: preguntas(l),
      audio: audio && getAudioUrl(audio) ? { id: audio.id, dia: audio.dia, url: getAudioUrl(audio) } : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
