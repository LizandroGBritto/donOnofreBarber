import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Label,
  TextInput,
  Alert,
} from "flowbite-react";
import axios from "axios";

const GestionUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [usuarioForm, setUsuarioForm] = useState({
    userName: "",
    password: "",
    confirmPassword: "",
  });
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Función para mostrar alertas
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(
      () => setAlert({ show: false, message: "", type: "success" }),
      3000
    );
  };

  // Cargar usuarios
  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/`,
        {
          withCredentials: true,
        }
      );
      setUsuarios(response.data);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      if (error.response?.status === 401) {
        showAlert(
          "Sesión expirada. Por favor, inicia sesión nuevamente.",
          "failure"
        );
        // Opcional: redirigir al login
        // window.location.href = "/admin";
      } else {
        showAlert("Error al cargar usuarios", "failure");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear o actualizar usuario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!usuarioForm.userName.trim()) {
      showAlert("El nombre de usuario es requerido", "failure");
      return;
    }

    if (!selectedUsuario && !usuarioForm.password) {
      showAlert("La contraseña es requerida para nuevos usuarios", "failure");
      return;
    }

    if (
      usuarioForm.password &&
      usuarioForm.password !== usuarioForm.confirmPassword
    ) {
      showAlert("Las contraseñas no coinciden", "failure");
      return;
    }

    if (usuarioForm.password && usuarioForm.password.length < 8) {
      showAlert("La contraseña debe tener al menos 8 caracteres", "failure");
      return;
    }

    try {
      const userData = {
        userName: usuarioForm.userName,
      };

      // Solo incluir password si se proporciona
      if (usuarioForm.password) {
        userData.password = usuarioForm.password;
        userData.confirmPassword = usuarioForm.confirmPassword; // Agregar confirmPassword
      }

      if (selectedUsuario) {
        // Actualizar
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/user/${selectedUsuario._id}`,
          userData,
          { withCredentials: true }
        );
        showAlert("Usuario actualizado exitosamente");
      } else {
        // Crear
        userData.password = usuarioForm.password; // Password es requerido para crear
        userData.confirmPassword = usuarioForm.confirmPassword; // confirmPassword es requerido para crear
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/user/register`,
          userData,
          {
            withCredentials: true,
          }
        );
        showAlert("Usuario creado exitosamente");
      }

      resetForm();
      setShowModal(false);
      fetchUsuarios();
    } catch (error) {
      console.error("Error al guardar usuario:", error);

      // Manejo más específico de errores
      let errorMessage = "Error al guardar usuario";

      if (error.response?.data?.errors) {
        // Errores de validación de Mongoose
        const validationErrors = error.response.data.errors;
        const errorKeys = Object.keys(validationErrors);
        if (errorKeys.length > 0) {
          errorMessage = validationErrors[errorKeys[0]].message;
        }
      } else if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showAlert(errorMessage, "failure");
    }
  };

  // Eliminar usuario
  const deleteUsuario = async (id) => {
    if (
      !window.confirm("¿Estás seguro de que quieres eliminar este usuario?")
    ) {
      return;
    }

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/user/${id}`, {
        withCredentials: true,
      });
      showAlert("Usuario eliminado exitosamente");
      fetchUsuarios();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      showAlert("Error al eliminar usuario", "failure");
    }
  };

  // Editar usuario
  const editUsuario = (usuario) => {
    setSelectedUsuario(usuario);
    setUsuarioForm({
      userName: usuario.userName,
      password: "",
      confirmPassword: "",
    });
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setSelectedUsuario(null);
    setUsuarioForm({
      userName: "",
      password: "",
      confirmPassword: "",
    });
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando usuarios...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {alert.show && (
        <Alert
          color={alert.type}
          onDismiss={() =>
            setAlert({ show: false, message: "", type: "success" })
          }
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Gestión de Usuarios
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Administra los usuarios del panel
            </p>
          </div>
          <Button
            color="purple"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            Nuevo Usuario
          </Button>
        </div>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        {usuarios.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No hay usuarios registrados
            </p>
            <Button
              color="purple"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              Crear Primer Usuario
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Table.Head>
                <Table.HeadCell>Usuario</Table.HeadCell>
                <Table.HeadCell>Fecha de Creación</Table.HeadCell>
                <Table.HeadCell>Última Actualización</Table.HeadCell>
                <Table.HeadCell>Acciones</Table.HeadCell>
              </Table.Head>
              <Table.Body>
                {usuarios.map((usuario) => (
                  <Table.Row
                    key={usuario._id}
                    className="bg-white dark:bg-gray-800"
                  >
                    <Table.Cell className="font-medium text-gray-900 dark:text-white">
                      {usuario.userName}
                    </Table.Cell>
                    <Table.Cell>
                      {new Date(usuario.createdAt).toLocaleDateString("es-PY")}
                    </Table.Cell>
                    <Table.Cell>
                      {new Date(usuario.updatedAt).toLocaleDateString("es-PY")}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          color="blue"
                          onClick={() => editUsuario(usuario)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="xs"
                          color="failure"
                          onClick={() => deleteUsuario(usuario._id)}
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

      {/* Modal para crear/editar usuario */}
      <Modal show={showModal} onClose={closeModal} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {selectedUsuario ? "Editar Usuario" : "Crear Nuevo Usuario"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="userName" value="Nombre de Usuario" />
                <TextInput
                  id="userName"
                  value={usuarioForm.userName}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, userName: e.target.value })
                  }
                  placeholder="Ingresa el nombre de usuario"
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="password"
                  value={
                    selectedUsuario
                      ? "Nueva Contraseña (opcional)"
                      : "Contraseña"
                  }
                />
                <TextInput
                  id="password"
                  type="password"
                  value={usuarioForm.password}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, password: e.target.value })
                  }
                  placeholder="Ingresa la contraseña"
                  required={!selectedUsuario}
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 8 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword" value="Confirmar Contraseña" />
                <TextInput
                  id="confirmPassword"
                  type="password"
                  value={usuarioForm.confirmPassword}
                  onChange={(e) =>
                    setUsuarioForm({
                      ...usuarioForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirma la contraseña"
                  required={!!usuarioForm.password}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" color="purple" className="flex-1">
                  {selectedUsuario ? "Actualizar" : "Crear"} Usuario
                </Button>
                <Button color="gray" onClick={closeModal} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default GestionUsuarios;
