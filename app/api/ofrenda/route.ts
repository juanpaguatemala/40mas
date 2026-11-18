import { NextResponse } from 'next/server';
import { usuarioDeRequest } from '../../../lib/server/firebaseAdmin';
import { obtenerCuenta, registrarOfrenda } from '../../../lib/server/cuenta';

export const dynamic = 'force-dynamic';

/** El participante registra el número de autorización de su ofrenda para que el administrador la revise. */
export async function POST(req: Request) {
  const u = await usuarioDeRequest(req);
  if (!u) return NextResponse.json({ error: 'sin-sesion' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { autorizacion?: string; nota?: string };
  const autorizacion = String(body.autorizacion ?? '').trim().slice(0, 60);
  const nota = String(body.nota ?? '').trim().slice(0, 300);
  if (autorizacion.length < 3) return NextResponse.json({ error: 'autorizacion-invalida' }, { status: 400 });

  const r = await registrarOfrenda(u, autorizacion, nota);
  if (r === 'ya-aprobada') return NextResponse.json({ error: 'ya-aprobada' }, { status: 409 });
  return NextResponse.json(await obtenerCuenta(u));
}
