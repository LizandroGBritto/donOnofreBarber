import { useCallback, useEffect, useRef, useState } from "react";
import { NotificacionesContext } from "./notificar";
import estilos from "./Notificaciones.module.css";
import PropTypes from "prop-types";

/**
 * Píldora breve al pie ("Copiado"). Una sola a la vez: la nueva reemplaza a
 * la anterior. Se anuncia por `role="status"`, sin robar el foco.
 */
export const ProveedorNotificaciones = ({ children, duracionMs = 2200 }) => {
  const [mensaje, setMensaje] = useState(null);
  const temporizador = useRef(null);

  const notificar = useCallback(
    (texto) => {
      clearTimeout(temporizador.current);
      setMensaje(texto);
      temporizador.current = setTimeout(() => setMensaje(null), duracionMs);
    },
    [duracionMs]
  );

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return (
    <NotificacionesContext.Provider value={notificar}>
      {children}
      <div className={estilos.notificacion} role="status" aria-live="polite" hidden={!mensaje}>
        {mensaje}
      </div>
    </NotificacionesContext.Provider>
  );
};

ProveedorNotificaciones.propTypes = {
  children: PropTypes.node,
  duracionMs: PropTypes.number,
};
