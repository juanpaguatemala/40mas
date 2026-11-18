'use client';

import { useState, type FormEvent } from 'react';
import { Check, Clock, ExternalLink } from 'lucide-react';
import { BotonGoogle, useSesion, type Cuenta } from './Sesion';
import { OFRENDA } from '../lib/contenido';

/** Sección de la ofrenda: enlace a QPayPro y registro del número de autorización. */
export default function Ofrenda() {
  const { usuario, cuenta, api, setCuenta } = useSesion();
  const [autorizacion, setAutorizacion] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (autorizacion.trim().length < 3) {
      setError('Escribe el número de autorización que aparece en tu comprobante.');
      return;
    }
    setEnviando(true);
    const r = await api<Cuenta>('/api/ofrenda', { method: 'POST', body: JSON.stringify({ autorizacion, nota }) });
    setEnviando(false);
    if (r.ok) {
      setCuenta(r.data);
      setEditando(false);
    } else {
      setError('No pudimos registrar tu ofrenda. Inténtalo de nuevo.');
    }
  };

  const of = cuenta?.ofrenda;
  const mostrarFormulario = usuario && cuenta && !cuenta.acceso && (!of || of.estado === 'rechazada' || editando);

  return (
    <section id="ofrenda" className="ofrenda" aria-labelledby="ofrenda-titulo">
      <p className="sobretitulo">Ofrenda</p>
      <h2 id="ofrenda-titulo">{OFRENDA.monto}</h2>
      <p>
        Con tu ofrenda se abre el camino completo de 40 días, con la narración de cada reflexión, y sostienes la labor de
        evangelización del Apostolado Católico Hechos.
      </p>

      {cuenta?.acceso ? (
        <p className="estado-ofrenda ok">
          <Check aria-hidden size={18} /> Tu ofrenda está confirmada. Gracias. Tu camino completo está abierto.
        </p>
      ) : (
        <ol className="pasos-ofrenda">
          <li>
            <strong>Da tu ofrenda</strong> en la página segura de pago.
            <a href={OFRENDA.url} target="_blank" rel="noopener noreferrer" className="btn btn-ofrenda">
              Dar mi ofrenda de {OFRENDA.monto} <ExternalLink aria-hidden size={16} />
            </a>
          </li>
          <li>
            <strong>Registra tu número de autorización</strong> aquí, con la misma cuenta con la que vas a leer.
            {!usuario && (
              <div className="ofrenda-login">
                <BotonGoogle texto="Entrar para registrarla" />
              </div>
            )}
          </li>
          <li>
            <strong>Confirmamos tu ofrenda</strong> y se abre tu camino. Mientras tanto puedes leer el día 1.
          </li>
        </ol>
      )}

      {usuario && cuenta && !cuenta.acceso && of?.estado === 'pendiente' && !editando && (
        <div className="estado-ofrenda">
          <Clock aria-hidden size={18} />
          <div>
            <p>
              Recibimos tu número de autorización <strong>{of.autorizacion}</strong>. Lo estamos confirmando.
            </p>
            <button type="button" className="enlace-btn" onClick={() => { setAutorizacion(of.autorizacion); setEditando(true); }}>
              Corregir el número
            </button>
          </div>
        </div>
      )}

      {usuario && cuenta && !cuenta.acceso && of?.estado === 'rechazada' && !editando && (
        <p className="estado-ofrenda alerta">
          No pudimos confirmar el número <strong>{of.autorizacion}</strong>. Revisa tu comprobante y vuelve a registrarlo.
        </p>
      )}

      {mostrarFormulario && (
        <form className="form-ofrenda" onSubmit={(e) => void enviar(e)} noValidate>
          <div className="campo">
            <label htmlFor="autorizacion">Número de autorización</label>
            <input
              id="autorizacion"
              inputMode="text"
              autoComplete="off"
              value={autorizacion}
              onChange={(e) => setAutorizacion(e.target.value)}
              aria-describedby="autorizacion-ayuda"
              aria-invalid={Boolean(error)}
            />
            <p id="autorizacion-ayuda" className="ayuda">Aparece en el comprobante que te muestra QPayPro y en el correo de confirmación.</p>
          </div>
          <div className="campo">
            <label htmlFor="nota">Comentario (opcional)</label>
            <input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por ejemplo, el nombre de quien pagó" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Registrar mi ofrenda'}
          </button>
        </form>
      )}
    </section>
  );
}
