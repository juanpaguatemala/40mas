'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSesion } from '../components/Sesion';

export type Respuestas = Record<string, string>;
export type EstadoGuardado = 'cargando' | 'listo' | 'guardando' | 'guardado' | 'error';

/** Respuestas del participante a una lectura. Se guardan en su cuenta mientras escribe. */
export function useRespuestas(lecturaId: string) {
  const { api, usuario } = useSesion();
  const [valores, setValores] = useState<Respuestas>({});
  const [estado, setEstado] = useState<EstadoGuardado>('cargando');
  const pendientes = useRef<Respuestas>({});
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    api<{ respuestas: Respuestas }>(`/api/respuestas?id=${encodeURIComponent(lecturaId)}`).then((r) => {
      if (!vivo) return;
      if (r.ok) {
        setValores({ ...r.data.respuestas, ...pendientes.current });
        setEstado('listo');
      } else {
        setEstado('error');
      }
    });
    return () => {
      vivo = false;
    };
  }, [api, usuario, lecturaId]);

  const guardarAhora = useCallback(async () => {
    const cambios = pendientes.current;
    if (!Object.keys(cambios).length) return;
    pendientes.current = {};
    setEstado('guardando');
    const r = await api('/api/respuestas', { method: 'POST', body: JSON.stringify({ id: lecturaId, cambios }), keepalive: true });
    if (r.ok) {
      setEstado(Object.keys(pendientes.current).length ? 'guardando' : 'guardado');
    } else {
      pendientes.current = { ...cambios, ...pendientes.current };
      setEstado('error');
    }
  }, [api, lecturaId]);

  const cambiar = useCallback(
    (campo: string, valor: string) => {
      setValores((v) => ({ ...v, [campo]: valor }));
      pendientes.current[campo] = valor;
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void guardarAhora(), 900);
    },
    [guardarAhora],
  );

  // Guardar lo pendiente al salir de la página.
  useEffect(() => {
    const alSalir = () => void guardarAhora();
    window.addEventListener('pagehide', alSalir);
    return () => {
      window.removeEventListener('pagehide', alSalir);
      if (temporizador.current) clearTimeout(temporizador.current);
      void guardarAhora();
    };
  }, [guardarAhora]);

  return { valores, cambiar, estado };
}
