import { forwardRef } from "react";
import { IconoVolver } from "../Iconos";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";

/**
 * "Paso N de 4", título y botón de volver. El título recibe el foco al cambiar
 * de paso, para que un lector de pantalla anuncie dónde está.
 */
const CabeceraPaso = forwardRef(function CabeceraPaso(
  { numero, contexto, titulo, bajada, onVolver, etiquetaVolver },
  tituloRef
) {
  return (
    <>
      {numero && (
        <p className={estilos.numeroPaso}>
          Paso {numero} de 4{contexto ? `, ${contexto}` : ""}
        </p>
      )}
      <div className={estilos.cabecera}>
        <h2 ref={tituloRef} tabIndex={-1} className={comunes.titulo}>
          {titulo}
        </h2>
        {onVolver && (
          <button className={comunes.botonIcono} type="button" onClick={onVolver} aria-label={etiquetaVolver}>
            <IconoVolver />
          </button>
        )}
      </div>
      {bajada && <p className={comunes.bajada}>{bajada}</p>}
    </>
  );
});

CabeceraPaso.propTypes = {
  numero: PropTypes.number.isRequired,
  contexto: PropTypes.node,
  titulo: PropTypes.string.isRequired,
  bajada: PropTypes.node,
  onVolver: PropTypes.func,
  etiquetaVolver: PropTypes.string,
};

export default CabeceraPaso;
