import estilos from "./Esqueleto.module.css";
import PropTypes from "prop-types";

/**
 * Bloque de carga con brillo. Ocupa el mismo lugar que el contenido real
 * para que la página no salte cuando llegan los datos.
 *
 * Es decorativo (aria-hidden): el "cargando" para lectores de pantalla lo
 * anuncia la sección que lo contiene, con `aria-busy` y un texto oculto.
 */
const Esqueleto = ({ ancho = "100%", alto = "1em", radio = 8, className = "", style }) => (
  <span
    aria-hidden="true"
    className={`${estilos.esqueleto} ${className}`}
    style={{ width: ancho, height: alto, borderRadius: radio, ...style }}
  />
);

Esqueleto.propTypes = {
  ancho: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  alto: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  radio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Esqueleto;
