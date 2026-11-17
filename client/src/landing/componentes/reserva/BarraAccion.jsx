import comunes from "../../estilos/comunes.module.css";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";

/**
 * Barra fija al pie, solo mientras se ve la reserva y desde el paso 2: el
 * resumen de lo elegido y el botón para seguir, siempre a mano del pulgar.
 */
const BarraAccion = ({ visible, etiqueta, resumen, textoBoton, habilitado, formulario, onAtras, onSeguir }) => {
  if (!visible) return null;
  return (
    <div className={estilos.barraAccion}>
      <div className={estilos.barraAccionInterior}>
        <button
          className={`${comunes.btn} ${comunes.fantasma} ${estilos.atras}`}
          type="button"
          aria-label="Volver al paso anterior"
          onClick={onAtras}
        >
          ←
        </button>
        <div className={estilos.resumen} aria-live="polite">
          <small>{etiqueta}</small>
          <strong>{resumen}</strong>
        </div>
        <button
          className={`${comunes.btn} ${comunes.primario} ${estilos.seguir}`}
          type={formulario ? "submit" : "button"}
          form={formulario}
          disabled={!habilitado}
          onClick={formulario ? undefined : onSeguir}
        >
          {textoBoton}
        </button>
      </div>
    </div>
  );
};

BarraAccion.propTypes = {
  visible: PropTypes.bool,
  etiqueta: PropTypes.string,
  resumen: PropTypes.node,
  textoBoton: PropTypes.string,
  habilitado: PropTypes.bool,
  formulario: PropTypes.string,
  onAtras: PropTypes.func.isRequired,
  onSeguir: PropTypes.func.isRequired,
};

export default BarraAccion;
