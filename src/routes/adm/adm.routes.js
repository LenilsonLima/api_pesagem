const express = require('express');
const routes = express.Router();

const admController = require("../../controllers/adm/adm-controllers.js");
const loginAdm = require('../../middleware/loginAdm.js');

routes.get('/one', loginAdm.obrigatorioLoginAdm, admController.readAdmOneUsuario);
routes.get('/', loginAdm.obrigatorioLoginAdm, admController.readAdmUsuarios);
routes.post('/login', admController.loginAdmUsuario);
routes.delete('/', loginAdm.obrigatorioLoginAdm, admController.deleteAdmUsuario);

module.exports = routes;