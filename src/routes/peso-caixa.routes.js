const express = require('express');
const routes = express.Router();

const pesoCaixaController = require("../controllers/peso-caixa-controllers.js");
const login = require('../middleware/login.js');

routes.get('/', login.obrigatorioLogin, pesoCaixaController.readPesoCaixas);
routes.post('/', pesoCaixaController.createPesoCaixa);

module.exports = routes;