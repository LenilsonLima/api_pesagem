const express = require('express');
const routes = express.Router();

const pesoCaixaController = require("../controllers/peso-caixa-controllers.js");
const login = require('../middleware/login.js');

routes.get('/', login.obrigatorioLogin, pesoCaixaController.readPesoCaixas);
routes.get('/pesos', login.obrigatorioLogin, pesoCaixaController.pesos);
routes.post('/', pesoCaixaController.createPesoCaixa);
routes.post('/analise-ia', login.obrigatorioLogin, pesoCaixaController.getAnaliseOpenAi);

module.exports = routes;