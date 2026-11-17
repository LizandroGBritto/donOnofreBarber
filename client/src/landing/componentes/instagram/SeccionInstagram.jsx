import { useRef } from "react";
import Esqueleto from "../Esqueleto";
import { IconoComentario, IconoCorazon, IconoInstagram } from "../Iconos";
import { etiquetaPublicacion } from "../../dominio/instagram";
import { urlExterna, usuarioInstagram } from "../../dominio/formato";
import { useArrastreHorizontal } from "../../hooks/useArrastreHorizontal";
import { useEnPantalla } from "../../hooks/useEnPantalla";
import { useFeedInstagram } from "./useFeedInstagram";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Instagram.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/**
 * Widgets de Elfsight: el principal y uno de respaldo para cuando el plan
 * gratuito agota las vistas del mes.
 */
const WIDGETS_ELFSIGHT = [
  "b55caa18-3827-43a3-9056-872bfd45e534",
  "db56f908-49b4-4c9c-957a-d30decec426d",
];

const perfilDe = (contacto) => {
  const cargado = urlExterna(contacto?.instagramUrl);
  if (cargado) return cargado;
  const usuario = usuarioInstagram(contacto?.instagram || "alonzo_style");
  return `https://www.instagram.com/${usuario}/`;
};

// Sin la descripción, a propósito: la foto y los contadores, nada más.
const Tarjeta = ({ publicacion }) => {
  const { likes, comentarios } = publicacion;
  return (
    <a
      className={estilos.reel}
      href={publicacion.enlace}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiquetaPublicacion(publicacion)}
    >
      <span className={estilos.foto}>
        <img src={publicacion.imagen} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable="false" />
      </span>
      <IconoInstagram className={estilos.icono} />
      {(likes || comentarios) && (
        <span className={estilos.pie} aria-hidden="true">
          {likes && (
            <span className={estilos.contador}>
              <IconoCorazon />
              {likes}
            </span>
          )}
          {comentarios && (
            <span className={estilos.contador}>
              <IconoComentario />
              {comentarios}
            </span>
          )}
        </span>
      )}
    </a>
  );
};

const SeccionInstagram = ({ contacto }) => {
  const seccionRef = useRef(null);
  const carrilRef = useRef(null);
  // El widget pesa: se pide recién cuando la sección está por aparecer.
  const cerca = useEnPantalla(seccionRef, { margen: "600px", unaVez: true });
  const perfil = perfilDe(contacto);
  const usuario = usuarioInstagram(contacto?.instagram || "alonzo_style");
  const { anfitrionRef, widgetActual, estado, publicaciones } = useFeedInstagram({
    widgets: WIDGETS_ELFSIGHT,
    activo: cerca,
    perfil,
  });

  const cargando = estado === "esperando" || estado === "cargando";
  useArrastreHorizontal(carrilRef, { activo: estado === "listo" });

  return (
    <section ref={seccionRef} className={estilos.seccion} aria-label="Instagram">
      <h2 className={comunes.titulo}>Últimos cortes</h2>
      <p className={comunes.bajada}>Lo último que subimos a @{usuario}.</p>

      {estado !== "crudo" && (
        <div ref={carrilRef} className={estilos.carril} aria-busy={cargando}>
          {cargando && (
            <>
              <span className={comunes.oculto}>Cargando publicaciones…</span>
              {[0, 1, 2].map((i) => (
                <Esqueleto key={i} className={estilos.reelEsqueleto} radio={18} alto="auto" />
              ))}
            </>
          )}
          {estado === "listo" && publicaciones.map((p) => <Tarjeta key={p.id} publicacion={p} />)}
          {!cargando && (
            <a className={`${estilos.reel} ${estilos.mas}`} href={perfil} target="_blank" rel="noopener noreferrer">
              Ver más en Instagram
            </a>
          )}
        </div>
      )}

      {/* Anfitrión del widget. Invisible mientras se le leen las
          publicaciones; visible (con estilo oscuro) solo si no se pudo. */}
      <div
        ref={anfitrionRef}
        className={estado === "crudo" ? estilos.widgetVisible : estilos.widgetOculto}
        aria-hidden={estado === "crudo" ? undefined : "true"}
      >
        {cerca && widgetActual && <div key={widgetActual} className={`elfsight-app-${widgetActual}`} />}
      </div>

      <a
        className={`${comunes.btn} ${comunes.fantasma} ${comunes.bloque}`}
        href={perfil}
        target="_blank"
        rel="noopener noreferrer"
      >
        Ver en Instagram
      </a>
    </section>
  );
};

Tarjeta.propTypes = {
  publicacion: PropTypes.shape({
    enlace: PropTypes.string.isRequired,
    imagen: PropTypes.string.isRequired,
    esReel: PropTypes.bool,
    likes: PropTypes.string,
    comentarios: PropTypes.string,
  }).isRequired,
};

SeccionInstagram.propTypes = { contacto: T.contacto };

export default SeccionInstagram;
