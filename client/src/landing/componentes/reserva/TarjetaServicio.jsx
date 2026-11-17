import { memo } from "react";
import { IconoTilde } from "../Iconos";
import { urlDeArchivo } from "../../datos/clienteLanding";
import { guaranies, primerNombre } from "../../dominio/formato";
import Foto from "./Foto";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/** Tarjeta de servicio (checkbox) con la foto, el precio en navaja y el nombre. */
const TarjetaServicio = ({ servicio, elegido, onAlternar }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={elegido}
    className={estilos.servicio}
    onClick={() => onAlternar(servicio._id)}
  >
    <span className={estilos.servicioFoto}>
      <Foto
        src={urlDeArchivo(servicio.imagenes?.[0])}
        alt=""
        etiqueta={`Foto de ${primerNombre(servicio.nombre).toLowerCase()}`}
      />
      <span className={estilos.casilla} aria-hidden="true">
        <IconoTilde />
      </span>
      <span className={estilos.navaja}>
        <span className={estilos.hoja} aria-hidden="true" />
        <span className={estilos.mango}>{guaranies(servicio.precio)}</span>
      </span>
    </span>
    <span className={estilos.servicioTexto}>
      <strong>{servicio.nombre}</strong>
      {servicio.descripcion && <small>{servicio.descripcion}</small>}
    </span>
  </button>
);

TarjetaServicio.propTypes = {
  servicio: T.servicio.isRequired,
  elegido: PropTypes.bool,
  onAlternar: PropTypes.func.isRequired,
};

export default memo(TarjetaServicio);
