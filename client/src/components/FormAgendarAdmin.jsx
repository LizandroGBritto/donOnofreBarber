import { useState, useEffect } from 'react';
import Form from './Form';
import axios from 'axios';
import Swal from 'sweetalert2';
import useForm from '../hooks/useForm';

const FormAgendarAdmin = ({ id, onCloseModal, refreshData, getUserId }) => {
  const initialValues = {
    Hora: '',
    NombreCliente: '',
    NumeroCliente: '',
    UserId: '',
    Servicios: '',
    Estado: false
  };

  const { values: agenda, handleChange, setValues } = useForm(initialValues);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:8000/api/agenda/${id}`)
        .then(res => {
          if (res.data && res.data.agenda) {
            setValues({
              Hora: res.data.agenda.Hora || '',
              NombreCliente: res.data.agenda.NombreCliente || '',
              NumeroCliente: res.data.agenda.NumeroCliente || '',
              UserId: res.data.agenda.UserId || '',
              Servicios: res.data.agenda.Servicios || '',
              Estado: res.data.agenda.Estado || false
            });
          } else {
            setValues(initialValues);
          }
        })
        .catch(err => {
          setError('Ocurrió un error al cargar los datos');
        });

        
    }
  }, [id, setValues]);

  const handleSubmit = (values) => {
    axios
      .put(`http://localhost:8000/api/agenda/${id}`, values)
      .then((res) => {
        setError('');
        Swal.fire({
          icon: 'success',
          title: 'Excelente',
          text: `¡Tienes una cita a las ${values.Hora}!`,
        });
        refreshData();
        onCloseModal();
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Ocurrió un error');
      });
  };

  return (
    <div>
      <div className="buyContainer" id="pedido">
        <div className="buyCard">
          <Form handleSubmit={handleSubmit} error={error} agenda={agenda} handleChange={handleChange} getUserId={getUserId} />
        </div>
      </div>
    </div>
  );
};

export default FormAgendarAdmin;