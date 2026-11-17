import { useEffect } from "react";

const UMBRAL_PX = 6;

/**
 * Arrastrar un carril horizontal con el mouse. Con el dedo ya se desliza
 * solo (overflow-x), pero con el mouse no: la barra está oculta y la imagen o
 * el enlace de la tarjeta se "arrastran" como archivo.
 *
 * - Recién pasados unos píxeles cuenta como arrastre: un clic sigue siendo
 *   un clic (abrir la publicación, elegir el servicio).
 * - Durante el arrastre se apaga el snap y la selección de texto; al soltar
 *   vuelven y el carril se acomoda a la tarjeta más cercana.
 * - El clic que el navegador dispara al soltar un arrastre se descarta.
 */
export const useArrastreHorizontal = (ref, { activo = true } = {}) => {
  useEffect(() => {
    const carril = ref.current;
    if (!carril || !activo) return undefined;

    let inicioX = 0;
    let inicioScroll = 0;
    let presionado = false;
    let arrastrando = false;
    let descartarClic = false;
    let temporizador = null;

    const empezar = () => {
      arrastrando = true;
      carril.dataset.arrastrando = "true";
      carril.style.scrollSnapType = "none";
      carril.style.scrollBehavior = "auto";
      carril.style.userSelect = "none";
    };

    const terminar = () => {
      delete carril.dataset.arrastrando;
      carril.style.scrollSnapType = "";
      carril.style.scrollBehavior = "";
      carril.style.userSelect = "";
    };

    const alMover = (e) => {
      if (!presionado) return;
      const dx = e.clientX - inicioX;
      if (!arrastrando) {
        if (Math.abs(dx) < UMBRAL_PX) return;
        empezar();
      }
      e.preventDefault();
      carril.scrollLeft = inicioScroll - dx;
    };

    const alSoltar = () => {
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSoltar);
      window.removeEventListener("pointercancel", alSoltar);
      presionado = false;
      if (!arrastrando) return;
      arrastrando = false;
      terminar();
      descartarClic = true;
      // Si el navegador no dispara el clic (soltó fuera del carril), que no
      // se coma el próximo clic de verdad.
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        descartarClic = false;
      }, 0);
    };

    const alPresionar = (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      presionado = true;
      inicioX = e.clientX;
      inicioScroll = carril.scrollLeft;
      window.addEventListener("pointermove", alMover);
      window.addEventListener("pointerup", alSoltar);
      window.addEventListener("pointercancel", alSoltar);
    };

    const alClic = (e) => {
      if (!descartarClic) return;
      descartarClic = false;
      e.preventDefault();
      e.stopPropagation();
    };

    // Sin esto el navegador arrastra la imagen o el enlace como archivo.
    const sinArrastreNativo = (e) => e.preventDefault();

    carril.addEventListener("pointerdown", alPresionar);
    carril.addEventListener("click", alClic, true);
    carril.addEventListener("dragstart", sinArrastreNativo);

    return () => {
      alSoltar();
      clearTimeout(temporizador);
      terminar();
      carril.removeEventListener("pointerdown", alPresionar);
      carril.removeEventListener("click", alClic, true);
      carril.removeEventListener("dragstart", sinArrastreNativo);
    };
  }, [ref, activo]);
};
