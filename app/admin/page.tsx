'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BotonGoogle, useSesion } from '../../components/Sesion';
import { OFRENDA } from '../../lib/contenido';

interface Ofrenda {
  uid: string;
  email: string;
  nombre: string;
  autorizacion: string;
  nota: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  creada: number;
  revisada?: number;
  revisadaPor?: string;
}

const fecha = (ms?: number) =>
  ms ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(ms) : '';

const FILTROS = [
  { k: 'pendiente', t: 'Pendientes' },
  { k: 'aprobada', t: 'Aprobadas' },
  { k: 'rechazada', t: 'Rechazadas' },
] as const;

export default function Admin() {
  const { usuario, cuenta, api } = useSesion();
  const [lista, setLista] = useState<Ofrenda[] | null>(null);
  const [filtro, setFiltro] = useState<Ofrenda['estado']>('pendiente');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const r = await api<{ ofrendas: Ofrenda[] }>('/api/admin/ofrendas');
    if (r.ok) setLista(r.data.ofrendas);
    else setError(r.status === 403 ? 'no-autorizado' : 'error');
  }, [api]);

  useEffect(() => {
    if (cuenta?.admin) void cargar();
  }, [cuenta?.admin, cargar]);

  const revisar = async (uid: string, accion: 'aprobar' | 'rechazar') => {
    setOcupado(uid);
    const r = await api<{ ofrendas: Ofrenda[] }>('/api/admin/ofrendas', { method: 'POST', body: JSON.stringify({ uid, accion }) });
    setOcupado(null);
    if (r.ok) setLista(r.data.ofrendas);
    else setError('error');
  };

  const visibles = (lista ?? []).filter((o) => o.estado === filtro);
  const pendientes = (lista ?? []).filter((o) => o.estado === 'pendiente').length;

  return (
    <main className="pagina pagina-ancha">
      <header className="barra">
        <Link href="/" className="icono-btn" aria-label="Volver al inicio">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="barra-etiqueta">Administración</span>
        <span className="icono-btn" aria-hidden="true" />
      </header>
      <h1 className="titulo-dia">Ofrendas</h1>

      {usuario === null && (
        <section className="aviso-bloqueo">
          <p>Inicia sesión con una cuenta de administrador.</p>
          <BotonGoogle />
        </section>
      )}
      {usuario && cuenta && !cuenta.admin && <p className="vacio">Esta cuenta ({usuario.email}) no tiene permiso de administrador.</p>}

      {cuenta?.admin && (
        <>
          <p className="ayuda">
            Compara cada número de autorización con tus cobros de {OFRENDA.monto} en el panel de QPayPro antes de aprobar.
          </p>
          <div className="filtros" role="tablist" aria-label="Filtrar ofrendas">
            {FILTROS.map((f) => (
              <button key={f.k} type="button" role="tab" aria-selected={filtro === f.k} onClick={() => setFiltro(f.k)}>
                {f.t}
                {f.k === 'pendiente' && pendientes > 0 ? ` (${pendientes})` : ''}
              </button>
            ))}
          </div>
          {error && <p className="error" role="alert">No se pudo completar la acción. Recarga la página.</p>}
          {!lista && <p className="cargando">Cargando…</p>}
          {lista && !visibles.length && <p className="vacio">No hay ofrendas en esta lista.</p>}
          {visibles.length > 0 && (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Persona</th>
                    <th scope="col">Autorización</th>
                    <th scope="col">Registrada</th>
                    <th scope="col">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((o) => (
                    <tr key={o.uid}>
                      <td>
                        <strong>{o.nombre || '—'}</strong>
                        <br />
                        <span className="suave">{o.email}</span>
                        {o.nota && (
                          <>
                            <br />
                            <span className="suave">«{o.nota}»</span>
                          </>
                        )}
                      </td>
                      <td className="mono">{o.autorizacion}</td>
                      <td>
                        {fecha(o.creada)}
                        {o.revisada && (
                          <>
                            <br />
                            <span className="suave">Revisada {fecha(o.revisada)}</span>
                          </>
                        )}
                      </td>
                      <td>
                        <div className="acciones-tabla">
                          {o.estado !== 'aprobada' && (
                            <button type="button" className="btn btn-chico" disabled={ocupado === o.uid} onClick={() => void revisar(o.uid, 'aprobar')}>
                              Aprobar
                            </button>
                          )}
                          {o.estado !== 'rechazada' && (
                            <button type="button" className="btn btn-sec btn-chico" disabled={ocupado === o.uid} onClick={() => void revisar(o.uid, 'rechazar')}>
                              {o.estado === 'aprobada' ? 'Quitar acceso' : 'Rechazar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
