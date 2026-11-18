import Link from 'next/link';
import Texto from '../../components/Texto';
import { ORACION_DIFUNTOS } from '../../lib/contenido';

export const metadata = { title: 'Oración por los difuntos — 24 más' };

export default function Oracion() {
  return (
    <main className="pagina">
      <header className="barra">
        <Link href="/" className="icono-btn" aria-label="Volver al inicio">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="barra-etiqueta">Oración</span>
        <span className="icono-btn" aria-hidden="true" />
      </header>
      <h1 className="titulo-dia">{ORACION_DIFUNTOS.titulo}</h1>
      <div className="oracion">
        <Texto bloques={ORACION_DIFUNTOS.bloques} />
      </div>
    </main>
  );
}
