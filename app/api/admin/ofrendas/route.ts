import { NextResponse } from 'next/server';
import { usuarioDeRequest } from '../../../../lib/server/firebaseAdmin';
import { listarOfrendas, revisarOfrenda } from '../../../../lib/server/cuenta';

export const dynamic = 'force-dynamic';

async function soloAdmin(req: Request) {
  const u = await usuarioDeRequest(req);
  if (!u) return { error: NextResponse.json({ error: 'sin-sesion' }, { status: 401 }) };
  if (!u.admin) return { error: NextResponse.json({ error: 'no-autorizado' }, { status: 403 }) };
  return { u };
}

export async function GET(req: Request) {
  const { error } = await soloAdmin(req);
  if (error) return error;
  return NextResponse.json({ ofrendas: await listarOfrendas() }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** { uid, accion: 'aprobar' | 'rechazar' } */
export async function POST(req: Request) {
  const { u, error } = await soloAdmin(req);
  if (error) return error;
  const { uid, accion } = (await req.json().catch(() => ({}))) as { uid?: string; accion?: string };
  if (!uid || (accion !== 'aprobar' && accion !== 'rechazar')) {
    return NextResponse.json({ error: 'datos-invalidos' }, { status: 400 });
  }
  await revisarOfrenda(uid, accion === 'aprobar', u.email);
  return NextResponse.json({ ofrendas: await listarOfrendas() });
}
