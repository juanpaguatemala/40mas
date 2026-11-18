import { NextResponse } from 'next/server';
import { usuarioDeRequest } from '../../../lib/server/firebaseAdmin';
import { marcarCompletado, obtenerCuenta } from '../../../lib/server/cuenta';

export const dynamic = 'force-dynamic';

/** Marca una lectura como terminada (con la hora del servidor, no la del teléfono). */
export async function POST(req: Request) {
  const u = await usuarioDeRequest(req);
  if (!u) return NextResponse.json({ error: 'sin-sesion' }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: 'falta-id' }, { status: 400 });

  const cuenta = await obtenerCuenta(u);
  const estado = cuenta.estados[id];
  if (estado === 'completado') return NextResponse.json({ ok: true });
  if (estado !== 'disponible') return NextResponse.json({ error: 'bloqueada', estado }, { status: 403 });

  await marcarCompletado(u.uid, id);
  return NextResponse.json(await obtenerCuenta(u));
}
