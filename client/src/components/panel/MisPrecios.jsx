import { useState, useEffect, useCallback } from "react";
import { Card, Button, Table, Alert, TextInput, ToggleSwitch } from "flowbite-react";
import axios from "axios";

/**
 * Precios de un barbero sobre el catálogo del local.
 *
 * El catálogo (qué servicios existen) lo define el admin en la sección
 * Servicios; ahí se fija el PRECIO DEL LOCAL. Acá solo se decide cuánto cobra
 * este barbero en particular, y si lo ofrece. Un servicio sin personalizar usa
 * el precio del local: eso muestra el badge y eso restaura "Volver al del local".
 *
 * El mismo componente sirve para dos casos:
 *  - el barbero editando lo suyo ("Mis Precios")
 *  - el admin editando los de cualquiera (`nombreBarbero` presente)
 * El backend ya lo permite: `requireBarberoPropio` deja pasar al admin.
 */
const MisPrecios = ({ barberoId, nombreBarbero = null }) => {
  const esVistaAdmin = Boolean(nombreBarbero);
  const [precios, setPrecios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState(null);

  const avisar = (message, type = "success") => {
    setAlerta({ message, type });
    setTimeout(() => setAlerta(null), 4000);
  };

  const cargar = useCallback(async () => {
    if (!barberoId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/barberos/${barberoId}/precios`,
        { withCredentials: true }
      );
      setPrecios(data.precios || []);
    } catch (error) {
      console.error("Error al cargar precios:", error);
      if (error.response?.status !== 401) {
        avisar("No se pudieron cargar tus precios", "failure");
      }
    } finally {
      setLoading(false);
    }
  }, [barberoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarPrecio = (servicioId, valor) => {
    setPrecios((previos) =>
      previos.map((p) =>
        p.servicioId === servicioId
          ? { ...p, precio: valor === "" ? "" : Number(valor), personalizado: true }
          : p
      )
    );
  };

  const cambiarActivo = (servicioId, activo) => {
    setPrecios((previos) =>
      previos.map((p) => (p.servicioId === servicioId ? { ...p, activo } : p))
    );
  };

  const guardar = async (cambios) => {
    try {
      setGuardando(true);
      const { data } = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/barberos/${barberoId}/precios`,
        cambios,
        { withCredentials: true }
      );
      setPrecios(data.precios || []);
      avisar("Precios guardados");
    } catch (error) {
      console.error("Error al guardar precios:", error);
      avisar(
        error.response?.data?.message || "No se pudieron guardar los precios",
        "failure"
      );
    } finally {
      setGuardando(false);
    }
  };

  const guardarTodo = () =>
    guardar(
      precios.map((p) => ({
        servicioId: p.servicioId,
        precio: p.precio === "" ? null : p.precio,
        activo: p.activo,
      }))
    );

  if (!barberoId) {
    return (
      <Card>
        <p className="text-gray-500">
          Tu usuario no tiene un barbero asignado. Pedile al administrador que
          te vincule para poder gestionar tus precios.
        </p>
      </Card>
    );
  }

  const etiquetaGuardar = esVistaAdmin ? "Guardar precios" : "Guardar cambios";

  if (loading) {
    return (
      <Card>
        <p className="text-center py-8 text-gray-500">Cargando tus precios...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {alerta && (
        <Alert color={alerta.type} onDismiss={() => setAlerta(null)}>
          {alerta.message}
        </Alert>
      )}

      <Card>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {esVistaAdmin ? `Precios de ${nombreBarbero}` : "Mis Precios"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {esVistaAdmin
                ? `Precio que cobra ${nombreBarbero} por cada servicio. Los que no estén personalizados usan el precio del local.`
                : "Poné tu propio precio para cada servicio. Los que no toques usan el precio del local."}
            </p>
          </div>
          <Button color="purple" onClick={guardarTodo} disabled={guardando}>
            {guardando ? "Guardando..." : etiquetaGuardar}
          </Button>
        </div>
      </Card>

      <Card>
        {precios.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            No hay servicios en el catálogo todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Table.Head>
                <Table.HeadCell>Servicio</Table.HeadCell>
                <Table.HeadCell>Precio del local</Table.HeadCell>
                <Table.HeadCell>{esVistaAdmin ? "Su precio" : "Mi precio"}</Table.HeadCell>
                <Table.HeadCell>{esVistaAdmin ? "Lo ofrece" : "Lo ofrezco"}</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {precios.map((p) => (
                  <Table.Row key={p.servicioId} className="bg-white dark:bg-gray-800">
                    <Table.Cell className="font-medium text-gray-900 dark:text-white">
                      {p.nombre}
                    </Table.Cell>
                    <Table.Cell className="text-gray-500">
                      ₲{p.precioGlobal?.toLocaleString()}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <TextInput
                          type="number"
                          min={0}
                          value={p.precio ?? ""}
                          onChange={(e) => cambiarPrecio(p.servicioId, e.target.value)}
                          className="w-32"
                          disabled={!p.activo}
                        />
                        {!p.personalizado && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            precio del local
                          </span>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <ToggleSwitch
                        checked={p.activo}
                        label=""
                        onChange={(valor) => cambiarActivo(p.servicioId, valor)}
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MisPrecios;
