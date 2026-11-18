import { NextResponse } from 'next/server';
import { usuarioDeRequest } from '../../../lib/server/firebaseAdmin';
import { guardarRespuestas, leerRespuestas, obtenerCuenta, todasLasRespuestas } from '../../../lib/server/cuenta';
import { puedeLeer } from '../../../lib/desbloqueo';

export const dynamic = 'force-dynamic';
const NO_CACHE = { 'Cache-Control': 'private, no-store' };

/** GET /api/respuestas?id=… → respuestas de una lectura; sin id → todas. */
export async function GET(req: Request) {
  const u = await usuarioDeRequest(req);
  if (!u) return NextResponse.json({ error: 'sin-sesion' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (id) return NextResponse.json({ respuestas: await leerRespuestas(u.uid, id) }, { headers: NO_CACHE });
  return NextResponse.json({ todas: await todasLasRespuestas(u.uid) }, { headers: NO_CACHE });
}

/** POST { id, cambios: { q0: '…', notas: '…' } } */
export async function POST(req: Request) {
  const u = await usuarioDeRequest(req);
  if (!u) return NextResponse.json({ error: 'sin-sesion' }, { status: 401 });
  const { id, cambios } = (await req.json().catch(() => ({}))) as { id?: string; cambios?: Record<string, unknown> };
  if (!id || !cambios || typeof cambios !== 'object') return NextResponse.json({ error: 'datos-invalidos' }, { status: 400 });
  const cuenta = await obtenerCuenta(u);
  if (!puedeLeer(cuenta.estados[id])) return NextResponse.json({ error: 'bloqueada' }, { status: 403 });
  await guardarRespuestas(u.uid, id, cambios);
  return NextResponse.json({ ok: true });
}
