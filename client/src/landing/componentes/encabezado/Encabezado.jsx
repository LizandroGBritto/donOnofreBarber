import PosteBarbero from "./PosteBarbero";
import estilos from "./Encabezado.module.css";
import PropTypes from "prop-types";

/**
 * Barra con la marca, flotando sobre la página. El poste gira mientras el
 * local está abierto. Solo se ve cuando el contenido ya tapó el banner
 * (`visible`, de useBarraVisible): arriba de todo tapaba el escenario.
 */
const Encabezado = ({ abierto, visible = true }) => (
  <header className={estilos.barra} data-visible={visible}>
    <div className={estilos.interior}>
      <a className={estilos.marca} href="#inicio" aria-label="Alonzo Style, inicio">
        <PosteBarbero girando={abierto} />
        <span className={estilos.nombre}>Alonzo Style</span>
      </a>
    </div>
  </header>
);

Encabezado.propTypes = { abierto: PropTypes.bool, visible: PropTypes.bool };

export default Encabezado;
