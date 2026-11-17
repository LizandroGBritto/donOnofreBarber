import Esqueleto from "../Esqueleto";
import { etiquetaEnOracion } from "../../dominio/agenda";
import { primerNombre } from "../../dominio/formato";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Escenario.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/**
 * "Próximo horario libre: mañana a las 10:00 con Lisandro. Tomarlo".
 *
 * Si la consulta falló no se muestra nada: es un atajo, no información que el
 * cliente necesite para reservar.
 */
const ProximoLibre = ({ cargando, error, libre, ahora, onTomar }) => {
  if (error) return null;

  if (cargando) {
    return (
      <p className={estilos.proximo} aria-busy="true">
        <span className={comunes.oculto}>Buscando el próximo horario libre…</span>
        <Esqueleto ancho="16rem" alto="1.1em" className={estilos.proximoEsqueleto} />
      </p>
    );
  }

  if (!libre) {
    return <p className={estilos.proximo}>No hay horarios libres en las próximas dos semanas.</p>;
  }

  return (
    <p className={estilos.proximo}>
      Próximo horario libre:{" "}
      <strong>
        {etiquetaEnOracion(libre.turno.fecha, ahora)} a las {libre.turno.hora} con{" "}
        {primerNombre(libre.barbero.nombre)}
      </strong>
      .{" "}
      <button className={comunes.enlace} type="button" onClick={() => onTomar(libre)}>
        Tomarlo
      </button>
    </p>
  );
};

ProximoLibre.propTypes = {
  cargando: PropTypes.bool.isRequired,
  error: PropTypes.any,
  libre: T.proximoLibre,
  ahora: T.momento.isRequired,
  onTomar: PropTypes.func.isRequired,
};

export default ProximoLibre;
