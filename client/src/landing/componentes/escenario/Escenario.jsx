import { useRef } from "react";
import mascota from "../../assets/escenario/mascota.webp";
import neonSilueta from "../../assets/escenario/neon-silueta.webp";
import neonContorno from "../../assets/escenario/neon-contorno.webp";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import Brasas from "./Brasas";
import ProximoLibre from "./ProximoLibre";
import { useProgresoCortina } from "./useProgresoCortina";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Escenario.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/**
 * Banner fijo de la landing: la mascota con su contorno de neón, las brasas y
 * el llamado a reservar. Al deslizar, la "cortina" (el resto de la página)
 * sube por encima. Es el banner por defecto y no se administra desde el panel:
 * cambiar la imagen rompería las capas del neón, que están recortadas a la
 * silueta de esta mascota.
 */
const Escenario = ({ cortinaRef, proximo, onTomarProximo }) => {
  const escenarioRef = useRef(null);
  const movimientoReducido = useMovimientoReducido();
  const progresoRef = useProgresoCortina(escenarioRef, cortinaRef, !movimientoReducido);

  return (
    <section className={estilos.anclaje} id="inicio" aria-label="Alonzo Style">
      <div ref={escenarioRef} className={estilos.escenario}>
        <div className={estilos.arte}>
          <img
            className={estilos.mascota}
            src={mascota}
            alt="Mascota de Alonzo Style: barbero con tijera y contorno de neón violeta"
            width="800"
            height="800"
            // React 18 no conoce fetchPriority: en minúscula pasa tal cual al DOM.
            // eslint-disable-next-line react/no-unknown-property
            fetchpriority="high"
            decoding="async"
          />
          <div className={estilos.neon} aria-hidden="true">
            <img className={estilos.neonBrillo} src={neonSilueta} alt="" />
            <img className={estilos.neonLinea} src={neonSilueta} alt="" />
            <img className={estilos.neonRecorrido} src={neonSilueta} alt="" />
            <img className={estilos.neonContorno} src={neonContorno} alt="" />
          </div>
          {!movimientoReducido && <Brasas className={estilos.brasas} progresoRef={progresoRef} />}
        </div>

        <h1 className={estilos.titulo}>Creando tu estilo</h1>

        <div className={estilos.llamado}>
          <a className={`${comunes.btn} ${comunes.primario}`} href="#reservar">
            Reservar turno
          </a>
          <ProximoLibre {...proximo} onTomar={onTomarProximo} />
        </div>
      </div>
    </section>
  );
};

Escenario.propTypes = {
  cortinaRef: T.ref.isRequired,
  proximo: PropTypes.shape({
    cargando: PropTypes.bool.isRequired,
    error: PropTypes.any,
    libre: T.proximoLibre,
    ahora: T.momento.isRequired,
  }).isRequired,
  onTomarProximo: PropTypes.func.isRequired,
};

export default Escenario;
