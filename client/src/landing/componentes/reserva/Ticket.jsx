import { forwardRef, useState } from "react";
import { Link } from "react-router-dom";
import { fechaLarga } from "../../dominio/agenda";
import { guaranies } from "../../dominio/formato";
import { codigoDeTurno } from "../../dominio/ticket";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";


/**
 * Ticket del turno confirmado. Todo lo que muestra sale de la respuesta del
 * servidor (hora, servicios y total cobrable), no de lo que se eligió en
 * pantalla. El dorso tiene cómo llegar.
 */
const Ticket = forwardRef(function Ticket({ turno, barbero, ubicacion, filasHorario, contacto, onNueva }, tituloRef) {
  const [dado, setDado] = useState(false);
  const servicios = (turno.servicios || []).map((s) => s.nombre).join(", ");
  const total = turno.costoTotal ?? turno.costoServicios ?? 0;

  return (
    <div>
      <h2 ref={tituloRef} tabIndex={-1} className={comunes.titulo}>
        Tu turno está reservado
      </h2>

      <div className={estilos.ticket} data-dado={dado}>
        {/* Tocar el ticket lo da vuelta, como en la demo. El botón de abajo
            hace lo mismo y es el camino accesible por teclado. */}
        <div className={estilos.ticketInterior} onClick={() => setDado((d) => !d)}>
          <div className={estilos.cara} inert={dado ? "" : undefined}>
            <p className={estilos.ticketFecha}>Turno reservado</p>
            <p className={estilos.ticketHora}>{turno.hora}</p>
            <p className={estilos.ticketFecha}>{fechaLarga(turno.fecha)}</p>
            <div className={estilos.perforado} />
            <dl className={estilos.lista}>
              <div>
                <dt>Cliente</dt>
                <dd>{turno.nombreCliente}</dd>
              </div>
              <div>
                <dt>Barbero</dt>
                <dd>{barbero?.nombre}</dd>
              </div>
              {servicios && (
                <div>
                  <dt>Servicios</dt>
                  <dd>{servicios}</dd>
                </div>
              )}
              <div>
                <dt>Total</dt>
                <dd>{guaranies(total)}</dd>
              </div>
            </dl>
            <p className={estilos.codigo}>{codigoDeTurno(turno, barbero)}</p>
          </div>

          <div className={`${estilos.cara} ${estilos.dorso}`} inert={dado ? undefined : ""}>
            <p className={estilos.ticketFecha}>Cómo llegar</p>
            <p className={estilos.ticketHora} style={{ fontSize: "2.2rem" }}>
              Alonzo Style
            </p>
            <div className={estilos.perforado} />
            <dl className={estilos.lista}>
              {ubicacion?.direccion && (
                <div>
                  <dt>Dirección</dt>
                  <dd>{ubicacion.direccion}</dd>
                </div>
              )}
              {filasHorario.map((f) => (
                <div key={f.clave}>
                  <dt>{f.etiqueta}</dt>
                  <dd>{f.rango}</dd>
                </div>
              ))}
              {contacto?.instagram && (
                <div>
                  <dt>Instagram</dt>
                  <dd>{contacto.instagram}</dd>
                </div>
              )}
            </dl>
            <p className={estilos.codigo}>Tocá para volver</p>
          </div>
        </div>
      </div>

      <div className={estilos.accionesFinales}>
        <button
          className={`${comunes.btn} ${comunes.fantasma} ${comunes.bloque}`}
          type="button"
          aria-pressed={dado}
          onClick={() => setDado((d) => !d)}
        >
          Dar vuelta el ticket
        </button>
        <Link className={`${comunes.btn} ${comunes.fantasma} ${comunes.bloque}`} to={`/editar-turno/${turno._id}`}>
          Modificar o cancelar
        </Link>
        <button className={`${comunes.btn} ${comunes.primario} ${comunes.bloque}`} type="button" onClick={onNueva}>
          Nueva reserva
        </button>
      </div>
      <p className={comunes.letraChica}>
        El turno quedó guardado en este dispositivo: podés modificarlo o cancelarlo desde acá.
      </p>
    </div>
  );
});

Ticket.propTypes = {
  turno: T.turnoConfirmado.isRequired,
  barbero: PropTypes.shape({ nombre: PropTypes.string }),
  ubicacion: T.ubicacion,
  filasHorario: PropTypes.arrayOf(T.filaHorario).isRequired,
  contacto: T.contacto,
  onNueva: PropTypes.func.isRequired,
};

export default Ticket;
