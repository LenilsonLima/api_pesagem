require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const app = express();

// Importando as rotas
const apicultorRoutes = require('./src/routes/apicultor.routes.js');
const caixaRoutes = require('./src/routes/caixa.routes.js');
const pesoCaixaRoutes = require('./src/routes/peso-caixa.routes.js');

// Usando o morgan para logs
app.use(morgan('dev'));

// Usando o body-parser para lidar com o corpo das requisições
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuração do cookie-parser para trabalhar com cookies
// Configuração do CORS (caso necessário) - ajustada para permitir credenciais
app.use((req, res, next) => {
    // Lista de origens permitidas
    const allowedOrigins = ['https://pesabox.vercel.app/#/', 'https://pesabox.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:3000', '*'];

    // Verifica se a origem da requisição está na lista de origens permitidas
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin); // Permite apenas o frontend específico
    }

    res.header("Access-Control-Allow-Credentials", "true"); // Permite cookies e credenciais
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).send({});
    }

    next();
});

// Defina suas rotas e configure o servidor Express
app.use('/apicultor', apicultorRoutes);
app.use('/caixa', caixaRoutes);
app.use('/peso-caixa', pesoCaixaRoutes);

// Middleware para tratamento de URL não encontrada
app.use((req, res, next) => {
    const error = new Error("Url não encontrada, tente novamente");
    error.status = 404;
    next(error);
});

// Middleware para tratamento de erros gerais
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    return res.send({
        retorno: {
            status: error.status || 500,
            mensagem: error.message,
        },
        registros: []
    });
});

module.exports = app;