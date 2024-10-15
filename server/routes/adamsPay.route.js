const express = require('express');
const router = express.Router();
const { createDebt, deleteDebt, getDebt, handleWebhook } = require('../controllers/adamspayController');

router.post('/create-debt', createDebt);
router.delete('/delete-debt/:idDeuda', deleteDebt);
router.get('/get-debt/:idDeuda', getDebt);
router.post('/webhook', handleWebhook); // Añadir la ruta del webhook

module.exports = router;