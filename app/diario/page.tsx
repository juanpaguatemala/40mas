'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BotonGoogle, useSesion } from '../../components/Sesion';
import { LECTURAS, etiquetaDia, tituloLimpio } from '../../lib/contenido';
import type { Respuestas } from '../../lib/respuestas';

export default function PaginaDiario() {
  const { usuario, api } = useSesion();
  const [datos, setDatos] = useState<Record<string, Respuestas> | null>(null);

  useEffect(() => {
    if (!usuario) return;
    api<{ todas: Record<string, Respuestas> }>('/api/respuestas').then((r) => setDatos(r.ok ? r.data.todas : {}));
  }, [usuario, api]);

  const conTexto = LECTURAS.filter((l) => Object.values(datos?.[l.id] ?? {}).some((v) => v.trim()));

  return (
    <main className="pagina">
      <header className="barra">
        <Link href="/" className="icono-btn" aria-label="Volver al inicio">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="barra-etiqueta">Mi diario</span>
        <span className="icono-btn" aria-hidden="true" />
      </header>
      <h1 className="titulo-dia">Mis respuestas</h1>

      {usuario === null && (
        <section className="aviso-bloqueo">
          <p>Inicia sesión para ver lo que has escrito.</p>
          <BotonGoogle />
        </section>
      )}
      {usuario && !datos && <p className="cargando">Cargando…</p>}
      {usuario && datos && !conTexto.length && <p className="vacio">Aún no has escrito respuestas. Cuando lo hagas, aparecerán aquí.</p>}
      {usuario && datos && conTexto.length > 0 && (
        <div className="diario">
          <p className="ayuda">Solo tú puedes ver lo que escribes.</p>
          {conTexto.map((l) => {
            const r = datos[l.id];
            const preguntas = Object.keys(r).filter((k) => /^q\d+$/.test(k) && r[k].trim()).sort();
            return (
              <article key={l.id} className="entrada">
                <h2>
                  <Link href={`/dia/${l.id}`}>
                    {etiquetaDia(l.dia)} · {tituloLimpio(l.titulo)}
                  </Link>
                </h2>
                {preguntas.map((k) => (
                  <p key={k} className="respuesta">
                    <span className="num-resp">{Number(k.slice(1)) + 1}.</span> {r[k]}
                  </p>
                ))}
                {r.notas?.trim() && <p className="respuesta">{r.notas}</p>}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
