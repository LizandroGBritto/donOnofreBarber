import { forwardRef, useCallback } from "react";
import Esqueleto from "../Esqueleto";
import Aviso from "./Aviso";
import CabeceraPaso from "./CabeceraPaso";
import TarjetaBarbero from "./TarjetaBarbero";
import { listarServiciosDeBarbero } from "../../datos/clienteLanding";
import { usePeticion } from "../../datos/usePeticion";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/**
 * Precio más bajo de cada barbero, para el "Desde Gs. X" de la tarjeta.
 * `undefined` mientras carga, `null` si no se pudo saber (no se muestra).
 */
const usePreciosDesde = (barberos) => {
  const ids = (barberos || []).map((b) => b._id).join(",");
  const { datos } = usePeticion(
    () =>
      Promise.allSettled((barberos || []).map((b) => listarServiciosDeBarbero(b._id))).then(
        (resultados) =>
          Object.fromEntries(
            resultados.map((r, i) => {
              const precios =
                r.status === "fulfilled" ? r.value.map((s) => s.precio).filter(Number.isFinite) : [];
              return [barberos[i]._id, precios.length ? Math.min(...precios) : null];
            })
          )
      ),
    [ids],
    { habilitado: Boolean(ids) }
  );
  return datos;
};

const PasoBarbero = forwardRef(function PasoBarbero(
  { barberos, barberoId, onElegir, onVolverArriba },
  tituloRef
) {
  const desde = usePreciosDesde(barberos.datos);
  const elegir = useCallback((id) => onElegir(id), [onElegir]);

  let contenido;
  if (barberos.cargando) {
    contenido = (
      <div className={estilos.barberos} aria-busy="true">
        <span className={comunes.oculto}>Cargando barberos…</span>
        {[0, 1].map((i) => (
          <div key={i} className={estilos.barberoEsqueleto}>
            <Esqueleto alto="auto" radio={0} style={{ aspectRatio: "4 / 3" }} />
            <span className={estilos.barberoCuerpo}>
              <Esqueleto ancho="80%" alto="1.1em" />
              <Esqueleto ancho="60%" alto="0.9em" />
              <Esqueleto ancho="50%" alto="1em" />
            </span>
          </div>
        ))}
      </div>
    );
  } else if (barberos.error) {
    contenido = (
      <Aviso
        accion={
          <button type="button" className={comunes.enlace} onClick={barberos.recargar}>
            Reintentar
          </button>
        }
      >
        No pudimos cargar los barberos. Revisá tu conexión.
      </Aviso>
    );
  } else if (!barberos.datos?.length) {
    contenido = (
      <p className={comunes.bajada}>Por ahora no hay barberos disponibles para reservar.</p>
    );
  } else {
    contenido = (
      <div className={estilos.barberos} role="radiogroup" aria-label="Barbero">
        {barberos.datos.map((b) => (
          <TarjetaBarbero
            key={b._id}
            barbero={b}
            elegido={b._id === barberoId}
            desde={desde ? desde[b._id] : undefined}
            onElegir={elegir}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <CabeceraPaso
        ref={tituloRef}
        numero={1}
        titulo="Elegí tu barbero"
        bajada="Cada barbero tiene su propia agenda y sus precios."
        onVolver={onVolverArriba}
        etiquetaVolver="Volver al inicio"
      />
      {contenido}
    </div>
  );
});

PasoBarbero.propTypes = {
  barberos: T.peticion(PropTypes.arrayOf(T.barbero)).isRequired,
  barberoId: PropTypes.string,
  onElegir: PropTypes.func.isRequired,
  onVolverArriba: PropTypes.func.isRequired,
};

export default PasoBarbero;
