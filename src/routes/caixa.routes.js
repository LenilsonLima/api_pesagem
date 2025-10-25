const express = require('express');
const routes = express.Router();

const caixaController =  require("../controllers/caixa-controllers.js");
const login = require('../middleware/login.js');

routes.get('/filtro', login.obrigatorioLogin, caixaController.readCaixas);
routes.get('/read_one_id', login.obrigatorioLogin, caixaController.readOneCaixaId);
routes.get('/read_one_identificador_balanca', caixaController.readOneCaixaIdentificadorBalanca);
routes.post('/', login.obrigatorioLogin, caixaController.createCaixa);
routes.put('/', login.obrigatorioLogin, caixaController.updateCaixa);
routes.delete('/', login.obrigatorioLogin, caixaController.deleteCaixa);

module.exports = routes;