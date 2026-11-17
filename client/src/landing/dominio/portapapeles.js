/**
 * Copia al portapapeles. Si el navegador no deja (http, permisos, WebView),
 * selecciona el texto para que la persona lo copie a mano.
 */
export const copiar = async (texto, nodo) => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    if (nodo) {
      const rango = document.createRange();
      rango.selectNodeContents(nodo);
      const seleccion = window.getSelection();
      seleccion.removeAllRanges();
      seleccion.addRange(rango);
    }
    return false;
  }
};
