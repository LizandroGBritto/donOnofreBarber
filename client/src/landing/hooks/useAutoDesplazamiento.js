import { useEffect } from "react";

const PAUSAR = ["pointerdown", "touchstart", "wheel", "focusin", "mouseenter"];
const REANUDAR = ["pointerup", "touchend", "mouseleave", "focusout"];

/**
 * Carrusel que avanza solo, una tarjeta cada `cadaMs`, como el de servicios de
 * la demo. Se pausa apenas el usuario lo toca, lo enfoca o pasa el mouse, y
 * retoma `esperaMs` después de soltarlo. No corre fuera de pantalla ni con
 * movimiento reducido.
 */
export const useAutoDesplazamiento = (
  ref,
  { activo = true, cadaMs = 2600, esperaMs = 4500, separacion = 14 } = {}
) => {
  useEffect(() => {
    const carril = ref.current;
    if (!carril || !activo) return undefined;

    let pausado = false;
    let visible = typeof IntersectionObserver === "undefined";
    let temporizador = null;

    const paso = () => {
      if (pausado || !visible) return;
      const tarjeta = carril.firstElementChild;
      if (!tarjeta) return;
      const ancho = tarjeta.offsetWidth + separacion;
      const alFinal = carril.scrollLeft + carril.clientWidth >= carril.scrollWidth - 4;
      if (alFinal) carril.scrollTo({ left: 0, behavior: "smooth" });
      else carril.scrollBy({ left: ancho, behavior: "smooth" });
    };

    const pausar = () => {
      pausado = true;
      clearTimeout(temporizador);
    };
    const reanudar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        pausado = false;
      }, esperaMs);
    };

    PAUSAR.forEach((ev) => carril.addEventListener(ev, pausar, { passive: true }));
    REANUDAR.forEach((ev) => carril.addEventListener(ev, reanudar, { passive: true }));

    let observador = null;
    if (typeof IntersectionObserver !== "undefined") {
      observador = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      observador.observe(carril);
    }

    const intervalo = setInterval(paso, cadaMs);

    return () => {
      clearInterval(intervalo);
      clearTimeout(temporizador);
      observador?.disconnect();
      PAUSAR.forEach((ev) => carril.removeEventListener(ev, pausar));
      REANUDAR.forEach((ev) => carril.removeEventListener(ev, reanudar));
    };
  }, [ref, activo, cadaMs, esperaMs, separacion]);
};
