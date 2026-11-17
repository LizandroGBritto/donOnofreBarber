import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import Encabezado from "./componentes/encabezado/Encabezado";
import Escenario from "./componentes/escenario/Escenario";
import SeccionInfo from "./componentes/info/SeccionInfo";
import SeccionInstagram from "./componentes/instagram/SeccionInstagram";
import { ProveedorNotificaciones } from "./componentes/Notificaciones";
import Pie from "./componentes/Pie";
import Reserva from "./componentes/reserva/Reserva";
import { listarBarberos, listarHorariosDelLocal, obtenerContacto, obtenerUbicacion } from "./datos/clienteLanding";
import { usePeticion } from "./datos/usePeticion";
import { estadoApertura, resumirHorarios } from "./dominio/horariosLocal";
import { estadoInicial, reservaReducer } from "./dominio/reserva";
import { useAhora } from "./hooks/useAhora";
import { useMovimientoReducido } from "./hooks/useMovimientoReducido";
import comunes from "./estilos/comunes.module.css";
import "./estilos/tokens.css";
import estilos from "./Landing.module.css";

const Landing = () => {
  const ahora = useAhora();
  const reducido = useMovimientoReducido();
  const cortinaRef = useRef(null);
  const [reserva, despachar] = useReducer(reservaReducer, estadoInicial);

  const barberos = usePeticion(listarBarberos, []);
  const horarios = usePeticion(listarHorariosDelLocal, []);
  const contacto = usePeticion(obtenerContacto, []);
  const ubicacion = usePeticion(obtenerUbicacion, []);

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

  const volverArriba = useCallback(() => {
    document.getElementById("inicio")?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  }, [reducido]);

  return (
    <ProveedorNotificaciones>
      <div className={`landing ${estilos.pagina}`}>
        <a className={estilos.saltar} href="#reservar">
          Ir a reservar
        </a>
        <Encabezado abierto={Boolean(apertura?.abierto)} />

        <Escenario cortinaRef={cortinaRef} />

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
