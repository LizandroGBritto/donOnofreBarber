import { createContext, useContext } from "react";

/** Lo provee `ProveedorNotificaciones`; fuera de él, notificar no hace nada. */
export const NotificacionesContext = createContext(() => {});

/** `notificar("Copiado")` muestra la píldora del pie. */
export const useNotificar = () => useContext(NotificacionesContext);
