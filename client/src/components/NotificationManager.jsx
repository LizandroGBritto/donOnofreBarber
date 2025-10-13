import { useState, useEffect } from "react";
import { Card, Button, Alert, Badge } from "flowbite-react";
import notificationService from "../services/notificationService";

const NotificationManager = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    checkNotificationStatus();
    setupMessageListener();
    updateDebugInfo();
  }, []);

  const checkNotificationStatus = async () => {
    setIsSupported(notificationService.isNotificationSupported());
    setPermission(notificationService.getPermissionStatus());

    if (notificationService.isNotificationSupported()) {
      const subscribed = await notificationService.isSubscribed();
      setIsSubscribed(subscribed);

      if (subscribed) {
        const subscription = await notificationService.getCurrentSubscription();
        setSubscriptionInfo(subscription);
      }
    }
  };

  const updateDebugInfo = () => {
    const supportInfo = notificationService.getSupportInfo();
    const currentPermission = notificationService.getPermissionStatus();
    
    const debugData = {
      ...supportInfo,
      currentPermission,
      notificationAPI: 'Notification' in window,
      notificationPermission: 'Notification' in window ? Notification.permission : 'no disponible',
      isStandalone: window.navigator.standalone,
      isInSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      timestamp: new Date().toISOString()
    };
    
    setDebugInfo(debugData);
    console.log('🔍 Debug Info iOS Notifications:', debugData);
  };

  const setupMessageListener = () => {
    notificationService.setupMessageListener();
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage("");

    try {
      await notificationService.subscribe("admin");
      setIsSubscribed(true);
      setPermission("granted");
      setMessage("¡Notificaciones activadas exitosamente!");
      setMessageType("success");

      const subscription = await notificationService.getCurrentSubscription();
      setSubscriptionInfo(subscription);
    } catch (error) {
      setMessage(`Error al activar notificaciones: ${error.message}`);
      setMessageType("failure");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setMessage("");

    try {
      await notificationService.unsubscribe();
      setIsSubscribed(false);
      setSubscriptionInfo(null);
      setMessage("Notificaciones desactivadas");
      setMessageType("info");
    } catch (error) {
      setMessage(`Error al desactivar notificaciones: ${error.message}`);
      setMessageType("failure");
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    setMessage("");

    try {
      await notificationService.sendTestNotification();
      setMessage("Notificación de prueba enviada");
      setMessageType("success");
    } catch (error) {
      setMessage(`Error al enviar notificación de prueba: ${error.message}`);
      setMessageType("failure");
    } finally {
      setLoading(false);
    }
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case "granted":
        return <Badge color="success">Permitido</Badge>;
      case "denied":
        return <Badge color="failure">Denegado</Badge>;
      default:
        return <Badge color="warning">Pendiente</Badge>;
    }
  };

  const getSubscriptionBadge = () => {
    return isSubscribed ? (
      <Badge color="success">Activo</Badge>
    ) : (
      <Badge color="gray">Inactivo</Badge>
    );
  };

  if (!isSupported) {
    const supportInfo = notificationService.getSupportInfo();

    return (
      <Card>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Notificaciones Push
          </h3>

          {supportInfo.isIOS && !supportInfo.isIOSSupported ? (
            <Alert color="warning">
              <span className="font-medium">iOS no compatible:</span>
              Se requiere iOS 16.4 o superior para notificaciones push.
              Actualiza tu dispositivo para usar esta función.
            </Alert>
          ) : supportInfo.isIOS && supportInfo.isIOSSupported && (!supportInfo.hasNotification || Notification.permission === 'default') ? (
            <Alert color="info">
              <span className="font-medium">Configuración iOS:</span>
              Para habilitar notificaciones en Safari:
              <ol className="list-decimal list-inside mt-2 text-left">
                <li>
                  Ve a Configuración → Safari → Avanzado → Funciones
                  experimentales
                </li>
                <li>Activa &ldquo;Notificaciones&rdquo;</li>
                <li>Recarga esta página</li>
              </ol>
            </Alert>
          ) : (
            <Alert color="warning">
              <span className="font-medium">No soportado:</span>
              Tu navegador no soporta notificaciones push.
              {!supportInfo.hasServiceWorker && " (Falta Service Worker)"}
              {!supportInfo.hasPushManager && " (Falta Push Manager)"}
              {!supportInfo.hasNotification && " (Falta API Notification)"}
            </Alert>
          )}

          {/* Debug Info siempre visible */}
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
              🔍 Información de depuración (Debug)
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-black">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div><strong>Es iOS:</strong> {supportInfo.isIOS ? '✅ Sí' : '❌ No'}</div>
                <div><strong>Versión iOS:</strong> {supportInfo.iosVersion || 'N/A'}</div>
                <div><strong>Es Safari:</strong> {supportInfo.isSafari ? '✅ Sí' : '❌ No'}</div>
                <div><strong>iOS Soportado:</strong> {supportInfo.isIOSSupported ? '✅ Sí' : '❌ No'}</div>
                <div><strong>Service Worker:</strong> {supportInfo.hasServiceWorker ? '✅ Sí' : '❌ No'}</div>
                <div><strong>Push Manager:</strong> {supportInfo.hasPushManager ? '✅ Sí' : '❌ No'}</div>
                <div><strong>API Notification:</strong> {supportInfo.hasNotification ? '✅ Sí' : '❌ No'}</div>
                <div><strong>Permiso Notification:</strong> {supportInfo.notificationPermission}</div>
                <div><strong>Soporte Real:</strong> {supportInfo.realSupport ? '✅ Sí' : '❌ No'}</div>
                <div><strong>Standalone App:</strong> {supportInfo.isStandalone ? '✅ Sí' : '❌ No'}</div>
                <div><strong>Permiso Estado:</strong> {permission}</div>
                <div><strong>Está Suscrito:</strong> {isSubscribed ? '✅ Sí' : '❌ No'}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <strong>User Agent:</strong>
                <div className="text-xs bg-white p-2 rounded border mt-1 break-all text-black">
                  {supportInfo.userAgent}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <strong>Timestamp:</strong> {new Date().toLocaleString()}
              </div>
            </div>
          </details>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Notificaciones Push
          </h3>
          <div className="flex gap-2">
            {getPermissionBadge()}
            {getSubscriptionBadge()}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>
            Las notificaciones te permitirán recibir alertas en tiempo real
            sobre:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Nuevas reservas de citas</li>
            <li>Modificaciones de turnos</li>
            <li>Cancelaciones de citas</li>
            <li>Recordatorios de próximas citas</li>
          </ul>
        </div>

        {message && <Alert color={messageType}>{message}</Alert>}

        <div className="flex flex-col sm:flex-row gap-3">
          {!isSubscribed ? (
            <Button
              onClick={handleSubscribe}
              disabled={loading || permission === "denied"}
              className="flex-1"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              {loading ? "Activando..." : "🔔 Activar Notificaciones"}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleTestNotification}
                disabled={loading}
                color="blue"
                className="flex-1"
              >
                {loading ? "Enviando..." : "🧪 Probar Notificación"}
              </Button>

              <Button
                onClick={handleUnsubscribe}
                disabled={loading}
                color="failure"
                className="flex-1"
              >
                {loading ? "Desactivando..." : "🔕 Desactivar"}
              </Button>
            </>
          )}
        </div>

        {permission === "denied" && (
          <Alert color="failure">
            <div>
              <span className="font-medium">Permisos denegados:</span>
              <p className="mt-1 text-sm">
                Para activar las notificaciones, debes permitir las
                notificaciones en la configuración de tu navegador:
              </p>
              <ol className="list-decimal list-inside mt-2 text-sm">
                <li>
                  Haz clic en el ícono del candado en la barra de direcciones
                </li>
                <li>Cambia las notificaciones de &ldquo;Bloquear&rdquo; a &ldquo;Permitir&rdquo;</li>
                <li>Recarga la página</li>
              </ol>
            </div>
          </Alert>
        )}

        {/* Debug Info también disponible cuando está soportado */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
            🔍 Información de depuración (Debug)
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-black">
            {(() => {
              const supportInfo = notificationService.getSupportInfo();
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div><strong>Es iOS:</strong> {supportInfo.isIOS ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>Versión iOS:</strong> {supportInfo.iosVersion || 'N/A'}</div>
                    <div><strong>Es Safari:</strong> {supportInfo.isSafari ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>iOS Soportado:</strong> {supportInfo.isIOSSupported ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>Service Worker:</strong> {supportInfo.hasServiceWorker ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>Push Manager:</strong> {supportInfo.hasPushManager ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>API Notification:</strong> {supportInfo.hasNotification ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>Permiso Notification:</strong> {supportInfo.notificationPermission}</div>
                    <div><strong>Soporte Real:</strong> {supportInfo.realSupport ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>Standalone App:</strong> {supportInfo.isStandalone ? '✅ Sí' : '❌ No'}</div>
                    <div><strong>Permiso Estado:</strong> {permission}</div>
                    <div><strong>Está Suscrito:</strong> {isSubscribed ? '✅ Sí' : '❌ No'}</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <strong>User Agent:</strong>
                    <div className="text-xs bg-white p-2 rounded border mt-1 break-all text-black">
                      {supportInfo.userAgent}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <strong>Timestamp:</strong> {new Date().toLocaleString()}
                  </div>
                </>
              );
            })()}
          </div>
        </details>
      </div>
    </Card>
  );
};

export default NotificationManager;
