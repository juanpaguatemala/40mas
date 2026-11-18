import { calcularEstados } from '../lib/desbloqueo.ts';
import indice from '../lib/indice.json' with { type: 'json' };
const L = indice as {id:string;dia:number}[];
const h = (s: string) => Date.parse(s);  // UTC
let ok = 0, fail = 0;
const eq = (n: string, a: unknown, b: unknown) => { if (a === b) ok++; else { fail++; console.log('FALLA', n, a, '≠', b); } };
// Sin acceso
let e = calcularEstados(L, {}, false, h('2026-11-18T15:00:00Z'));
eq('d1 abierto', e['01-hoy'], 'disponible'); eq('d2 pago', e['02-somos-valiosos'], 'pago');
// Con acceso, terminó d1 hoy (hora GT)
const c: Record<string, number> = { '01-hoy': h('2026-11-18T15:00:00Z') };
e = calcularEstados(L, c, true, h('2026-11-18T23:00:00Z'));
eq('d2 mañana', e['02-somos-valiosos'], 'manana'); eq('d3 anterior', e['03-los-40'], 'anterior');
// 23:30 GT del mismo día = 05:30Z siguiente: sigue siendo mismo día en GT
e = calcularEstados(L, c, true, h('2026-11-19T05:30:00Z'));
eq('d2 aún mañana (GT)', e['02-somos-valiosos'], 'manana');
e = calcularEstados(L, c, true, h('2026-11-19T06:30:00Z'));
eq('d2 abierto tras medianoche GT', e['02-somos-valiosos'], 'disponible');
// Día 25 doble
const c2: Record<string, number> = {};
for (const l of L) if (l.dia <= 24) c2[l.id] = h('2026-12-01T15:00:00Z');
e = calcularEstados(L, c2, true, h('2026-12-02T15:00:00Z'));
eq('25a abierto', e['25-cuando-mueras'], 'disponible'); eq('25b abierto', e['25-aceptacion'], 'disponible');
c2['25-cuando-mueras'] = h('2026-12-02T16:00:00Z');
e = calcularEstados(L, c2, true, h('2026-12-03T15:00:00Z'));
eq('26 espera ambas del 25', e['26-nada-es-para-siempre'], 'anterior');
c2['25-aceptacion'] = h('2026-12-02T17:00:00Z');
e = calcularEstados(L, c2, true, h('2026-12-03T15:00:00Z'));
eq('26 abierto', e['26-nada-es-para-siempre'], 'disponible');
// Acceso retirado
e = calcularEstados(L, c2, false, h('2026-12-03T15:00:00Z'));
eq('sin acceso bloquea completados', e['02-somos-valiosos'], 'pago'); eq('d1 sigue', e['01-hoy'], 'completado');
console.log(`${ok} correctas, ${fail} fallas`);
