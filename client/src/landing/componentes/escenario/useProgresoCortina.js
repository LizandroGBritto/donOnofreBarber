import { useEffect, useRef } from "react";

/**
 * Progreso (0 a 1) de la cortina que sube sobre el escenario al deslizar.
 * Se escribe como `--p` en el escenario y lo leen sus capas desde el CSS: la
 * mascota se achica, el título baja y se desvanece. No pasa por el estado de
 * React, así que no re-renderiza en cada scroll.
 *
 * Devuelve una ref con el último valor, para quien lo necesite en JS (las
 * brasas dejan de dibujar cuando el escenario quedó tapado).
 */
export const useProgresoCortina = (escenarioRef, cortinaRef, activo = true) => {
  const progresoRef = useRef(0);

  useEffect(() => {
    const escenario = escenarioRef.current;
    const cortina = cortinaRef.current;
    if (!escenario || !cortina || !activo) return undefined;

    let pendiente = false;
    const actualizar = () => {
      pendiente = false;
      const e = escenario.getBoundingClientRect();
      const c = cortina.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.bottom - c.top) / (e.height * 0.85 || 1)));
      progresoRef.current = p;
      escenario.style.setProperty("--p", p.toFixed(3));
    };
    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(actualizar);
    };

    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", actualizar);
    actualizar();
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", actualizar);
    };
  }, [escenarioRef, cortinaRef, activo]);

  return progresoRef;
};
