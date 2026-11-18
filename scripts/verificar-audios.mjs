// Verifica que cada URL del catálogo responde y entrega audio MP3.
// Uso:  node scripts/verificar-audios.mjs
// (Requiere Node 18+. Lee lib/audios.ts de forma simple, sin compilar.)
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../lib/audios.ts', import.meta.url), 'utf8');
const base = src.match(/R2_BASE = '([^']+)'/)[1];
const entradas = [...src.matchAll(/a\((\d+), '([^']+)', (\d+)/g)].map(([, dia, titulo, bytes]) => {
  const n = String(dia).padStart(2, '0');
  return { dia: Number(dia), archivo: `${n}. DIA ${n} - ${titulo}.mp3`, bytes: Number(bytes) };
});

let fallos = 0;
for (const e of entradas) {
  const url = base + encodeURIComponent(e.archivo);
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-15' } });
    const b = new Uint8Array(await r.arrayBuffer());
    const esMp3 = String.fromCharCode(...b.slice(0, 3)) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    const total = Number((r.headers.get('content-range') || '').split('/')[1]);
    const ok = (r.status === 200 || r.status === 206) && esMp3;
    const cambio = total && total !== e.bytes ? ` (tamaño cambió: ${e.bytes} → ${total})` : '';
    if (!ok) fallos++;
    console.log(`${ok ? '✔' : '✘'} Día ${String(e.dia).padStart(2, '0')}  ${r.status}  ${e.archivo}${cambio}`);
  } catch (err) {
    fallos++;
    console.log(`✘ Día ${String(e.dia).padStart(2, '0')}  ERROR  ${e.archivo}  ${err.message}`);
  }
}
console.log(`\n${entradas.length - fallos}/${entradas.length} audios funcionales.`);
process.exit(fallos ? 1 : 0);
