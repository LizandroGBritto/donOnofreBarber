import { memo } from "react";
import Esqueleto from "../Esqueleto";
import { urlDeArchivo } from "../../datos/clienteLanding";
import { guaranies, iniciales } from "../../dominio/formato";
import { useInclinacion } from "../../hooks/useInclinacion";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import Foto from "./Foto";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/**
 * Tarjeta de barbero (radio). Foto, nombre, descripción y "desde" el precio
 * más bajo de sus servicios. Sin el "Libre: …" de la demo, para que la
 * tarjeta no crezca.
 */
const TarjetaBarbero = ({ barbero, elegido, desde, onElegir }) => {
  const reducido = useMovimientoReducido();
  const inclinacion = useInclinacion(reducido);
  const logo = urlDeArchivo(barbero.logo);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegido}
      className={estilos.barbero}
      onClick={() => onElegir(barbero._id)}
      {...inclinacion}
    >
      <span className={estilos.barberoFoto}>
        <Foto src={urlDeArchivo(barbero.foto)} alt="" etiqueta={`Foto de ${barbero.nombre}`} />
        <span className={estilos.mono} aria-hidden="true">
          {logo ? <img src={logo} alt="" loading="lazy" decoding="async" /> : iniciales(barbero.nombre)}
        </span>
        <span className={estilos.insignia}>Elegido</span>
      </span>
      <span className={estilos.barberoCuerpo}>
        <strong>{barbero.nombre}</strong>
        {barbero.descripcion && <span className={estilos.barberoDescripcion}>{barbero.descripcion}</span>}
        {desde === undefined ? (
          <Esqueleto ancho="7rem" alto="1.1em" />
        ) : (
          desde !== null && <span className={estilos.barberoDesde}>Desde {guaranies(desde)}</span>
        )}
      </span>
    </button>
  );
};

TarjetaBarbero.propTypes = {
  barbero: T.barbero.isRequired,
  elegido: PropTypes.bool,
  desde: PropTypes.number,
  onElegir: PropTypes.func.isRequired,
};

export default memo(TarjetaBarbero);
