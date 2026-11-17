import { useEffect, useRef, useState } from "react";
import { obtenerFeedInstagram, renovarFeedInstagram } from "../../datos/clienteLanding";
import { extraerPublicaciones } from "../../dominio/instagram";

const SCRIPT_ELFSIGHT = "https://elfsightcdn.com/platform.js";

/** Tiempo que se le da a cada widget para dibujar algo antes de probar el siguiente. */
export const ESPERA_POR_WIDGET_MS = 12_000;

/**
 * Cuánto tiene que quedarse quieto lo leído del widget antes de mandarlo al
 * servidor: el widget dibuja de a poco y no hay que guardar la mitad.
 */
export const QUIETUD_ANTES_DE_GUARDAR_MS = 3_000;

let promesaScript = null;
const cargarScript = () => {
  if (promesaScript) return promesaScript;
  promesaScript = new Promise((resolver, rechazar) => {
    const existente = document.querySelector(`script[src="${SCRIPT_ELFSIGHT}"]`);
    if (existente) {
      resolver();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_ELFSIGHT;
    s.async = true;
    s.onload = () => resolver();
    s.onerror = () => {
      promesaScript = null;
      rechazar(new Error("No se pudo cargar Elfsight"));
    };
    document.head.appendChild(s);
  });
  return promesaScript;
};

const mismasPublicaciones = (a, b) => a.length === b.length && a.every((p, i) => p.id === b[i].id);

/**
 * Feed de Instagram "forzado" al estilo de la demo.
 *
 * Primero se pide la copia que guarda el servidor (se renueva una vez al día).
 * Si está vigente se dibuja esa y **no se carga el widget**: así no se gasta el
 * cupo de vistas de Elfsight en cada visita.
 *
 * Si está vencida (o el servidor no responde), se monta el widget en un
 * contenedor invisible (`anfitrionRef`), un MutationObserver le saca las
 * publicaciones y, cuando dejan de cambiar, se mandan al servidor para
 * renovar la copia. Mientras tanto se muestra la copia vencida, si hay.
 *
 * Estados:
 * - "esperando": todavía no se pidió (la sección no está cerca).
 * - "cargando": se espera la copia o el widget.
 * - "listo": hay publicaciones (de la copia o del widget).
 * - "crudo": el widget dibujó algo pero no se le pudieron leer publicaciones
 *   (Elfsight cambió su HTML) y no hay copia: se muestra el widget tal cual.
 * - "vacio": no hay copia y ningún widget dibujó nada (sin red, bloqueador,
 *   cupo agotado): la sección queda con el enlace al perfil.
 *
 * Si un widget no dibuja en `ESPERA_POR_WIDGET_MS`, se prueba el siguiente
 * de la lista (el de respaldo, por el límite de vistas del plan gratuito).
 */
export const useFeedInstagram = ({ widgets, activo, perfil }) => {
  const anfitrionRef = useRef(null);
  const [copia, setCopia] = useState({ estado: "pendiente", publicaciones: [] }); // pendiente | vigente | vencida
  const [indice, setIndice] = useState(0);
  const [estadoWidget, setEstadoWidget] = useState("esperando");
  const [leidas, setLeidas] = useState([]);
  const guardada = useRef(false);

  // 1) La copia del servidor.
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    obtenerFeedInstagram()
      .then((feed) => {
        if (vivo) setCopia({ estado: feed.vigente ? "vigente" : "vencida", publicaciones: feed.publicaciones });
      })
      .catch(() => {
        if (vivo) setCopia({ estado: "vencida", publicaciones: [] });
      });
    return () => {
      vivo = false;
    };
  }, [activo]);

  const usarWidget = activo && copia.estado === "vencida" && widgets.length > 0;

  // 2) El widget, solo si la copia está vencida.
  useEffect(() => {
    if (!usarWidget) return undefined;
    const anfitrion = anfitrionRef.current;
    if (!anfitrion) return undefined;

    let terminado = false;
    let espera = null;
    setEstadoWidget("cargando");

    const leer = () => {
      const encontradas = extraerPublicaciones(anfitrion, perfil);
      if (encontradas.length) {
        clearTimeout(espera);
        setLeidas((previas) => (mismasPublicaciones(previas, encontradas) ? previas : encontradas));
        setEstadoWidget("listo");
      }
      return encontradas.length;
    };

    let pendiente = null;
    const observador = new MutationObserver(() => {
      clearTimeout(pendiente);
      pendiente = setTimeout(leer, 300);
    });
    observador.observe(anfitrion, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "style", "href"],
    });

    espera = setTimeout(() => {
      if (terminado || leer()) return;
      if (indice < widgets.length - 1) {
        setIndice((i) => i + 1);
      } else {
        const dibujoAlgo = anfitrion.querySelector("img, iframe, a") !== null;
        setEstadoWidget(dibujoAlgo ? "crudo" : "vacio");
      }
    }, ESPERA_POR_WIDGET_MS);

    cargarScript()
      .then(() => {
        // El script ya cargado no ve los contenedores que aparecen después.
        window.eapps?.Platform?.go?.();
      })
      .catch(() => {
        if (!terminado) {
          clearTimeout(espera);
          setEstadoWidget("vacio");
        }
      });

    return () => {
      terminado = true;
      clearTimeout(espera);
      clearTimeout(pendiente);
      observador.disconnect();
    };
  }, [usarWidget, indice, widgets, perfil]);

  // 3) Lo leído del widget, cuando deja de cambiar, renueva la copia. Una
  //    sola vez por visita; si falla (otra visita ya la renovó: 409) no pasa nada.
  useEffect(() => {
    if (!leidas.length || guardada.current) return undefined;
    const id = setTimeout(() => {
      guardada.current = true;
      renovarFeedInstagram(leidas).catch(() => {});
    }, QUIETUD_ANTES_DE_GUARDAR_MS);
    return () => clearTimeout(id);
  }, [leidas]);

  let estado;
  let publicaciones;
  if (leidas.length) {
    estado = "listo";
    publicaciones = leidas;
  } else if (copia.publicaciones.length) {
    // Vigente, o vencida mientras el widget carga (o si falla).
    estado = "listo";
    publicaciones = copia.publicaciones;
  } else if (!activo) {
    estado = "esperando";
    publicaciones = [];
  } else if (copia.estado === "pendiente") {
    estado = "cargando";
    publicaciones = [];
  } else {
    estado = estadoWidget === "esperando" ? "cargando" : estadoWidget;
    publicaciones = [];
  }

  return {
    anfitrionRef,
    widgetActual: usarWidget ? widgets[indice] : null,
    estado,
    publicaciones,
  };
};
