import { Suspense, lazy, useRef } from "react";
import Esqueleto from "../Esqueleto";
import { coordenadasDeUbicacion } from "../../../utils/coordenadas";
import { urlExterna } from "../../dominio/formato";
import { useEnPantalla } from "../../hooks/useEnPantalla";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Info.module.css";
import * as T from "../../tiposProps";

const MapaOscuro = lazy(() => import("./MapaOscuro"));

const EsqueletoMapa = () => <Esqueleto className={estilos.mapaEsqueleto} radio={16} alto="auto" />;

/**
 * Ubicación: mapa oscuro (si el local tiene coordenadas cargadas), la
 * dirección y el botón a Google Maps. Sin coordenadas no se dibuja un mapa
 * aproximado: se muestra la dirección y el botón.
 */
const Ubicacion = ({ ubicacion }) => {
  const bloqueRef = useRef(null);
  const cerca = useEnPantalla(bloqueRef, { margen: "400px", unaVez: true });
  const punto = coordenadasDeUbicacion(ubicacion);
  const enlaceMaps = urlExterna(ubicacion.enlaceMaps);

  return (
    <div ref={bloqueRef} className={estilos.bloque}>
      <h3 className={comunes.subtitulo}>Ubicación</h3>
      {punto &&
        (cerca ? (
          <Suspense fallback={<EsqueletoMapa />}>
            <MapaOscuro lat={punto.lat} lng={punto.lng} />
          </Suspense>
        ) : (
          <EsqueletoMapa />
        ))}
      <p className={estilos.direccion}>{ubicacion.direccion}</p>
      {enlaceMaps && (
        <div className={estilos.enlaces}>
          <a
            className={`${comunes.btn} ${comunes.fantasma}`}
            href={enlaceMaps}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver en Google Maps
          </a>
        </div>
      )}
    </div>
  );
};

Ubicacion.propTypes = { ubicacion: T.ubicacion.isRequired };

export default Ubicacion;
