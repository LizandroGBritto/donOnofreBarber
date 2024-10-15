import { useState, useEffect } from 'react';
import Form from './Form';
import axios from 'axios';
import Swal from 'sweetalert2';
import useForm from '../hooks/useForm';
import { createDebt, deleteDebt, getDebt } from '../services/adamspayServices';

const FormAgendar = ({ id, onCloseModal, refreshData, getUserId }) => {
  const initialValues = {
    Hora: '',
    NombreCliente: '',
    NumeroCliente: '',
    UserId: '',
    Estado: 'Sin Pagar'
  };

  const { values: agenda, setValues } = useForm(initialValues);
  const [error, setError] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [finalCost, setFinalCost] = useState(0);
  const [debtStatus, setDebtStatus] = useState(null); // Estado de la deuda
  const [debtPayUrl, setDebtPayUrl] = useState(''); // URL de pago de la deuda

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:8000/api/agenda/${id}`)
        .then(res => {
          if (res.data && res.data.agenda) {
            const { Servicios, Costo, ...agendaData } = res.data.agenda;
            setValues({
              ...agendaData,
              Hora: agendaData.Hora || '',
              NombreCliente: agendaData.NombreCliente || '',
              NumeroCliente: agendaData.NumeroCliente || '',
              UserId: agendaData.UserId || '',
              Estado: agendaData.Estado || "Sin Pagar"
            });
            setSelectedServices(Servicios || []); // Carga los servicios seleccionados
            setFinalCost(Costo || 0); // Carga el costo final
          } else {
            setValues(initialValues);
            setSelectedServices([]);
            setFinalCost(0);
          }
        })
        .catch(err => {
          setError('Ocurrió un error al cargar los datos');
        });

      // Obtener el estado de la deuda
      getDebt(id)
        .then(res => {
          if (res.success) {
            setDebtStatus(res.debt.payStatus.status);
            setDebtPayUrl(res.debt.payUrl); // Guardar la URL de pago
          } else {
            setDebtStatus(null);
            setDebtPayUrl('');
          }
        })
        .catch(err => {
          setDebtStatus(null);
          setDebtPayUrl('');
        });
    }
  }, [id, setValues]);

  const handleSubmit = async (values) => {
    if (values.NombreCliente === '') {
      Swal.fire({
        title: '¿Estás seguro?',
        text: "Te estaremos esperando!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        cancelButtonText: 'Cancelar!',
        confirmButtonText: 'Sí, eliminar!',
      }).then((result) => {
        if (result.isConfirmed) {
          axios
            .post(`http://localhost:8000/api/agenda/delete-and-create/${id}`) // Llamar a la nueva ruta
            .then(async (res) => {
              const debtResponse = await deleteDebt(id); // Eliminar la deuda
              if (debtResponse.success) {
                Swal.fire('Cancelado!', 'Reserva y deuda canceladas, nueva agenda creada', 'success');
                refreshData(); // Actualizamos los datos
                onCloseModal(); // Cerramos el modal al enviar correctamente
              } else {
                Swal.fire('Cancelado!', 'Reserva y deuda canceladas, nueva agenda creada', 'success');
                refreshData(); // Actualizamos los datos
                onCloseModal(); // Cerramos el modal al enviar correctamente
              }
            })
            .catch((err) => {
              setError(err.response?.data?.error?.message || 'Ocurrió un error');
            });
        }
      });
    } else {
      axios
        .put(`http://localhost:8000/api/agenda/${id}`, values)
        .then(async (res) => {
          setError('');
          if (!debtStatus) { // Solo crear deuda si no existe
            const debtResponse = await createDebt(id, values.Costo, "Servicios de Barberia - " + values.NombreCliente);
            console.log(debtResponse);
            if (debtResponse.success) {
              setDebtPayUrl(debtResponse.payUrl); // Guardar la URL de pago

              Swal.fire({
                icon: 'success',
                title: 'Excelente',
                text: `¡Tienes una cita a las ${values.Hora}!`,
                footer: `<a style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: black; border-radius: 8px; text-decoration: none; font-size: 1.125rem; font-weight: bold;" href="${debtResponse.payUrl}" target="_blank">Pagar ahora</a>`
              });
            } else {
              values.Estado = "Sin Pagar"; // Actualizar el estado a "Sin Pagar"
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Error al crear la deuda: ${debtResponse.error}`
              });
            }
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Excelente',
              text: `¡Tienes una cita a las ${values.Hora}!`,
              footer: debtPayUrl ? `<a style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: black; border-radius: 8px; text-decoration: none; font-size: 1.125rem; font-weight: bold;" href="${debtPayUrl}" target="_blank">Pagar ahora</a>` : ''
            });
          }
          axios
            .put(`http://localhost:8000/api/agenda/${id}`, values) // Actualizar el estado en la base de datos
            .then(() => {
              refreshData(); // Actualizamos los datos
              onCloseModal(); // Cerramos el modal al enviar correctamente
            })
            .catch((err) => {
              setError(err.response?.data?.error?.message || 'Ocurrió un error');
            });
        })
        .catch((err) => {
          setError(err.response?.data?.error?.message || 'Ocurrió un error');
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
            debtStatus={debtStatus} 
            debtPayUrl={debtPayUrl} // Pasar la URL de pago al formulario
          />
        </div>
      </div>
    </div>
  );
};

export default FormAgendar;