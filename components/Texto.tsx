import type { Bloque } from '../lib/contenido';

/** Muestra los bloques del libro tal como fueron extraídos, sin alterar la redacción. */
export default function Texto({ bloques }: { bloques: Bloque[] }) {
  const grupos: (Bloque | Bloque[])[] = [];
  for (const b of bloques) {
    const ultimo = grupos[grupos.length - 1];
    if (b.t === 'li') {
      if (Array.isArray(ultimo)) ultimo.push(b);
      else grupos.push([b]);
    } else {
      grupos.push(b);
    }
  }

  return (
    <div className="texto">
      {grupos.map((g, i) => {
        if (Array.isArray(g)) {
          return (
            <ul key={i}>
              {g.map((li, j) => (
                <li key={j}>{li.s}</li>
              ))}
            </ul>
          );
        }
        const clases = [g.b && 'neg', g.i && 'cur', g.c && 'cen'].filter(Boolean).join(' ') || undefined;
        if (g.t === 'h') return <h3 key={i} className="ejercicio">{g.s}</h3>;
        if (g.t === 'q') return <p key={i} className="pregunta">{g.s}</p>;
        return <p key={i} className={clases}>{g.s}</p>;
      })}
    </div>
  );
}
