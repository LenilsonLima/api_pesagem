const express = require('express');
const routes = express.Router();

const apicultorController =  require("../controllers/apicultor-controllers.js");
const login = require('../middleware/login.js');

routes.get('/', login.obrigatorioLogin, apicultorController.readOneApicultor);
routes.post('/', apicultorController.createApicultor);
routes.post('/token_senha', apicultorController.createTokenAlterarSenha);
routes.get('/token_senha', apicultorController.readOneTokenAlterarSenha);
routes.put('/senha', apicultorController.updateSenha);
routes.post('/login', apicultorController.loginApicultor);
routes.put('/', login.obrigatorioLogin, apicultorController.updateApicultor);
routes.delete('/', login.obrigatorioLogin, apicultorController.deleteApicultor);

module.exports = routes;