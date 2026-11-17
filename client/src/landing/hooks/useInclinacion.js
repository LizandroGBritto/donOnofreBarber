import { useCallback } from "react";

/**
 * Inclinación 3D de una tarjeta siguiendo el puntero, como en la demo.
 *
 * Escribe variables CSS en el elemento (--rx, --ry, --gx, --gy) en lugar de
 * pasar por el estado de React: se mueve a 60 fps sin re-renderizar nada.
 * Devuelve los handlers para esparcir en la tarjeta.
 */
export const useInclinacion = (desactivada = false) => {
  const inclinar = useCallback(
    (e) => {
      if (desactivada) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${((px - 0.5) * 10).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - py) * 8).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
      el.dataset.inclinada = "true";
    },
    [desactivada]
  );

  const enderezar = useCallback((e) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    delete el.dataset.inclinada;
  }, []);

  const mover = useCallback(
    (e) => {
      // En pantallas táctiles solo se sigue el dedo si el toque empezó en la
      // tarjeta: deslizar la página por encima no la inclina.
      if (e.pointerType === "touch" && !e.currentTarget.dataset.inclinada) return;
      inclinar(e);
    },
    [inclinar]
  );

  return {
    onPointerDown: inclinar,
    onPointerMove: mover,
    onPointerUp: enderezar,
    onPointerLeave: enderezar,
    onPointerCancel: enderezar,
  };
};
