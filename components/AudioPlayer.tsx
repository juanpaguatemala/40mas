'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, RotateCw, Headphones } from 'lucide-react';
import { NARRADOR } from '../lib/audios';

const VELOCIDADES = [0.75, 1, 1.25, 1.5] as const;
const SALTO = 15;
const clavePosicion = (id: string) => `24mas:audio:pos:${id}`;
const CLAVE_VELOCIDAD = '24mas:audio:velocidad';

function formato(seg: number) {
  if (!Number.isFinite(seg) || seg < 0) return '--:--';
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function leer(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}
function guardar(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento: se ignora */ }
}

export interface AudioLectura {
  id: string;
  dia: number;
  url: string;
}

interface Props {
  audio: AudioLectura | null;
}

/**
 * Reproductor de la narración de un capítulo.
 * - No se reproduce solo al abrir la lectura.
 * - Guarda la posición por audio: si se monta a nivel de capítulo (fuera de las
 *   pestañas/secciones) sigue sonando sin cortes; si se vuelve a montar, retoma.
 * - Si no hay audio, muestra un aviso discreto y no bloquea la lectura.
 */
export default function AudioPlayer({ audio }: Props) {
  const url = audio?.url ?? null;
  const ref = useRef<HTMLAudioElement>(null);
  const [sonando, setSonando] = useState(false);
  const [actual, setActual] = useState(0);
  const [duracion, setDuracion] = useState(NaN);
  const [velocidad, setVelocidad] = useState(1);
  const [error, setError] = useState(false);
  const ultimoGuardado = useRef(0);

  // Restaurar velocidad preferida.
  useEffect(() => {
    const v = Number(leer(CLAVE_VELOCIDAD));
    if (VELOCIDADES.includes(v as (typeof VELOCIDADES)[number])) setVelocidad(v);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = velocidad;
  }, [velocidad]);

  // Al cambiar de audio: reiniciar estado.
  useEffect(() => {
    setSonando(false);
    setActual(0);
    setDuracion(NaN);
    setError(false);
  }, [url]);

  const guardarPosicion = useCallback(
    (t: number, forzar = false) => {
      if (!audio) return;
      if (!forzar && Math.abs(t - ultimoGuardado.current) < 5) return;
      ultimoGuardado.current = t;
      guardar(clavePosicion(audio.id), String(Math.floor(t)));
    },
    [audio],
  );

  // Guardar al salir de la página o desmontar.
  useEffect(() => {
    const el = ref.current;
    const alSalir = () => el && guardarPosicion(el.currentTime, true);
    window.addEventListener('pagehide', alSalir);
    return () => {
      alSalir();
      window.removeEventListener('pagehide', alSalir);
    };
  }, [guardarPosicion]);

  if (!audio || !url) {
    return (
      <p className="audio-aviso" role="note">
        <Headphones aria-hidden size={16} /> La narración de esta reflexión estará disponible pronto. Puedes continuar con la lectura.
      </p>
    );
  }

  const alCargarMetadatos = () => {
    const el = ref.current;
    if (!el) return;
    setDuracion(el.duration);
    el.playbackRate = velocidad;
    const guardada = Number(leer(clavePosicion(audio.id)));
    // Retomar salvo que estuviera prácticamente al final.
    if (guardada > 0 && guardada < el.duration - 5) {
      el.currentTime = guardada;
      setActual(guardada);
    }
  };

  const alternar = async () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      try { await el.play(); } catch { setError(true); }
    } else {
      el.pause();
    }
  };

  const saltar = (delta: number) => {
    const el = ref.current;
    if (!el) return;
    const max = Number.isFinite(el.duration) ? el.duration : el.currentTime + delta;
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), max);
    setActual(el.currentTime);
    guardarPosicion(el.currentTime, true);
  };

  const buscar = (valor: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = valor;
    setActual(valor);
    guardarPosicion(valor, true);
  };

  const cambiarVelocidad = () => {
    const i = VELOCIDADES.indexOf(velocidad as (typeof VELOCIDADES)[number]);
    const nueva = VELOCIDADES[(i + 1) % VELOCIDADES.length];
    setVelocidad(nueva);
    guardar(CLAVE_VELOCIDAD, String(nueva));
  };

  return (
    <section className="audio-player" aria-label={`Narración del día ${audio.dia}`}>
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onLoadedMetadata={alCargarMetadatos}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setActual(t);
          guardarPosicion(t);
        }}
        onPlay={() => setSonando(true)}
        onPause={(e) => {
          setSonando(false);
          guardarPosicion(e.currentTarget.currentTime, true);
        }}
        onEnded={() => {
          setSonando(false);
          guardar(clavePosicion(audio.id), '0');
        }}
        onError={() => setError(true)}
      />

      <p className="audio-narrador">
        <Headphones aria-hidden size={16} /> Narrado por {NARRADOR}
      </p>

      {error ? (
        <p className="audio-aviso" role="note">
          No pudimos cargar el audio en este momento. Puedes seguir leyendo y volver a intentarlo más tarde.
        </p>
      ) : (
        <>
          <div className="audio-controles">
            <button type="button" onClick={() => saltar(-SALTO)} aria-label="Retroceder 15 segundos">
              <RotateCcw aria-hidden size={20} />
              <span className="audio-salto">15</span>
            </button>
            <button type="button" className="audio-play" onClick={alternar} aria-label={sonando ? 'Pausar' : 'Reproducir'}>
              {sonando ? <Pause aria-hidden size={26} /> : <Play aria-hidden size={26} />}
            </button>
            <button type="button" onClick={() => saltar(SALTO)} aria-label="Avanzar 15 segundos">
              <RotateCw aria-hidden size={20} />
              <span className="audio-salto">15</span>
            </button>
            <button type="button" className="audio-velocidad" onClick={cambiarVelocidad} aria-label={`Velocidad ${velocidad}x. Cambiar velocidad`}>
              {velocidad}x
            </button>
          </div>

          <div className="audio-progreso">
            <span>{formato(actual)}</span>
            <input
              type="range"
              min={0}
              max={Number.isFinite(duracion) ? duracion : 0}
              step={1}
              value={Math.min(actual, Number.isFinite(duracion) ? duracion : 0)}
              onChange={(e) => buscar(Number(e.target.value))}
              disabled={!Number.isFinite(duracion)}
              aria-label="Barra de progreso"
              aria-valuetext={`${formato(actual)} de ${formato(duracion)}`}
            />
            <span>{formato(duracion)}</span>
          </div>
        </>
      )}
    </section>
  );
}
