import { forwardRef, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Esqueleto from "../Esqueleto";
import Aviso from "./Aviso";
import CabeceraPaso from "./CabeceraPaso";
import {
  DIAS_CORTOS,
  ESTADO,
  etiquetaEnOracion,
  fechaLarga,
  siguienteDiaConLibres,
} from "../../dominio/agenda";
import { contar } from "../../dominio/formato";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

const etiquetaDia = (dia) =>
  `${fechaLarga(dia.fecha)}, ${dia.libres ? contar(dia.libres, "horario libre", "horarios libres") : "completo"}`;

const resumenDia = (dia) => {
  if (!dia.turnos.length) return "Ya no quedan horarios.";
  if (!dia.libres) return "Día completo.";
  return contar(dia.libres, "horario libre", "horarios libres") + ".";
};

const Dias = ({ dias, diaClave, onElegir }) => {
  const carrilRef = useRef(null);

  // Centrar el día elegido en el carril (sin animar, para no marear).
  useLayoutEffect(() => {
    const carril = carrilRef.current;
    const el = carril?.querySelector('[aria-pressed="true"]');
    if (el) carril.scrollLeft = el.offsetLeft - (carril.clientWidth - el.offsetWidth) / 2;
  }, [diaClave]);

  return (
    <div ref={carrilRef} className={estilos.dias} role="group" aria-label="Días disponibles">
      {dias.map((dia) => (
        <button
          key={dia.clave}
          type="button"
          className={estilos.dia}
          aria-pressed={dia.clave === diaClave}
          aria-label={etiquetaDia(dia)}
          onClick={() => onElegir(dia.clave)}
        >
          <span>{DIAS_CORTOS[dia.fecha.day()]}</span>
          <b>{dia.fecha.date()}</b>
          <em>{dia.libres ? `${dia.libres} libres` : "Completo"}</em>
        </button>
      ))}
    </div>
  );
};

const Turno = ({ turno, elegido, onElegir }) => {
  if (turno.estadoVista === ESTADO.PROPIO) {
    return (
      <Link className={`${estilos.turno} ${estilos.turnoPropio}`} to={`/editar-turno/${turno._id}`}>
        <span>{turno.hora}</span>
        <small>Tu turno</small>
      </Link>
    );
  }
  const ocupado = turno.estadoVista === ESTADO.OCUPADO;
  return (
    <button
      type="button"
      className={estilos.turno}
      aria-pressed={elegido}
      disabled={ocupado}
      onClick={() => onElegir(turno._id)}
    >
      <span>{turno.hora}</span>
      {ocupado && <small>Reservado</small>}
    </button>
  );
};

const PasoHorario = forwardRef(function PasoHorario(
  { barbero, turnos, dias, diaClave, turnoId, ahora, onElegirDia, onElegirTurno, onVolver },
  tituloRef
) {
  const dia = dias.find((d) => d.clave === diaClave) || null;
  const alternativa = dia && !dia.libres ? siguienteDiaConLibres(dias, dia.clave) : null;

  let contenido;
  if (turnos.cargando) {
    contenido = (
      <div aria-busy="true">
        <span className={comunes.oculto}>Cargando horarios…</span>
        <div className={estilos.dias}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Esqueleto key={i} ancho="66px" alto="82px" radio={18} style={{ flex: "none" }} />
          ))}
        </div>
        <div className={estilos.cabeceraTurnos}>
          <Esqueleto ancho="55%" alto="1.2em" />
        </div>
        <div className={estilos.turnos}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Esqueleto key={i} alto="58px" radio={14} />
          ))}
        </div>
      </div>
    );
  } else if (turnos.error) {
    contenido = (
      <Aviso
        accion={
          <button type="button" className={comunes.enlace} onClick={turnos.recargar}>
            Reintentar
          </button>
        }
      >
        No pudimos cargar los horarios. Revisá tu conexión.
      </Aviso>
    );
  } else if (!dias.length) {
    contenido = (
      <Aviso>
        {barbero?.nombre} no tiene horarios cargados en las próximas semanas. Probá con otro barbero o
        escribinos por WhatsApp.
      </Aviso>
    );
  } else {
    contenido = (
      <>
        <Dias dias={dias} diaClave={diaClave} onElegir={onElegirDia} />
        {dia && (
          <>
            <div className={estilos.cabeceraTurnos}>
              <h3 className={comunes.subtitulo}>{fechaLarga(dia.fecha)}</h3>
              <p aria-live="polite">{resumenDia(dia)}</p>
            </div>
            <div className={estilos.turnos}>
              {dia.turnos.map((t) => (
                <Turno key={t._id} turno={t} elegido={t._id === turnoId} onElegir={onElegirTurno} />
              ))}
            </div>
            {alternativa && (
              <button type="button" className={comunes.enlace} onClick={() => onElegirDia(alternativa.clave)}>
                Ver {etiquetaEnOracion(alternativa.fecha, ahora)}, hay horarios
              </button>
            )}
          </>
        )}
        <p className={comunes.letraChica}>Solo se muestran los horarios que todavía no pasaron.</p>
      </>
    );
  }

  return (
    <div>
      <CabeceraPaso
        ref={tituloRef}
        numero={3}
        titulo="Elegí día y hora"
        onVolver={onVolver}
        etiquetaVolver="Volver al paso anterior"
      />
      {contenido}
    </div>
  );
});

Dias.propTypes = {
  dias: PropTypes.arrayOf(T.dia).isRequired,
  diaClave: PropTypes.string,
  onElegir: PropTypes.func.isRequired,
};

Turno.propTypes = {
  turno: T.turnoVista.isRequired,
  elegido: PropTypes.bool,
  onElegir: PropTypes.func.isRequired,
};

PasoHorario.propTypes = {
  barbero: T.barbero.isRequired,
  turnos: T.peticion(PropTypes.array).isRequired,
  dias: PropTypes.arrayOf(T.dia).isRequired,
  diaClave: PropTypes.string,
  turnoId: PropTypes.string,
  ahora: T.momento.isRequired,
  onElegirDia: PropTypes.func.isRequired,
  onElegirTurno: PropTypes.func.isRequired,
  onVolver: PropTypes.func.isRequired,
};

export default PasoHorario;
