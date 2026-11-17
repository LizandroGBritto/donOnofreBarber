import { PASOS } from "../../dominio/reserva";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";

/**
 * Barra de progreso de los cuatro pasos. Los pasos ya hechos se pueden tocar
 * para volver; los que faltan están deshabilitados.
 */
const Pasos = ({ actual, onIr }) => (
  <ol className={estilos.pasos} aria-label="Pasos de la reserva">
    {PASOS.map(({ n, titulo }) => {
      const hecho = n < actual;
      return (
        <li key={n}>
          <button
            type="button"
            className={estilos.paso}
            data-hecho={hecho}
            aria-current={n === actual ? "step" : undefined}
            disabled={n >= actual}
            onClick={() => onIr(n)}
          >
            <i aria-hidden="true" />
            {titulo}
          </button>
        </li>
      );
    })}
  </ol>
);

Pasos.propTypes = {
  actual: PropTypes.number.isRequired,
  onIr: PropTypes.func.isRequired,
};

export default Pasos;
