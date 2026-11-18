'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import AudioPlayer, { type AudioLectura } from './AudioPlayer';
import Texto from './Texto';
import { BotonGoogle, useSesion, type Cuenta } from './Sesion';
import type { Bloque } from '../lib/contenido';
import type { Estado } from '../lib/desbloqueo';
import { useRespuestas } from '../lib/respuestas';

interface Vecina {
  id: string;
  etiqueta: string;
}

interface Props {
  id: string;
  dia: number;
  etiqueta: string;
  titulo: string;
  anterior: Vecina | null;
  siguiente: Vecina | null;
}

interface DatosLectura {
  estado: Estado;
  bloques: Bloque[];
  preguntas: string[];
  audio: AudioLectura | null;
}

type Carga = { tipo: 'cargando' } | { tipo: 'ok'; datos: DatosLectura } | { tipo: 'bloqueada'; estado: Estado } | { tipo: 'error' };
type Seccion = 'lectura' | 'respuesta';

export default function Lector({ id, dia, etiqueta, titulo, anterior, siguiente }: Props) {
  const { usuario, api, setCuenta } = useSesion();
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' });
  const [seccion, setSeccion] = useState<Seccion>('lectura');
  const [enviando, setEnviando] = useState(false);
  const arriba = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    setCarga({ tipo: 'cargando' });
    api<DatosLectura & { error?: string }>(`/api/lectura/${id}`).then((r) => {
      if (!vivo) return;
      if (r.ok) setCarga({ tipo: 'ok', datos: r.data });
      else if (r.status === 403) setCarga({ tipo: 'bloqueada', estado: r.data.estado });
      else setCarga({ tipo: 'error' });
    });
    return () => {
      vivo = false;
    };
  }, [usuario, id, api]);

  const cambiar = (s: Seccion) => {
    setSeccion(s);
    arriba.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const terminar = async () => {
    setEnviando(true);
    const r = await api<Cuenta>('/api/completar', { method: 'POST', body: JSON.stringify({ id }) });
    setEnviando(false);
    if (r.ok) {
      if ('estados' in r.data) setCuenta(r.data);
      setCarga((c) => (c.tipo === 'ok' ? { tipo: 'ok', datos: { ...c.datos, estado: 'completado' } } : c));
    }
  };

  return (
    <main className="pagina">
      <header className="barra">
        <Link href="/" className="icono-btn" aria-label="Volver al inicio">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="barra-etiqueta">{etiqueta} de 40</span>
        <span className="icono-btn" aria-hidden="true" />
      </header>

      <h1 className="titulo-dia">{titulo}</h1>

      {usuario === null && (
        <section className="aviso-bloqueo">
          <Lock aria-hidden size={20} />
          <p>Inicia sesión para leer y escuchar este día. Tu avance y tus respuestas quedan guardados en tu cuenta.</p>
          <BotonGoogle />
        </section>
      )}

      {usuario && carga.tipo === 'cargando' && <p className="cargando">Preparando la lectura…</p>}
      {usuario && carga.tipo === 'error' && <p className="cargando">No pudimos abrir esta lectura. Revisa tu conexión e inténtalo de nuevo.</p>}
      {usuario && carga.tipo === 'bloqueada' && <Bloqueo estado={carga.estado} dia={dia} anterior={anterior} />}

      {usuario && carga.tipo === 'ok' && (
        <>
          <AudioPlayer audio={carga.datos.audio} />

          <div ref={arriba} className="secciones" role="tablist" aria-label="Secciones del día">
            <button type="button" role="tab" aria-selected={seccion === 'lectura'} onClick={() => cambiar('lectura')}>
              Lectura
            </button>
            <button type="button" role="tab" aria-selected={seccion === 'respuesta'} onClick={() => cambiar('respuesta')}>
              Mi respuesta
            </button>
          </div>

          {dia === 18 && (
            <aside className="apoyo" aria-label="Si necesitas ayuda ahora">
              <strong>Si hoy sientes que no puedes seguir,</strong> no lo vivas a solas. Habla ahora con alguien de confianza, con tu
              sacerdote o con un profesional, y si estás en peligro llama a los servicios de emergencia de tu país.
            </aside>
          )}

          <div role="tabpanel" hidden={seccion !== 'lectura'}>
            <Texto bloques={carga.datos.bloques} />
            <div className="acciones">
              <button type="button" className="btn btn-sec" onClick={() => cambiar('respuesta')}>
                Escribir mi respuesta
              </button>
            </div>
          </div>

          <div role="tabpanel" hidden={seccion !== 'respuesta'}>
            <Respuestas id={id} preguntas={carga.datos.preguntas} />
          </div>

          <div className="cierre">
            {carga.datos.estado === 'completado' ? (
              <p className="completado">
                <Check aria-hidden size={18} /> Terminaste este día.{' '}
                {siguiente ? 'El siguiente se abre a partir de mañana.' : 'Has completado la guía.'}
              </p>
            ) : (
              <button type="button" className="btn" onClick={() => void terminar()} disabled={enviando}>
                {enviando ? 'Guardando…' : 'Terminé este día'}
              </button>
            )}
            <nav className="vecinas" aria-label="Otros días">
              {anterior ? <Link href={`/dia/${anterior.id}`}>← {anterior.etiqueta}</Link> : <span />}
              {siguiente ? <Link href={`/dia/${siguiente.id}`}>{siguiente.etiqueta} →</Link> : <Link href="/oracion">Oración final →</Link>}
            </nav>
          </div>
        </>
      )}
    </main>
  );
}

function Bloqueo({ estado, dia, anterior }: { estado: Estado; dia: number; anterior: Vecina | null }) {
  if (estado === 'pago') {
    return (
      <section className="aviso-bloqueo">
        <Lock aria-hidden size={20} />
        <p>Para continuar desde el día 2 da tu ofrenda. Cuando la confirmemos, se abrirá tu camino de 40 días.</p>
        <Link href="/#ofrenda" className="btn">
          Dar mi ofrenda
        </Link>
      </section>
    );
  }
  if (estado === 'manana') {
    return (
      <section className="aviso-bloqueo">
        <Lock aria-hidden size={20} />
        <p>
          <strong>Cada día tiene su propio afán.</strong> El {`día ${dia}`} se abre mañana. Hoy puedes volver a leer y escuchar el
          día anterior o escribir en tus respuestas.
        </p>
        {anterior && (
          <Link href={`/dia/${anterior.id}`} className="btn btn-sec">
            Volver al {anterior.etiqueta.toLowerCase()}
          </Link>
        )}
      </section>
    );
  }
  return (
    <section className="aviso-bloqueo">
      <Lock aria-hidden size={20} />
      <p>Este día se abre cuando termines el anterior.</p>
      <Link href="/" className="btn btn-sec">
        Ir a mi camino
      </Link>
    </section>
  );
}

function Respuestas({ id, preguntas }: { id: string; preguntas: string[] }) {
  const { valores, cambiar, estado } = useRespuestas(id);
  const cargando = estado === 'cargando';
  const mensaje =
    estado === 'guardando' ? 'Guardando…' : estado === 'error' ? 'No se pudo guardar. Revisa tu conexión.' : 'Guardado en tu cuenta. Solo tú lo ves.';
  return (
    <div className="respuestas">
      {preguntas.map((p, i) => (
        <div key={i} className="campo">
          <label htmlFor={`${id}-q${i}`}>{p}</label>
          <textarea id={`${id}-q${i}`} rows={4} value={valores[`q${i}`] ?? ''} onChange={(e) => cambiar(`q${i}`, e.target.value)} disabled={cargando} />
        </div>
      ))}
      <div className="campo">
        <label htmlFor={`${id}-notas`}>{preguntas.length ? 'Lo que quiero guardar de este día' : 'Lo que este día movió en mí'}</label>
        <p className="ayuda">Usa este espacio para la dinámica del día o para escribir lo que sientes.</p>
        <textarea id={`${id}-notas`} rows={8} value={valores.notas ?? ''} onChange={(e) => cambiar('notas', e.target.value)} disabled={cargando} />
      </div>
      <p className="guardado" role="status">
        <Check aria-hidden size={14} /> {mensaje}
      </p>
    </div>
  );
}
