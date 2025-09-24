import { useState, useEffect } from "react";
import Form from "./Form";
import axios from "axios";
import Swal from "sweetalert2";
import useForm from "../hooks/useForm";

const FormAgendar = ({ id, onCloseModal, refreshData, getUserId }) => {
  const initialValues = {
    hora: "",
    nombreCliente: "",
    numeroCliente: "",
    emailCliente: "",
    estado: "reservado",
  };

  const { values: agenda, setValues } = useForm(initialValues);
  const [error, setError] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [finalCost, setFinalCost] = useState(0);

  useEffect(() => {
    if (id) {
      axios
        .get(`http://localhost:8000/api/agenda/${id}`)
        .then((res) => {
          if (res.data && res.data.agenda) {
            const { servicios, costoTotal, ...agendaData } = res.data.agenda;
            setValues({
              ...agendaData,
              hora: agendaData.hora || "",
              nombreCliente: agendaData.nombreCliente || "",
              numeroCliente: agendaData.numeroCliente || "",
              emailCliente: agendaData.emailCliente || "",
              estado: agendaData.estado || "reservado",
            });
            setSelectedServices(servicios || []); // Carga los servicios seleccionados
            setFinalCost(costoTotal || 0); // Carga el costo final
          } else {
            setValues(initialValues);
            setSelectedServices([]);
            setFinalCost(0);
          }
        })
        .catch((err) => {
          setError("Ocurrió un error al cargar los datos");
        });
    }
  }, [id, setValues]);

  const handleSubmit = async (values) => {
    if (values.nombreCliente === "") {
      Swal.fire({
        title: "¿Estás seguro?",
        text: "Te estaremos esperando!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        cancelButtonText: "Cancelar!",
        confirmButtonText: "Sí, eliminar!",
      }).then((result) => {
        if (result.isConfirmed) {
          axios
            .post(`http://localhost:8000/api/agenda/delete-and-create/${id}`) // Llamar a la nueva ruta
            .then((res) => {
              Swal.fire(
                "Cancelado!",
                "Reserva cancelada, nueva agenda creada",
                "success"
              );
              refreshData(); // Actualizamos los datos
              onCloseModal(); // Cerramos el modal al enviar correctamente
            })
            .catch((err) => {
              setError(
                err.response?.data?.error?.message || "Ocurrió un error"
              );
            });
        }
      });
    } else {
      // Añadir el UserId a los valores antes de enviar
      const dataToSend = {
        ...values,
        nombreCliente: getUserId(), // Usar el ID del usuario como identificador
      };

      axios
        .put(`http://localhost:8000/api/agenda/${id}`, dataToSend)
        .then((res) => {
          setError("");
          Swal.fire({
            icon: "success",
            title: "Excelente",
            text: `¡Tienes una cita a las ${values.hora}!`,
          });
          refreshData(); // Actualizamos los datos
          onCloseModal(); // Cerramos el modal al enviar correctamente
        })
        .catch((err) => {
          setError(err.response?.data?.error?.message || "Ocurrió un error");
        });
    }
  };

  return (
    <div>
      <div className="buyContainer" id="pedido">
        <div className="buyCard">
          <Form
            handleSubmit={handleSubmit}
            error={error}
            agenda={agenda}
            getUserId={getUserId}
            selectedServices={selectedServices}
            finalCost={finalCost}
          />
        </div>
      </div>
    </div>
  );
};

export default FormAgendar;
