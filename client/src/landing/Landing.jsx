import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import Encabezado from "./componentes/encabezado/Encabezado";
import Escenario from "./componentes/escenario/Escenario";
import SeccionInfo from "./componentes/info/SeccionInfo";
import SeccionInstagram from "./componentes/instagram/SeccionInstagram";
import { ProveedorNotificaciones } from "./componentes/Notificaciones";
import Pie from "./componentes/Pie";
import Reserva from "./componentes/reserva/Reserva";
import {
  listarBarberos,
  listarHorariosDelLocal,
  listarTurnosDeBarbero,
  obtenerContacto,
  obtenerUbicacion,
} from "./datos/clienteLanding";
import { usePeticion } from "./datos/usePeticion";
import { armarDias, proximoLibreEntre } from "./dominio/agenda";
import { estadoApertura, resumirHorarios } from "./dominio/horariosLocal";
import { estadoInicial, reservaReducer } from "./dominio/reserva";
import { idsDeTurnosPropios } from "./dominio/turnosPropios";
import { useAhora } from "./hooks/useAhora";
import { useMovimientoReducido } from "./hooks/useMovimientoReducido";
import comunes from "./estilos/comunes.module.css";
import "./estilos/tokens.css";
import estilos from "./Landing.module.css";

/**
 * El turno libre más cercano entre todos los barberos, para el atajo
 * "Tomarlo" del escenario. Reusa la caché de turnos que después usa el paso 3.
 */
const useProximoLibre = (peticionBarberos, ahora) => {
  const barberos = peticionBarberos.datos;
  const ids = (barberos || []).map((b) => b._id).join(",");
  const agendas = usePeticion(
    () =>
      Promise.all(
        barberos.map((b) => listarTurnosDeBarbero(b._id).then((turnos) => ({ barbero: b, turnos })))
      ),
    [ids],
    { habilitado: Boolean(ids) }
  );

  const libre = useMemo(() => {
    if (!agendas.datos) return null;
    const propios = idsDeTurnosPropios();
    return proximoLibreEntre(
      agendas.datos.map(({ barbero, turnos }) => ({ barbero, dias: armarDias(turnos, ahora, propios) }))
    );
  }, [agendas.datos, ahora]);

  return {
    // Sin barberos (cargados y ninguno activo) no hay nada que buscar: se
    // informa "no hay libres". Mientras cargan, se sigue esperando.
    cargando: peticionBarberos.cargando || agendas.cargando,
    error: peticionBarberos.error || agendas.error,
    libre,
  };
};

const Landing = () => {
  const ahora = useAhora();
  const reducido = useMovimientoReducido();
  const cortinaRef = useRef(null);
  const [reserva, despachar] = useReducer(reservaReducer, estadoInicial);

  const barberos = usePeticion(listarBarberos, []);
  const horarios = usePeticion(listarHorariosDelLocal, []);
  const contacto = usePeticion(obtenerContacto, []);
  const ubicacion = usePeticion(obtenerUbicacion, []);
  const proximo = useProximoLibre(barberos, ahora);

  const filasHorario = useMemo(() => resumirHorarios(horarios.datos || []), [horarios.datos]);
  const apertura = useMemo(
    () => (horarios.datos?.length ? estadoApertura(horarios.datos, ahora) : null),
    [horarios.datos, ahora]
  );

  // Desplazamiento suave y tamaño de texto estable solo mientras se ve la landing.
  useEffect(() => {
    document.documentElement.classList.add("landing-activa");
    return () => document.documentElement.classList.remove("landing-activa");
  }, []);

  const irAReservar = useCallback(() => {
    document.getElementById("reservar")?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  }, [reducido]);

  const volverArriba = useCallback(() => {
    document.getElementById("inicio")?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  }, [reducido]);

  const tomarProximo = useCallback(
    ({ barbero, dia, turno }) => {
      despachar({ type: "tomarProximo", barberoId: barbero._id, diaClave: dia.clave, turnoId: turno._id });
      irAReservar();
    },
    [irAReservar]
  );

  return (
    <ProveedorNotificaciones>
      <div className={`landing ${estilos.pagina}`}>
        <a className={estilos.saltar} href="#reservar">
          Ir a reservar
        </a>
        <Encabezado abierto={Boolean(apertura?.abierto)} />

        <Escenario cortinaRef={cortinaRef} proximo={{ ...proximo, ahora }} onTomarProximo={tomarProximo} />

        <div ref={cortinaRef} className={estilos.cortina}>
          <main className={comunes.contenedor}>
            <Reserva
              estado={reserva}
              despachar={despachar}
              barberos={barberos}
              ahora={ahora}
              contacto={contacto.datos}
              ubicacion={ubicacion.datos}
              filasHorario={filasHorario}
              onVolverArriba={volverArriba}
            />
            <SeccionInstagram contacto={contacto.datos} />
            <SeccionInfo
              horarios={horarios}
              filasHorario={filasHorario}
              hoy={ahora.day()}
              apertura={apertura}
              ubicacion={ubicacion}
              contacto={contacto}
            />
          </main>
          <Pie />
        </div>
      </div>
    </ProveedorNotificaciones>
  );
};

export default Landing;
