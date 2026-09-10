import { useState } from "react";
import { Modal, Button, Alert } from "flowbite-react";
import VistaPreviaArchivo from "./VistaPreviaArchivo";
import { useApi } from "../../hooks/useApi";

const MAX_FOTOS = 5;

/**
 * Fotos propias de un barbero para un servicio del catálogo.
 *
 * Reemplazan a las del local en la landing cuando ese barbero está
 * seleccionado — no se mezclan. Así el cliente ve cortes hechos por esa
 * persona y no fotos genéricas de referencia.
 *
 * Subir una foto NO cambia el precio: si el barbero todavía no tenía
 * personalización, el servidor le crea una heredando el precio del local.
 */
const FotosServicioBarbero = ({ barberoId, servicio, onCerrar, onCambio }) => {
  const api = useApi();
  const [nuevas, setNuevas] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const urlUpload = (nombre) =>
    `${import.meta.env.VITE_API_URL}/uploads/${nombre}`;

  const propias = servicio?.imagenes || [];
  const delLocal = servicio?.imagenesLocal || [];
  const usaPropias = propias.length > 0;
  const cupoLibre = MAX_FOTOS - propias.length;

  const elegirArchivos = (e) => {
    const elegidos = Array.from(e.target.files || []);
    setError(null);
    setNuevas(elegidos.slice(0, Math.max(0, cupoLibre)));
  };

  const subir = async () => {
    if (nuevas.length === 0) return;
    try {
      setOcupado(true);
      setError(null);
      const formData = new FormData();
      nuevas.forEach((archivo) => formData.append("imagenes", archivo));

      await api.barberos.subirImagenesServicio(
        barberoId,
        servicio.servicioId,
        formData
      );
      setNuevas([]);
      await onCambio();
    } catch (err) {
      console.error("Error al subir fotos:", err);
      setError(err.response?.data?.message || "No se pudieron subir las fotos");
    } finally {
      setOcupado(false);
    }
  };

  const quitar = async (nombre) => {
    try {
      setOcupado(true);
      setError(null);
      await api.barberos.quitarImagenServicio(
        barberoId,
        servicio.servicioId,
        nombre
      );
      await onCambio();
    } catch (err) {
      console.error("Error al quitar foto:", err);
      setError(err.response?.data?.message || "No se pudo quitar la foto");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Modal show={Boolean(servicio)} onClose={onCerrar} size="2xl">
      <Modal.Header>Fotos de {servicio?.nombre}</Modal.Header>
      <Modal.Body>
        <div className="space-y-5">
          {error && <Alert color="failure">{error}</Alert>}

          <p className="text-sm text-gray-600">
            {usaPropias
              ? "Se están mostrando tus fotos. Si las quitás todas, vuelven a verse las del local."
              : "Ahora se muestran las fotos del local. Si subís las tuyas, reemplazan a esas."}
          </p>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              Mis fotos {usaPropias && <span className="text-green-600">(en uso)</span>}
            </h4>
            {propias.length === 0 ? (
              <p className="text-sm text-gray-400">Todavía no subiste ninguna.</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {propias.map((nombre) => (
                  <div key={nombre} className="relative">
                    <img
                      src={urlUpload(nombre)}
                      alt="Foto propia"
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => quitar(nombre)}
                      aria-label="Quitar foto"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {delLocal.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                Fotos del local{" "}
                {!usaPropias && <span className="text-green-600">(en uso)</span>}
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {delLocal.map((nombre) => (
                  <img
                    key={nombre}
                    src={urlUpload(nombre)}
                    alt="Foto del local"
                    className={`w-full h-20 object-cover rounded border ${
                      usaPropias ? "opacity-40" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="fotosServicio"
              className="block text-sm font-semibold text-gray-800 mb-1"
            >
              Agregar fotos
            </label>
            <input
              id="fotosServicio"
              type="file"
              multiple
              accept="image/*"
              disabled={ocupado || cupoLibre <= 0}
              onChange={elegirArchivos}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              {cupoLibre > 0
                ? `Podés subir ${cupoLibre} más. JPG, PNG o WEBP, hasta 5MB cada una.`
                : `Llegaste al máximo de ${MAX_FOTOS}. Quitá alguna para subir otra.`}
            </p>

            {nuevas.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-3">
                {nuevas.map((archivo, i) => (
                  <VistaPreviaArchivo
                    key={`${archivo.name}-${archivo.size}-${i}`}
                    archivo={archivo}
                    alt={`Nueva foto ${i + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          color="purple"
          onClick={subir}
          disabled={ocupado || nuevas.length === 0}
        >
          {ocupado ? "Subiendo..." : `Subir ${nuevas.length || ""}`.trim()}
        </Button>
        <Button color="gray" onClick={onCerrar} disabled={ocupado}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FotosServicioBarbero;
