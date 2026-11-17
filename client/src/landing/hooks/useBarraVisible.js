import { useEffect, useState } from "react";

const ALTO_BARRA_POR_DEFECTO = 68;

/**
 * La barra del encabezado se muestra recién cuando la cortina (el contenido
 * que sube sobre el banner) llega arriba, a la altura de la barra. Mientras se
 * ve el banner queda oculta: en la primera carga y cada vez que se vuelve
 * arriba, porque tapaba la parte de arriba del escenario.
 *
 * Solo cambia el estado al cruzar el umbral, no en cada scroll.
 */
export const useBarraVisible = (cortinaRef) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cortina = cortinaRef.current;
    if (!cortina) return undefined;

    const altoBarra = () =>
      parseFloat(getComputedStyle(cortina).getPropertyValue("--barra")) || ALTO_BARRA_POR_DEFECTO;

    // Directo en el evento, sin requestAnimationFrame: si el navegador frena
    // los frames (pestaña en segundo plano, ahorro de batería) la medición
    // quedaba pendiente y la barra no aparecía. Medir un rectángulo es barato,
    // y React no vuelve a pintar si el valor no cambió.
    const actualizar = () => setVisible(cortina.getBoundingClientRect().top <= altoBarra() + 1);

    window.addEventListener("scroll", actualizar, { passive: true });
    window.addEventListener("resize", actualizar);
    actualizar();
    return () => {
      window.removeEventListener("scroll", actualizar);
      window.removeEventListener("resize", actualizar);
    };
  }, [cortinaRef]);

  return visible;
};
