import { useState, useEffect, useCallback } from "react";
import { Card, Button, Table, Alert, TextInput, Checkbox, Modal, Label } from "flowbite-react";
import axios from "axios";

const DIAS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

/**
 * Panel de horarios propios del barbero.
 *
 * Dos estados posibles:
 *  - Usando los del local: se muestra un cartel y el botón para personalizar,
 *    que CLONA los horarios del local como punto de partida.
 *  - Con horarios propios: ABM completo de sus horas.
 *
 * El clonado existe porque la semántica es de reemplazo, no de suma: los
 * horarios propios sustituyen a los del local. Sin clonar, personalizar
 * significaría arrancar de cero y volver a cargar todo a mano.
 */
const MisHorarios = ({ barberoId }) => {
  const [usaPropios, setUsaPropios] = useState(false);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [alerta, setAlerta] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ hora: "", dias: [] });

  const avisar = (message, type = "success") => {
    setAlerta({ message, type });
    setTimeout(() => setAlerta(null), 4000);
  };

  const base = `${import.meta.env.VITE_API_URL}/api/barberos/${barberoId}/horarios`;

  const cargar = useCallback(async () => {
    if (!barberoId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(base, { withCredentials: true });
      setUsaPropios(data.usaHorariosPropios);
      setHorarios(data.horarios || []);
    } catch (error) {
      console.error("Error al cargar horarios:", error);
      if (error.response?.status !== 401) {
        avisar("No se pudieron cargar tus horarios", "failure");
      }
    } finally {
      setLoading(false);
    }
  }, [barberoId, base]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const conAviso = async (accion, mensajeOk) => {
    try {
      setOcupado(true);
      await accion();
      await cargar();
      avisar(mensajeOk);
    } catch (error) {
      console.error(error);
      avisar(
        error.response?.data?.message || "No se pudo completar la acción",
        "failure"
      );
    } finally {
      setOcupado(false);
    }
  };

  const personalizar = () =>
    conAviso(
      () => axios.post(`${base}/clonar-globales`, {}, { withCredentials: true }),
      "Ahora tenés tus propios horarios. Editalos como quieras."
    );

  const volverAlLocal = () =>
    conAviso(
      () => axios.patch(`${base}/usar-globales`, {}, { withCredentials: true }),
      "Volviste a los horarios del local"
    );

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ hora: "", dias: [] });
    setShowModal(true);
  };

  const abrirEdicion = (horario) => {
    setEditando(horario);
    setForm({ hora: horario.hora, dias: horario.dias || [] });
    setShowModal(true);
  };

  const guardar = () =>
    conAviso(async () => {
      if (editando) {
        await axios.put(`${base}/${editando._id}`, form, { withCredentials: true });
      } else {
        await axios.post(base, form, { withCredentials: true });
      }
      setShowModal(false);
    }, editando ? "Horario actualizado" : "Horario creado");

  const eliminar = (horario) => {
    if (!window.confirm(`¿Eliminar el horario de las ${horario.hora}?`)) return;
    conAviso(
      () => axios.delete(`${base}/${horario._id}`, { withCredentials: true }),
      "Horario eliminado"
    );
  };

  const toggleDia = (dia) =>
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(dia)
        ? f.dias.filter((d) => d !== dia)
        : [...f.dias, dia],
    }));

  if (!barberoId) {
    return (
      <Card>
        <p className="text-gray-500">
          Tu usuario no tiene un barbero asignado. Pedile al administrador que
          te vincule para poder gestionar tus horarios.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <p className="text-center py-8 text-gray-500">Cargando tus horarios...</p>
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

      {!usaPropios ? (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Estás usando los horarios del local
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Trabajás en los mismos horarios que el resto. Si tenés horarios
            distintos, podés personalizarlos: se copian los del local como punto
            de partida y de ahí agregás o sacás las horas que quieras.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {horarios.map((h) => (
              <span
                key={h._id || h.hora}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm"
              >
                {h.hora}
              </span>
            ))}
          </div>
          <Button color="purple" onClick={personalizar} disabled={ocupado}>
            {ocupado ? "Copiando..." : "Personalizar mis horarios"}
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Mis Horarios
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Estos son tus horarios: reemplazan a los del local. Los turnos
                  se regeneran solos al guardar.
                </p>
              </div>
              <div className="flex gap-2">
                <Button color="purple" onClick={abrirNuevo} disabled={ocupado}>
                  Nueva hora
                </Button>
                <Button color="light" onClick={volverAlLocal} disabled={ocupado}>
                  Volver a los del local
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            {horarios.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No tenés ninguna hora cargada, así que no se generarán turnos
                para vos. Agregá al menos una.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <Table.Head>
                    <Table.HeadCell>Hora</Table.HeadCell>
                    <Table.HeadCell>Días</Table.HeadCell>
                    <Table.HeadCell>Acciones</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {horarios.map((h) => (
                      <Table.Row key={h._id} className="bg-white dark:bg-gray-800">
                        <Table.Cell className="font-medium text-gray-900 dark:text-white">
                          {h.hora}
                        </Table.Cell>
                        <Table.Cell className="text-sm text-gray-600">
                          {(h.dias || []).join(", ") || "—"}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-2">
                            <Button
                              size="xs"
                              color="blue"
                              onClick={() => abrirEdicion(h)}
                              disabled={ocupado}
                            >
                              Editar
                            </Button>
                            <Button
                              size="xs"
                              color="failure"
                              onClick={() => eliminar(h)}
                              disabled={ocupado}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {editando ? "Editar hora" : "Nueva hora"}
            </h3>

            <div>
              <Label htmlFor="hora" value="Hora (HH:MM)" />
              <TextInput
                id="hora"
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                required
              />
            </div>

            <div>
              <Label value="Días en los que trabajás a esta hora" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DIAS.map((dia) => (
                  // El color va explícito: sin él, el nombre del día hereda el
                  // blanco del panel y queda invisible sobre el fondo del modal.
                  <label
                    key={dia}
                    className="flex items-center gap-2 capitalize text-gray-900 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.dias.includes(dia)}
                      onChange={() => toggleDia(dia)}
                    />
                    {dia}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                color="purple"
                className="flex-1"
                onClick={guardar}
                disabled={ocupado || !form.hora || form.dias.length === 0}
              >
                {ocupado ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                color="gray"
                className="flex-1"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MisHorarios;
