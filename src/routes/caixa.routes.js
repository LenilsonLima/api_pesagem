const express = require('express');
const routes = express.Router();

const caixaController =  require("../controllers/caixa-controllers.js");
const login = require('../middleware/login.js');

routes.get('/filtro', login.obrigatorioLogin, caixaController.readCaixas);
routes.get('/:caixa_id', login.obrigatorioLogin, caixaController.readOneCaixaId);
routes.get('/identificador-balanca/:identificador_balanca', caixaController.readOneCaixaIdentificadorBalanca);
routes.post('/', login.obrigatorioLogin, caixaController.createCaixa);
routes.put('/:caixa_id', login.obrigatorioLogin, caixaController.updateCaixa);
routes.delete('/:caixa_id', login.obrigatorioLogin, caixaController.deleteCaixa);

module.exports = routes;