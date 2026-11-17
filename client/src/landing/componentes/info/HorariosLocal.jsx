import comunes from "../../estilos/comunes.module.css";
import estilos from "./Info.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/** Horarios del local, con la fila de hoy resaltada y si está abierto ahora. */
const HorariosLocal = ({ filas, hoy, apertura }) => (
  <div className={estilos.bloque}>
    <h3 className={comunes.subtitulo}>Horarios</h3>
    {apertura && (
      <p className={estilos.apertura} data-abierto={apertura.abierto}>
        <span className={estilos.punto} aria-hidden="true" />
        {apertura.texto}
      </p>
    )}
    <ul className={estilos.horas}>
      {filas.map((f) => (
        <li key={f.clave} data-hoy={f.dias.includes(hoy)} aria-current={f.dias.includes(hoy) ? "date" : undefined}>
          <span>{f.etiqueta}</span>
          <span>{f.rango}</span>
        </li>
      ))}
    </ul>
  </div>
);

HorariosLocal.propTypes = {
  filas: PropTypes.arrayOf(T.filaHorario).isRequired,
  hoy: PropTypes.number.isRequired,
  apertura: T.apertura,
};

export default HorariosLocal;
