const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
const Agenda = require('../models/agenda.model'); 

const apiKey = process.env.ADAM_API_KEY;
const apiSecret = process.env.ADAM_API_SECRET;
const host = process.env.ADAM_API_URL;
const path = '/debts';

module.exports = {
  createDebt: async (req, res) => {
    const { idDeuda, amount, label } = req.body;
    const siExiste = 'update';

    // Hora DEBE ser en UTC!
    const inicio_validez = moment.utc();
    const fin_validez = inicio_validez.clone().add(2, 'days');

    // Crear modelo de la deuda
    const deuda = {
      docId: idDeuda,
      amount: { currency: 'PYG', value: amount },
      label: label,
      validPeriod: {
        start: inicio_validez.format('YYYY-MM-DDTHH:mm:ss'),
        end: fin_validez.format('YYYY-MM-DDTHH:mm:ss')
      }
    };

    // El post debe llevar la deuda en la propiedad "debt"
    const post = { debt: deuda };

    const headers = {
      apikey: apiKey,
      'Content-Type': 'application/json',
      'x-if-exists': siExiste
    };

    try {
      const response = await axios.post(`${host}${path}`, post, { headers });
      const data = response.data;
      if (data.debt) {
        res.json({ success: true, payUrl: data.debt.payUrl });
      } else {
        res.status(400).json({ success: false, error: data.meta || 'Unknown error' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
    }
  },

  deleteDebt: async (req, res) => {
    const { idDeuda } = req.params;
    const notificarAlWebhook = 'true';

    const headers = {
      apikey: apiKey,
      'x-should-notify': notificarAlWebhook
    };

    try {
      const response = await axios.delete(`${host}${path}/${idDeuda}`, { headers });
      const data = response.data;
      if (data.debt) {
        res.json({ success: true, debt: data.debt });
      } else {
        res.status(400).json({ success: false, error: data.meta || 'Unknown error' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
    }
  },

  getDebt: async (req, res) => {
    const { idDeuda } = req.params;

    const headers = {
      apikey: apiKey
    };

    try {
      const response = await axios.get(`${host}${path}/${idDeuda}`, { headers });
      const data = response.data;
      if (data.debt) {
        res.json({ success: true, debt: data.debt });
      } else {
        res.status(400).json({ success: false, error: data.meta || 'Unknown error' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
    }
  },

  handleWebhook: async (req, res) => {
    const secret = process.env.ADAM_API_SECRET; // Obtener del UI de administración y almacenar en .env
    const post = JSON.stringify(req.body);
    const hmacEsperado = crypto.createHash('md5').update('adams' + post + secret).digest('hex');
    const hmacRecibido = req.headers['x-adams-notify-hash'];

    // Validar la notificación
    if (hmacEsperado !== hmacRecibido) {
      return res.status(400).send('Validación ha fallado');
    }

    const { notify, debt } = req.body;

    // Verificar el tipo de notificación
    if (notify.type === 'debtStatus') {
      const { docId, payStatus } = debt;

      try {
        // Actualizar el estado de la deuda en la base de datos
        const estado = payStatus.status === 'paid' ? 'Pagado' : 'Sin Pagar';
        await Agenda.findByIdAndUpdate(docId, { Estado: estado });

        return res.status(200).send('Notificación procesada');
      } catch (err) {
        console.error('Error al actualizar el estado de la deuda:', err);
        return res.status(500).send('Error al procesar la notificación');
      }
    }

    // Ignorar otros tipos de notificaciones
    return res.status(200).send('Evento no reconocido');
  }
};