import { forwardRef, useRef } from "react";
import Esqueleto from "../Esqueleto";
import Aviso from "./Aviso";
import CabeceraPaso from "./CabeceraPaso";
import TarjetaServicio from "./TarjetaServicio";
import { useArrastreHorizontal } from "../../hooks/useArrastreHorizontal";
import { useAutoDesplazamiento } from "../../hooks/useAutoDesplazamiento";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

const PasoServicios = forwardRef(function PasoServicios(
  { barbero, servicios, elegidos, onAlternar, onVolver, onCambiarBarbero },
  tituloRef
) {
  const carrilRef = useRef(null);
  const reducido = useMovimientoReducido();
  const hayServicios = Boolean(servicios.datos?.length);
  useAutoDesplazamiento(carrilRef, { activo: hayServicios && !reducido });
  useArrastreHorizontal(carrilRef, { activo: hayServicios });

  let contenido;
  if (servicios.cargando) {
    contenido = (
      <div className={estilos.carril} aria-busy="true">
        <span className={comunes.oculto}>Cargando servicios…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className={estilos.servicioEsqueleto}>
            <Esqueleto alto="auto" radio={0} style={{ aspectRatio: "3 / 4" }} />
            <span className={estilos.servicioTexto}>
              <Esqueleto ancho="70%" alto="1.1em" />
              <Esqueleto ancho="50%" alto="0.9em" />
            </span>
          </div>
        ))}
      </div>
    );
  } else if (servicios.error) {
    contenido = (
      <Aviso
        accion={
          <button type="button" className={comunes.enlace} onClick={servicios.recargar}>
            Reintentar
          </button>
        }
      >
        No pudimos cargar los servicios. Revisá tu conexión.
      </Aviso>
    );
  } else if (!hayServicios) {
    contenido = (
      <Aviso
        accion={
          <button type="button" className={comunes.enlace} onClick={onCambiarBarbero}>
            Elegir otro barbero
          </button>
        }
      >
        {barbero?.nombre} no tiene servicios disponibles por ahora.
      </Aviso>
    );
  } else {
    contenido = (
      <div ref={carrilRef} className={estilos.carril} role="group" aria-label="Servicios">
        {servicios.datos.map((s) => (
          <TarjetaServicio
            key={s._id}
            servicio={s}
            elegido={elegidos.includes(s._id)}
            onAlternar={onAlternar}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <CabeceraPaso
        ref={tituloRef}
        numero={2}
        contexto={barbero ? `con ${barbero.nombre}` : null}
        titulo="Tus servicios"
        bajada="Deslizá y tocá los que quieras. Podés combinar más de uno."
        onVolver={onVolver}
        etiquetaVolver="Volver al paso anterior"
      />
      {contenido}
    </div>
  );
});

PasoServicios.propTypes = {
  barbero: T.barbero.isRequired,
  servicios: T.peticion(PropTypes.arrayOf(T.servicio)).isRequired,
  elegidos: PropTypes.arrayOf(PropTypes.string).isRequired,
  onAlternar: PropTypes.func.isRequired,
  onVolver: PropTypes.func.isRequired,
  onCambiarBarbero: PropTypes.func.isRequired,
};

export default PasoServicios;
