import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Estado de una lectura: `{ datos, cargando, error, recargar }`.
 *
 * - `cargar` se vuelve a ejecutar cuando cambian `dependencias`.
 * - Con `habilitado: false` no pide nada (p. ej. sin barbero elegido).
 * - Una respuesta que llega tarde, de una dependencia que ya cambió, se
 *   descarta: sin esto, elegir rápido dos barberos podía dejar en pantalla los
 *   servicios del primero.
 */
export const usePeticion = (cargar, dependencias, { habilitado = true } = {}) => {
  const [estado, setEstado] = useState({
    datos: null,
    cargando: habilitado,
    error: null,
  });
  const [vuelta, setVuelta] = useState(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    if (!habilitado) {
      setEstado({ datos: null, cargando: false, error: null });
      return undefined;
    }

    let vigente = true;
    // Los datos anteriores se descartan: son de otra dependencia (otro
    // barbero) y mezclarlos con la nueva llevaba a decisiones sobre la agenda
    // equivocada durante un render.
    setEstado({ datos: null, cargando: true, error: null });

    Promise.resolve()
      .then(() => cargarRef.current())
      .then(
        (datos) => vigente && setEstado({ datos, cargando: false, error: null }),
        (error) => vigente && setEstado({ datos: null, cargando: false, error })
      );

    return () => {
      vigente = false;
    };
    // `dependencias` es la lista que define el caller, como en useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, vuelta, ...dependencias]);

  const recargar = useCallback(() => setVuelta((v) => v + 1), []);

  return { ...estado, recargar };
};
