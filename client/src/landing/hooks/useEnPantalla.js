import { useEffect, useState } from "react";

/**
 * true mientras el elemento de `ref` está en pantalla (o cerca, según
 * `margen`). Con `unaVez`, queda en true después de la primera vez: sirve para
 * cargar algo pesado (el mapa, el widget de Instagram) recién cuando hace
 * falta.
 *
 * Sin IntersectionObserver (navegadores muy viejos, jsdom) se considera
 * visible: mejor cargar de más que no mostrar nada.
 */
export const useEnPantalla = (ref, { margen = "0px", unaVez = false } = {}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        setVisible(entrada.isIntersecting);
        if (entrada.isIntersecting && unaVez) observador.disconnect();
      },
      { rootMargin: margen }
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref, margen, unaVez]);

  return visible;
};
