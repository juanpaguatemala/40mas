import Link from 'next/link';
import { ListaDias, MiCamino } from '../components/Inicio';
import Ofrenda from '../components/Ofrenda';
import { AUDIOS, getAudioUrl } from '../lib/audios';
import { LECTURAS, etiquetaDia, tituloLimpio } from '../lib/contenido';

export default function Home() {
  const conAudio = new Set(AUDIOS.filter((a) => getAudioUrl(a)).map((a) => a.capituloId));
  const items = LECTURAS.map((l) => ({
    id: l.id,
    dia: l.dia,
    etiqueta: etiquetaDia(l.dia),
    titulo: tituloLimpio(l.titulo),
    conAudio: conAudio.has(l.id),
  }));

  return (
    <main className="pagina">
      <header className="portada">
        <p className="sobretitulo">Guía para llevar el duelo</p>
        <h1>24 más</h1>
        <p className="lema">Cada día tiene su propio afán</p>
        <p className="autor">Juan Pablo Mata</p>
      </header>

      <MiCamino items={items} />

      <section className="explica" aria-labelledby="que-es">
        <h2 id="que-es">¿Qué es «24 más»?</h2>
        <p>
          Es un camino de 40 días de reflexión y sanación para quien atraviesa el duelo por la muerte de un ser querido o por
          el final de una relación. Nace del libro de Juan Pablo Mata y de su propia experiencia de pérdida, acompañada desde
          la fe católica.
        </p>
        <p>
          Cada día trae una reflexión del libro, narrada por el autor, y un espacio para escribir lo que vas viviendo. Porque
          Dios nos regala 24 horas cada día: tiempo de nuevas oportunidades.
        </p>
      </section>

      <section className="explica" aria-labelledby="como">
        <h2 id="como">Cómo funciona</h2>
        <ol className="pasos">
          <li>
            <strong>Entra con tu cuenta de Google.</strong> Así tu avance y tus respuestas quedan guardados y puedes seguir desde
            cualquier teléfono o computadora.
          </li>
          <li>
            <strong>Lee y escucha el día 1</strong> sin costo, para conocer la guía.
          </li>
          <li>
            <strong>Da tu ofrenda de Q40.00</strong> para abrir el camino completo.
          </li>
          <li>
            <strong>Un día a la vez.</strong> Cuando terminas un día, el siguiente se abre al día siguiente. Sin prisa: cada día
            tiene su propio afán.
          </li>
        </ol>
      </section>

      <Ofrenda />

      <ListaDias items={items} />

      <nav className="extras" aria-label="Más">
        <Link href="/introduccion">Introducción del libro</Link>
        <Link href="/diario">Mis respuestas</Link>
        <Link href="/oracion">Oración por los difuntos</Link>
      </nav>
    </main>
  );
}
