'use client';

import Link from 'next/link';
import { Check, Headphones, Lock } from 'lucide-react';
import { BotonGoogle, useSesion } from './Sesion';
import type { Estado } from '../lib/desbloqueo';

export interface ItemLista {
  id: string;
  dia: number;
  etiqueta: string;
  titulo: string;
  conAudio: boolean;
}

const TEXTO_ESTADO: Record<Estado, string> = {
  completado: 'Leído',
  disponible: '',
  pago: '',
  anterior: '',
  manana: 'Mañana',
};

/** Tarjeta principal: invita a entrar o muestra el avance y la siguiente lectura. */
export function MiCamino({ items }: { items: ItemLista[] }) {
  const { usuario, cuenta, salir } = useSesion();

  if (usuario === undefined || (usuario && !cuenta)) {
    return <section className="tarjeta-hoy" aria-busy="true"><p className="cargando">Cargando tu camino…</p></section>;
  }

  if (!usuario || !cuenta) {
    return (
      <section className="tarjeta-hoy" aria-label="Comenzar">
        <p className="sobretitulo">Empieza hoy</p>
        <h2>Tu camino de 40 días</h2>
        <p className="meta">Entra con tu cuenta de Google para guardar tu avance y tus respuestas. El día 1 está abierto.</p>
        <BotonGoogle />
      </section>
    );
  }

  const estados = cuenta.estados;
  const hechos = items.filter((x) => estados[x.id] === 'completado').length;
  const proximo = items.find((x) => estados[x.id] !== 'completado') ?? items[items.length - 1];
  const est = estados[proximo.id];
  const nombre = usuario.displayName?.split(' ')[0];

  return (
    <>
      <section className="avance" aria-label="Tu avance">
        <div className="avance-fila">
          <span>{nombre ? `Hola, ${nombre}` : 'Tu camino'}</span>
          <strong>{hechos} de {items.length} lecturas</strong>
        </div>
        <div className="avance-barra" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={hechos} aria-label="Lecturas completadas">
          <div style={{ width: `${(hechos / items.length) * 100}%` }} />
        </div>
      </section>

      <section className="tarjeta-hoy" aria-label="Siguiente lectura">
        {hechos === items.length ? (
          <>
            <p className="sobretitulo">Camino completado</p>
            <h2>Terminaste los 40 días</h2>
            <p className="meta">Puedes volver a cualquier día y releer tus respuestas.</p>
            <Link href="/diario" className="btn">Ver mis respuestas</Link>
          </>
        ) : (
          <>
            <p className="sobretitulo">{hechos ? 'Continúa con' : 'Empieza aquí'} · {proximo.etiqueta}</p>
            <h2>{proximo.titulo}</h2>
            {est === 'disponible' && (
              <>
                <p className="meta"><Headphones aria-hidden size={16} /> {proximo.conAudio ? 'Lectura y audio' : 'Lectura'}</p>
                <Link href={`/dia/${proximo.id}`} className="btn">{hechos ? 'Continuar' : 'Comenzar'}</Link>
              </>
            )}
            {est === 'manana' && <p className="meta"><Lock aria-hidden size={16} /> Se abre mañana. Cada día tiene su propio afán.</p>}
            {est === 'pago' && (
              <>
                <p className="meta"><Lock aria-hidden size={16} /> Se abre cuando confirmemos tu ofrenda.</p>
                <a href="#ofrenda" className="btn">Dar mi ofrenda</a>
              </>
            )}
          </>
        )}
      </section>
      <p className="cuenta-linea">
        {usuario.email} · <button type="button" className="enlace-btn" onClick={() => void salir()}>Cerrar sesión</button>
        {cuenta.admin && <> · <Link href="/admin">Administrar ofrendas</Link></>}
      </p>
    </>
  );
}

/** Lista de los 40 días con su estado. */
export function ListaDias({ items }: { items: ItemLista[] }) {
  const { cuenta } = useSesion();
  const estados = cuenta?.estados ?? {};
  const proximo = cuenta ? items.find((x) => estados[x.id] !== 'completado') : undefined;

  return (
    <section aria-label="Los 40 días" className="lista">
      <h3>Los 40 días</h3>
      <ol>
        {items.map((x) => {
          const e = estados[x.id];
          const abierto = e === 'completado' || e === 'disponible';
          const actual = x.id === proximo?.id && e === 'disponible';
          const contenido = (
            <>
              <span className={e === 'completado' ? 'num hecho' : actual ? 'num hoy' : 'num'} aria-hidden="true">
                {e === 'completado' ? <Check size={16} /> : x.etiqueta.replace('Día ', '')}
              </span>
              <span className="fila-titulo">
                <span className="sr">{x.etiqueta}: </span>
                {x.titulo}
              </span>
              <span className="fila-estado">
                {e ? TEXTO_ESTADO[e] : ''}
                {cuenta && !abierto && <Lock aria-label="Bloqueado" size={14} />}
              </span>
            </>
          );
          return (
            <li key={x.id}>
              {abierto ? (
                <Link href={`/dia/${x.id}`} className={actual ? 'fila actual' : 'fila'}>{contenido}</Link>
              ) : (
                <div className="fila cerrada">{contenido}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
