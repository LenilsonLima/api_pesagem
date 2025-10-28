const express = require('express');
const routes = express.Router();

const usuarioController = require("../../controllers/usuario/usuario-controllers.js");
const loginUsuario = require('../../middleware/loginUsuario.js');

routes.get('/', loginUsuario.obrigatorioLoginUsuario, usuarioController.readOneUsuario);
routes.post('/', usuarioController.createUsuario);
routes.post('/token_senha', usuarioController.createTokenAlterarSenha);
routes.get('/token_senha', usuarioController.readOneTokenAlterarSenha);
routes.put('/senha', usuarioController.updateSenha);
routes.post('/login', usuarioController.loginUsuario);
routes.put('/', loginUsuario.obrigatorioLoginUsuario, usuarioController.updateUsuario);
routes.put('/block', loginUsuario.obrigatorioLoginUsuario, usuarioController.blockUsuario);

module.exports = routes;