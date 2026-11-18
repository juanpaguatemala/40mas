import { NextResponse } from 'next/server';
import { usuarioDeRequest } from '../../../lib/server/firebaseAdmin';
import { obtenerCuenta } from '../../../lib/server/cuenta';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = await usuarioDeRequest(req);
  if (!u) return NextResponse.json({ error: 'sin-sesion' }, { status: 401 });
  return NextResponse.json(await obtenerCuenta(u));
}
