const executeQuery = require("../../pgsql");

exports.createN8n = async (req, res, next) => {
    try {
        let {
            nomeCompleto,
            razaoSocial,
            cnpj,
            email,
            whatsapp,
            comoOuviuFalar
        } = req.body;

        const response = await executeQuery(
            `INSERT INTO n8n (nomeCompleto, razaoSocial, cnpj, email, whatsapp, comoOuviuFalar, criado_em)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, nomeCompleto, razaoSocial, cnpj, email, whatsapp, comoOuviuFalar;`,
            [nomeCompleto, razaoSocial, cnpj, email, whatsapp, comoOuviuFalar]);

        res.status(201).send({
            retorno: {
                status: 201,
                mensagem: "Seu registro foi cadastrado com sucesso.",
            },
            registros: response
        });

    } catch (error) {
        console.error("Erro ao criar registro:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao criar registro, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};