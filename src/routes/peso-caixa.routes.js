const express = require('express');
const routes = express.Router();

const pesoCaixaController = require("../controllers/peso-caixa-controllers.js");
const login = require('../middleware/login.js');

routes.get('/:caixa_id/:data_inicial/:data_final', login.obrigatorioLogin, pesoCaixaController.readPesoCaixas);
routes.get('/', pesoCaixaController.rotaParaTestarResolucaoDeNome);
routes.post('/', pesoCaixaController.createPesoCaixa);

module.exports = routes;