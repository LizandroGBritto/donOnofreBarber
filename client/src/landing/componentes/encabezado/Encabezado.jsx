import PosteBarbero from "./PosteBarbero";
import estilos from "./Encabezado.module.css";
import PropTypes from "prop-types";

/** Barra fija con la marca. El poste gira mientras el local está abierto. */
const Encabezado = ({ abierto }) => (
  <header className={estilos.barra}>
    <div className={estilos.interior}>
      <a className={estilos.marca} href="#inicio" aria-label="Alonzo Style, inicio">
        <PosteBarbero girando={abierto} />
        <span className={estilos.nombre}>Alonzo Style</span>
      </a>
    </div>
  </header>
);

Encabezado.propTypes = { abierto: PropTypes.bool };

export default Encabezado;
