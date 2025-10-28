const express = require('express');
const routes = express.Router();

const caixaController = require("../../controllers/usuario/caixa-controllers.js");
const loginUsuario = require('../../middleware/loginUsuario.js');

routes.get('/filtro', loginUsuario.obrigatorioLoginUsuario, caixaController.readCaixas);
routes.get('/read_one_id', loginUsuario.obrigatorioLoginUsuario, caixaController.readOneCaixaId);
routes.get('/read_one_identificador_balanca', caixaController.readOneCaixaIdentificadorBalanca);
routes.post('/', loginUsuario.obrigatorioLoginUsuario, caixaController.createCaixa);
routes.put('/', loginUsuario.obrigatorioLoginUsuario, caixaController.updateCaixa);
routes.delete('/', loginUsuario.obrigatorioLoginUsuario, caixaController.deleteCaixa);

module.exports = routes;