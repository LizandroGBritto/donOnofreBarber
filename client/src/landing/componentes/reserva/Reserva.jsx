import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BarraAccion from "./BarraAccion";
import PasoBarbero from "./PasoBarbero";
import PasoDatos from "./PasoDatos";
import PasoHorario from "./PasoHorario";
import PasoServicios from "./PasoServicios";
import Pasos from "./Pasos";
import Ticket from "./Ticket";
import ModalRecordatorio from "./ModalRecordatorio";
import { useNotificar } from "../notificar";
import { activarRecordatorio, permisoActual, pushDisponible } from "../../datos/notificacionesPush";
import {
  avisoParaTurno,
  marcarRecordatorio,
  recordatorioResuelto,
  textoAnticipacion,
} from "../../dominio/recordatorio";
import ParaguayDateUtil from "../../../utils/paraguayDate";
import {
  invalidarTurnos,
  listarServiciosDeBarbero,
  listarTurnosDeBarbero,
  reservarTurno,
  verificarTurnoAbierto,
} from "../../datos/clienteLanding";
import { usePeticion } from "../../datos/usePeticion";
import { ESTADO, armarDias, etiquetaCorta, primerDiaConLibres } from "../../dominio/agenda";
import { celularValido, limpiarCelular, nombreValido } from "../../dominio/celular";
import { avisoParaError } from "../../dominio/avisos";
import { contar, guaranies } from "../../dominio/formato";
import { idsDeTurnosPropios, recordarTurnoPropio } from "../../dominio/turnosPropios";
import { useEnPantalla } from "../../hooks/useEnPantalla";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

/**
 * Se ofrece el aviso push si este navegador puede recibirlo, no lo bloqueó,
 * no se resolvió ya para este turno y faltan más de 5 minutos.
 */
const ofrecerAviso = (turno) => {
  if (!turno?._id || !turno.editToken || !pushDisponible()) return null;
  if (permisoActual() === "denied" || recordatorioResuelto(turno._id)) return null;
  return avisoParaTurno(turno, ParaguayDateUtil.now());
};

/**
 * Asistente de reserva: barbero → servicios → horario → datos → ticket.
 *
 * El estado vive en Landing (el escenario también lo usa para "Tomarlo"); acá
 * se cargan los datos del barbero elegido, se coordinan los pasos y se
 * confirma contra el servidor.
 */
const Reserva = ({ estado, despachar, barberos, ahora, contacto, ubicacion, filasHorario, onVolverArriba }) => {
  const seccionRef = useRef(null);
  const tituloRef = useRef(null);
  const enPantalla = useEnPantalla(seccionRef);
  const reducido = useMovimientoReducido();
  const [idsPropios, setIdsPropios] = useState(idsDeTurnosPropios);
  // Minutos de anticipación del aviso push que se ofrece al confirmar, o null.
  const [ofertaAviso, setOfertaAviso] = useState(null);
  const notificar = useNotificar();

  const { paso, barberoId, servicioIds, diaClave, turnoId, confirmado } = estado;
  const barbero = useMemo(
    () => barberos.datos?.find((b) => b._id === barberoId) || null,
    [barberos.datos, barberoId]
  );

  const servicios = usePeticion(() => listarServiciosDeBarbero(barberoId), [barberoId], {
    habilitado: Boolean(barberoId),
  });
  const turnos = usePeticion(() => listarTurnosDeBarbero(barberoId), [barberoId], {
    habilitado: Boolean(barberoId),
  });

  const dias = useMemo(
    () => armarDias(turnos.datos || [], ahora, idsPropios),
    [turnos.datos, ahora, idsPropios]
  );
  const turnoElegido = useMemo(() => {
    for (const d of dias) {
      const t = d.turnos.find((x) => x._id === turnoId);
      if (t) return t;
    }
    return null;
  }, [dias, turnoId]);
  const serviciosElegidos = useMemo(
    () => (servicios.datos || []).filter((s) => servicioIds.includes(s._id)),
    [servicios.datos, servicioIds]
  );
  const total = serviciosElegidos.reduce((suma, s) => suma + (s.precio || 0), 0);

  // Lo elegido tiene que seguir existiendo en lo que llegó del servidor.
  useEffect(() => {
    if (servicios.datos) despachar({ type: "podarServicios", disponibles: servicios.datos.map((s) => s._id) });
  }, [servicios.datos, despachar]);

  useEffect(() => {
    if (!turnos.datos || turnos.cargando) return;
    if (!diaClave || !dias.some((d) => d.clave === diaClave)) {
      const primero = primerDiaConLibres(dias);
      if (primero) despachar({ type: "elegirDia", diaClave: primero });
    }
    // Un turno elegido que ya no está libre (lo tomó otro, o pasó la hora)
    // se suelta en vez de dejar avanzar con algo que el servidor va a rechazar.
    if (turnoId && turnoElegido?.estadoVista !== ESTADO.LIBRE) despachar({ type: "perderTurno" });
  }, [turnos.datos, turnos.cargando, dias, diaClave, turnoId, turnoElegido, despachar]);

  // Al cambiar de paso: llevar la vista al inicio de la reserva y el foco al
  // título, para que un lector de pantalla anuncie el paso nuevo.
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    seccionRef.current?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
    // Con el modal del aviso abierto el foco es suyo; al cerrarlo vuelve acá.
    if (!ofertaAviso) tituloRef.current?.focus({ preventScroll: true });
  }, [paso, confirmado, reducido, ofertaAviso]);

  const confirmar = useCallback(async () => {
    if (!barbero || !turnoElegido || estado.enviando) return;
    const celular = limpiarCelular(estado.celular);
    despachar({ type: "enviar" });

    try {
      // Regla del negocio: un turno abierto por celular en las próximas 12 h.
      // Si la consulta falla se sigue: es una ayuda, no la validación.
      try {
        const verificacion = await verificarTurnoAbierto(celular);
        if (verificacion?.tieneTurno) {
          const t = verificacion.turno || {};
          despachar({
            type: "fallar",
            aviso: {
              titulo: "Ya tenés un turno",
              texto: `Tenés un turno el ${t.fecha} a las ${t.hora} con ${t.barbero}. Para reservar otro, primero cancelá o completá ese.`,
            },
          });
          return;
        }
      } catch {
        /* se sigue con la reserva */
      }

      const respuesta = await reservarTurno({
        fecha: turnoElegido.fecha,
        hora: turnoElegido.hora,
        barberoId: barbero._id,
        nombreCliente: estado.nombre.trim(),
        numeroCliente: celular,
        servicioIds,
      });

      const turno = respuesta?.turno;
      recordarTurnoPropio(turno, celular);
      setIdsPropios(idsDeTurnosPropios());
      invalidarTurnos(barbero._id);
      setOfertaAviso(ofrecerAviso(turno));
      despachar({ type: "confirmar", turno });
    } catch (error) {
      const r = avisoParaError(error);
      despachar({ type: "fallar", ...r });
      if (r.refrescarTurnos) {
        invalidarTurnos(barbero._id);
        turnos.recargar();
      }
      if (r.refrescarServicios) servicios.recargar();
      if (r.refrescarBarberos) barberos.recargar();
    }
  }, [barbero, turnoElegido, estado.enviando, estado.celular, estado.nombre, servicioIds, despachar, turnos, servicios, barberos]);

  const activarAviso = useCallback(async () => {
    const turno = confirmado;
    const { minutosAntes } = await activarRecordatorio(turno._id, turno.editToken);
    marcarRecordatorio(turno._id, "activado");
    setOfertaAviso(null);
    notificar(`Listo: te avisamos ${textoAnticipacion(minutosAntes)} antes`);
  }, [confirmado, notificar]);

  const cerrarAviso = useCallback(() => {
    if (confirmado?._id) marcarRecordatorio(confirmado._id, "descartado");
    setOfertaAviso(null);
  }, [confirmado]);

  const nuevaReserva = useCallback(() => {
    invalidarTurnos();
    setOfertaAviso(null);
    despachar({ type: "reiniciar" });
  }, [despachar]);

  // Barra de acción de cada paso
  const datosValidos = nombreValido(estado.nombre) && celularValido(estado.celular);
  const barra = {
    2: {
      etiqueta: servicioIds.length ? contar(servicioIds.length, "servicio") : "Servicios",
      resumen: servicioIds.length ? guaranies(total) : "Elegí al menos uno",
      textoBoton: "Continuar",
      habilitado: servicioIds.length > 0,
    },
    3: {
      etiqueta: "Horario",
      resumen: turnoElegido ? `${etiquetaCorta(turnoElegido.fecha, ahora)}, ${turnoElegido.hora}` : "Elegí día y hora",
      textoBoton: "Continuar",
      habilitado: Boolean(turnoElegido),
    },
    4: {
      etiqueta: "Total",
      resumen: guaranies(total),
      textoBoton: estado.enviando ? "Reservando…" : "Confirmar",
      habilitado: datosValidos && !estado.enviando,
      formulario: "form-reserva",
    },
  }[paso];

  const volver = () => despachar({ type: "retroceder" });

  let panel;
  if (confirmado) {
    panel = (
      <Ticket
        ref={tituloRef}
        turno={confirmado}
        barbero={barbero || confirmado.barbero}
        ubicacion={ubicacion}
        contacto={contacto}
        filasHorario={filasHorario}
        onNueva={nuevaReserva}
      />
    );
  } else if (paso === 1) {
    panel = (
      <PasoBarbero
        ref={tituloRef}
        barberos={barberos}
        barberoId={barberoId}
        onElegir={(id) => despachar({ type: "elegirBarbero", barberoId: id })}
        onVolverArriba={onVolverArriba}
      />
    );
  } else if (paso === 2) {
    panel = (
      <PasoServicios
        ref={tituloRef}
        barbero={barbero}
        servicios={servicios}
        elegidos={servicioIds}
        onAlternar={(id) => despachar({ type: "alternarServicio", servicioId: id })}
        onVolver={volver}
        onCambiarBarbero={volver}
      />
    );
  } else if (paso === 3) {
    panel = (
      <PasoHorario
        ref={tituloRef}
        barbero={barbero}
        turnos={turnos}
        dias={dias}
        diaClave={diaClave}
        turnoId={turnoId}
        ahora={ahora}
        onElegirDia={(clave) => despachar({ type: "elegirDia", diaClave: clave })}
        onElegirTurno={(id) => despachar({ type: "elegirTurno", turnoId: id })}
        onVolver={volver}
      />
    );
  } else if (turnoElegido && barbero) {
    panel = (
      <PasoDatos
        ref={tituloRef}
        barbero={barbero}
        turno={turnoElegido}
        servicios={serviciosElegidos}
        nombre={estado.nombre}
        celular={estado.celular}
        aviso={estado.aviso}
        enviando={estado.enviando}
        onCampo={(campo, valor) => despachar({ type: "editarCampo", campo, valor })}
        onConfirmar={confirmar}
        onVolver={volver}
      />
    );
  } else {
    // Paso 4 sin turno válido: el efecto de arriba lo devuelve al paso 3.
    panel = null;
  }

  // Los avisos de los pasos 1 a 3 (p. ej. un 409 que mandó de vuelta a
  // elegir horario) se muestran arriba del paso. El del paso 4 lo muestra
  // el formulario.
  const avisoArriba = estado.aviso && paso < 4 && !confirmado;

  return (
    <>
      <section ref={seccionRef} className={estilos.reserva} id="reservar" aria-label="Reservar turno">
        {!confirmado && (
          <Pasos actual={paso} onIr={(n) => despachar({ type: "irAPaso", paso: n })} />
        )}
        {avisoArriba && (
          <div className={estilos.avisoArriba} role="alert">
            <p className={estilos.avisoTitulo}>{estado.aviso.titulo}</p>
            <p>{estado.aviso.texto}</p>
            <button type="button" className={comunes.enlace} onClick={() => despachar({ type: "cerrarAviso" })}>
              Entendido
            </button>
          </div>
        )}
        {panel}
      </section>

      {confirmado && ofertaAviso && (
        <ModalRecordatorio minutosAntes={ofertaAviso} onActivar={activarAviso} onCerrar={cerrarAviso} />
      )}

      <BarraAccion
        visible={enPantalla && !confirmado && paso >= 2 && Boolean(barra)}
        {...barra}
        onAtras={volver}
        onSeguir={() => despachar({ type: "avanzar" })}
      />
    </>
  );
};

Reserva.propTypes = {
  estado: T.estadoReserva.isRequired,
  despachar: PropTypes.func.isRequired,
  barberos: T.peticion(PropTypes.arrayOf(T.barbero)).isRequired,
  ahora: T.momento.isRequired,
  contacto: T.contacto,
  ubicacion: T.ubicacion,
  filasHorario: PropTypes.arrayOf(T.filaHorario).isRequired,
  onVolverArriba: PropTypes.func.isRequired,
};

export default Reserva;
