const express = require('express');
const routes = express.Router();

const pesoCaixaController = require("../../controllers/usuario/peso-caixa-controllers.js");
const loginUsuario = require('../../middleware/loginUsuario.js');

routes.get('/', loginUsuario.obrigatorioLoginUsuario, pesoCaixaController.readPesoCaixas);
routes.get('/pesos', loginUsuario.obrigatorioLoginUsuario, pesoCaixaController.pesos);
routes.post('/', pesoCaixaController.createPesoCaixa);
routes.get('/analise-ia', loginUsuario.obrigatorioLoginUsuario, pesoCaixaController.getAnaliseOpenAi);

module.exports = routes;