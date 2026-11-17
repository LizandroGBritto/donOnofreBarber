import { useEffect, useId, useRef, useState } from "react";
import { IconoCampana } from "../Iconos";
import { PermisoDenegado } from "../../datos/notificacionesPush";
import { textoAnticipacion } from "../../dominio/recordatorio";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./ModalRecordatorio.module.css";
import PropTypes from "prop-types";

/**
 * Después de reservar: "Activá las notificaciones así te avisamos una hora
 * antes". El foco arranca en "Activar". Escape o "Ahora no" lo cierran.
 *
 * `onActivar` hace todo el trabajo (permiso, suscripción y registro en el
 * servidor) y se llama directo desde el clic: el pedido de permiso tiene que
 * salir del gesto del usuario.
 */
const ModalRecordatorio = ({ minutosAntes, onActivar, onCerrar }) => {
  const [fase, setFase] = useState("ofrecer"); // ofrecer | activando | bloqueado | error
  const [detalle, setDetalle] = useState("");
  const activarRef = useRef(null);
  const cajaRef = useRef(null);
  const tituloId = useId();
  const textoId = useId();

  useEffect(() => {
    activarRef.current?.focus();
  }, []);

  useEffect(() => {
    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar();
        return;
      }
      // El foco no sale de la ventana mientras está abierta.
      if (evento.key !== "Tab" || !cajaRef.current) return;
      const enfocables = [...cajaRef.current.querySelectorAll("button:not([disabled])")];
      if (!enfocables.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const activar = async () => {
    setFase("activando");
    try {
      await onActivar();
    } catch (error) {
      if (error instanceof PermisoDenegado) {
        setFase("bloqueado");
        return;
      }
      setDetalle(error?.response?.data?.message || "");
      setFase("error");
    }
  };

  const bloqueado = fase === "bloqueado";

  return (
    <div className={estilos.fondo}>
      <div
        ref={cajaRef}
        className={estilos.caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={textoId}
      >
        <span className={estilos.icono}>
          <IconoCampana />
        </span>

        {bloqueado ? (
          <>
            <h2 id={tituloId} className={estilos.titulo}>
              Atención
            </h2>
            <p id={textoId} className={estilos.texto}>
              Las notificaciones están bloqueadas en este navegador. Si querés el aviso, habilitalas
              en la configuración del sitio y volvé a reservar o abrí tu turno.
            </p>
            <button type="button" className={`${comunes.btn} ${comunes.primario} ${comunes.bloque}`} onClick={onCerrar}>
              Entendido
            </button>
          </>
        ) : (
          <>
            <h2 id={tituloId} className={estilos.titulo}>
              Activá las notificaciones
            </h2>
            <p id={textoId} className={estilos.texto}>
              Así te avisamos {textoAnticipacion(minutosAntes)} antes de tu turno, directo en tu celular.
            </p>
            {fase === "error" && (
              <p className={estilos.aviso} role="alert">
                <strong>Atención: </strong>
                {detalle || "No pudimos activar el aviso. Probá de nuevo."}
              </p>
            )}
            <button
              ref={activarRef}
              type="button"
              className={`${comunes.btn} ${comunes.primario} ${comunes.bloque}`}
              onClick={activar}
              disabled={fase === "activando"}
            >
              {fase === "activando" ? "Activando…" : "Activar"}
            </button>
            <button type="button" className={`${comunes.btn} ${comunes.fantasma} ${comunes.bloque}`} onClick={onCerrar}>
              Ahora no
            </button>
          </>
        )}
      </div>
    </div>
  );
};

ModalRecordatorio.propTypes = {
  minutosAntes: PropTypes.oneOf([60, 40, 20, 5]).isRequired,
  onActivar: PropTypes.func.isRequired,
  onCerrar: PropTypes.func.isRequired,
};

export default ModalRecordatorio;
