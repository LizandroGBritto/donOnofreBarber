import { useEffect, useState } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

const consultar = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(CONSULTA)
    : null;

/** true si el sistema pide reducir animaciones. Se actualiza si cambia. */
export const useMovimientoReducido = () => {
  const [reducido, setReducido] = useState(() => Boolean(consultar()?.matches));

  useEffect(() => {
    const mq = consultar();
    if (!mq) return undefined;
    const alCambiar = () => setReducido(mq.matches);
    mq.addEventListener?.("change", alCambiar);
    return () => mq.removeEventListener?.("change", alCambiar);
  }, []);

  return reducido;
};
