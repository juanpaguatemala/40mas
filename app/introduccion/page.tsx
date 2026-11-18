import Link from 'next/link';
import Texto from '../../components/Texto';
import { INTRODUCCION, LECTURAS } from '../../lib/contenido';

export const metadata = { title: 'Introducción — 24 más' };

export default function Introduccion() {
  return (
    <main className="pagina">
      <header className="barra">
        <Link href="/" className="icono-btn" aria-label="Volver al inicio">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="barra-etiqueta">Antes de empezar</span>
        <span className="icono-btn" aria-hidden="true" />
      </header>
      <h1 className="titulo-dia">{INTRODUCCION.titulo}</h1>
      <Texto bloques={INTRODUCCION.bloques} />
      <div className="cierre">
        <Link href={`/dia/${LECTURAS[0].id}`} className="btn">
          Comenzar el día 1
        </Link>
      </div>
    </main>
  );
}
