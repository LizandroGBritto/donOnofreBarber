import Esqueleto from "../Esqueleto";
import Contacto from "./Contacto";
import HorariosLocal from "./HorariosLocal";
import Ubicacion from "./Ubicacion";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Info.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

const BloqueCargando = ({ titulo, filas = 3 }) => (
  <div className={estilos.bloque} aria-busy="true">
    <h3 className={comunes.subtitulo}>{titulo}</h3>
    <span className={comunes.oculto}>Cargando…</span>
    <div className={estilos.esqueletos}>
      {Array.from({ length: filas }, (_, i) => (
        <Esqueleto key={i} alto="1.4em" ancho={`${90 - i * 12}%`} />
      ))}
    </div>
  </div>
);

/**
 * "Dónde y cuándo". Cada bloque aparece solo si su dato está cargado en el
 * panel: un local sin ubicación cargada no muestra un bloque vacío.
 */
const SeccionInfo = ({ horarios, filasHorario, hoy, apertura, ubicacion, contacto }) => (
  <section className={estilos.seccion} aria-label="Información del local">
    <h2 className={comunes.titulo}>Dónde y cuándo</h2>

    {horarios.cargando ? (
      <BloqueCargando titulo="Horarios" />
    ) : (
      filasHorario.length > 0 && <HorariosLocal filas={filasHorario} hoy={hoy} apertura={apertura} />
    )}

    {ubicacion.cargando ? (
      <BloqueCargando titulo="Ubicación" filas={2} />
    ) : (
      ubicacion.datos && <Ubicacion ubicacion={ubicacion.datos} />
    )}

    {contacto.cargando ? (
      <BloqueCargando titulo="Contacto" />
    ) : (
      contacto.datos && <Contacto contacto={contacto.datos} />
    )}
  </section>
);

BloqueCargando.propTypes = { titulo: PropTypes.string.isRequired, filas: PropTypes.number };

SeccionInfo.propTypes = {
  horarios: T.peticion(PropTypes.array).isRequired,
  filasHorario: PropTypes.arrayOf(T.filaHorario).isRequired,
  hoy: PropTypes.number.isRequired,
  apertura: T.apertura,
  ubicacion: T.peticion(T.ubicacion).isRequired,
  contacto: T.peticion(T.contacto).isRequired,
};

export default SeccionInfo;
