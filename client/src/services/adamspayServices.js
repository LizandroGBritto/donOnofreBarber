import axios from 'axios';

export const createDebt = async (idDeuda, amount, label) => {
  try {
    const response = await axios.post('http://localhost:8000/api/adamspay/create-debt', {
      idDeuda,
      amount,
      label
    });
    return response.data;
  } catch (e) {
    return { success: false, error: e };
  }
};

export const deleteDebt = async (idDeuda) => {
  try {
    const response = await axios.delete(`http://localhost:8000/api/adamspay/delete-debt/${idDeuda}`);
    return response.data;
  } catch (e) {
    return { success: false, error: e };
  }
};

export const getDebt = async (idDeuda) => {
  try {
    const response = await axios.get(`http://localhost:8000/api/adamspay/get-debt/${idDeuda}`);
    return response.data;
  } catch (e) {
    return { success: false, error: e };
  }
};