import { useState, useEffect } from "react";
import axios from "axios";
import { Button, Card, Spinner, Alert } from "flowbite-react";

const WhatsappConnection = () => {
  const [status, setStatus] = useState("disconnected"); // disconnected, connecting, connected
  const [qrCode, setQrCode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verificar estado al cargar
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/whatsapp/status`,
      );
      // El estado viene en response.data.instance.state
      const connectionState = response.data?.instance?.state || "close";

      if (connectionState === "open") {
        setStatus("connected");
      } else if (connectionState === "connecting") {
        setStatus("connecting");
        // Si está conectando, verificar de nuevo en 5 seg
        setTimeout(checkStatus, 5000);
      } else {
        setStatus("disconnected");
      }
      setError(null);
    } catch (err) {
      console.error("Error checking WhatsApp status:", err);
      setStatus("disconnected");
      // No mostrar error visual si es solo que no está conectado
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    setQrCode(null);

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/whatsapp/connect`,
      );

      // La API devuelve { base64: "...", code: "..." } o similar dependiendo de Evolution API
      // Normalmente devuelve base64 directamente o una URL
      if (response.data && response.data.base64) {
        setQrCode(response.data.base64);
        setStatus("connecting");

        // Empezar polling para verificar cuando se conecte
        const interval = setInterval(async () => {
          try {
            const statusRes = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/whatsapp/status`,
            );
            if (statusRes.data?.instance?.state === "open") {
              setStatus("connected");
              setQrCode(null);
              clearInterval(interval);
            }
          } catch (e) {
            // Ignorar errores en polling
          }
        }, 3000);

        // Limpiar intervalo después de 2 minutos
        setTimeout(() => clearInterval(interval), 120000);
      } else if (response.data && response.data.qrcode) {
        // Algunos endpoints devuelven qrcode en lugar de base64
        setQrCode(response.data.qrcode.base64);
      } else {
        setError("No se pudo obtener el código QR");
      }
    } catch (err) {
      console.error("Error connecting WhatsApp:", err);
      setError(
        "Error al intentar conectar. Asegúrate de que Evolution API esté corriendo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <div className="flex flex-col items-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Conexión de WhatsApp
        </h2>

        {/* Estado */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-4 h-4 rounded-full ${
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-red-500"
            }`}
          ></div>
          <span className="font-medium text-gray-700 uppercase">
            {status === "connected"
              ? "Conectado"
              : status === "connecting"
                ? "Esperando conexión..."
                : "Desconectado"}
          </span>
        </div>

        {error && (
          <Alert color="failure" className="w-full">
            <span>{error}</span>
          </Alert>
        )}

        {/* QR Code */}
        {qrCode && status !== "connected" && (
          <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="mb-2 text-sm text-gray-500">
              Escanea este código con tu WhatsApp
            </p>
            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
          </div>
        )}

        {/* Acciones */}
        <div className="w-full pt-4">
          {status === "connected" ? (
            <div className="text-center">
              <p className="text-green-600 mb-4">
                ¡El servicio está activo y enviando mensajes!
              </p>
              <Button color="gray" onClick={checkStatus} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : "Verificar Estado"}
              </Button>
            </div>
          ) : (
            <Button
              gradientDuoTone="greenToBlue"
              className="w-full"
              onClick={handleConnect}
              disabled={isLoading || (status === "connecting" && qrCode)}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Cargando...
                </>
              ) : qrCode ? (
                "Generar Nuevo QR"
              ) : (
                "Conectar WhatsApp"
              )}
            </Button>
          )}
        </div>

        {/* Testing */}
        {status === "connected" && (
          <div className="w-full pt-4 border-t border-gray-200 mt-4">
            <p className="text-xs text-center text-gray-400">
              Se enviará confirmación automática al reservar y recordatorio 1
              hora antes.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WhatsappConnection;
