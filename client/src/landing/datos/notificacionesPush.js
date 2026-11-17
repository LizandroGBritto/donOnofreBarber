import api from "../../hooks/useApi";
import config from "../../config/api.config";

/**
 * Suscripción push del cliente para el aviso de SU turno.
 *
 * No usa services/notificationService.js: ese es el del panel y registra la
 * suscripción en /api/notifications/subscribe, que recibe el aviso de cada
 * reserva nueva con datos de otros clientes. Esta queda atada a un turno y
 * solo recibe ese aviso.
 */

/** El navegador puede recibir push (en iPhone, solo con la app instalada). */
export const pushDisponible = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** "default", "granted" o "denied"; "denied" también si no hay soporte. */
export const permisoActual = () => (pushDisponible() ? window.Notification.permission : "denied");

export class PermisoDenegado extends Error {}

const claveABytes = (base64) => {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = window.atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
};

/**
 * Pide permiso, suscribe este dispositivo y registra el aviso del turno.
 * Se llama directo desde el clic: el pedido de permiso tiene que ser lo
 * primero (Safari lo exige dentro del gesto del usuario).
 * Devuelve `{ minutosAntes, avisoA }` del servidor.
 */
export const activarRecordatorio = async (turnoId, editToken) => {
  const permiso = await window.Notification.requestPermission();
  if (permiso !== "granted") throw new PermisoDenegado();

  const registro = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) {
    const { data } = await api.get(config.api.vapidPublicKey);
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(data.publicKey),
    });
  }

  const { data } = await api.post(
    config.api.agenda.recordatorioPush(turnoId),
    { suscripcion: suscripcion.toJSON() },
    { params: { t: editToken } }
  );
  return data;
};
