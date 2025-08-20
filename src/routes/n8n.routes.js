const express = require('express');
const routes = express.Router();

const n8nControllersController = require("../controllers/n8n-controllers");

routes.post('/', n8nControllersController.createN8n);

module.exports = routes;