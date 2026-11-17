import { useState } from "react";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";

/**
 * Foto con lugar reservado: mientras no hay foto (o falla al cargar) se ve
 * un patrón con la etiqueta, en la misma proporción, para que la grilla no
 * salte.
 */
const Foto = ({ src, alt, etiqueta }) => {
  const [rota, setRota] = useState(false);

  if (!src || rota) {
    return (
      <span className={estilos.sinFoto} role="img" aria-label={etiqueta}>
        <span>{etiqueta}</span>
      </span>
    );
  }

  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setRota(true)} />;
};

Foto.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  etiqueta: PropTypes.string,
};

export default Foto;
