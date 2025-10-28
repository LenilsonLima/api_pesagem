const express = require('express');
const routes = express.Router();

const usuarioController = require("../controllers/usuario-controllers.js");
const login = require('../middleware/login.js');

routes.get('/', login.obrigatorioLogin, usuarioController.readOneUsuario);
routes.post('/', usuarioController.createUsuario);
routes.post('/token_senha', usuarioController.createTokenAlterarSenha);
routes.get('/token_senha', usuarioController.readOneTokenAlterarSenha);
routes.put('/senha', usuarioController.updateSenha);
routes.post('/login', usuarioController.loginUsuario);
routes.put('/', login.obrigatorioLogin, usuarioController.updateUsuario);
routes.delete('/', login.obrigatorioLogin, usuarioController.deleteUsuario);

module.exports = routes;