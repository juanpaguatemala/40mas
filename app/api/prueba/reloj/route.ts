import { NextResponse } from 'next/server';
import { adelantarReloj } from '../../../../lib/server/almacen';

export const dynamic = 'force-dynamic';

/** Solo para pruebas locales con DATOS_EN_MEMORIA=1: adelanta el reloj del servidor. En producción responde 404. */
export async function POST(req: Request) {
  if (process.env.DATOS_EN_MEMORIA !== '1' || process.env.VERCEL_ENV) return new NextResponse(null, { status: 404 });
  const { horas } = (await req.json().catch(() => ({}))) as { horas?: number };
  adelantarReloj((horas ?? 24) * 3600_000);
  return NextResponse.json({ ok: true });
}
