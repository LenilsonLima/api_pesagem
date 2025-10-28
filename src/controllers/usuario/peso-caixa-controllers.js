const { default: axios } = require("axios");
const executeQuery = require("../../../pgsql");

exports.pesos = async (req, res, next) => {
    try {
        const { usuario_id } = req.dados;
        const { caixa_id, data_inicial, data_final } = req.query;

        if (!data_inicial || !data_final) {
            return res.status(400).send({
                retorno: {
                    status: 400,
                    mensagem: "Parâmetros 'data_inicial' e 'data_final' são obrigatórios no formato 'YYYY-MM-DD'.",
                },
                registros: null,
            });
        }

        const responsePesoCaixa = await executeQuery(
            `SELECT peso_caixa.id as registro,
                    peso_caixa.peso_atual as peso,
                    caixas.limite_peso as limite_peso,
                    to_char(peso_caixa.criado_em, 'DD/MM') as data
             FROM peso_caixa 
             LEFT JOIN caixas ON peso_caixa.caixa_id = caixas.id
             WHERE caixas.usuario_id = $1
               AND caixas.id = $2
               AND peso_caixa.criado_em BETWEEN $3 AND $4
             ORDER BY peso_caixa.criado_em ASC`,
            [usuario_id, caixa_id, `${data_inicial} 00:00:00`, `${data_final} 23:59:59`]
        );

        if (responsePesoCaixa.length === 0) {
            return res.status(404).send({
                retorno: { status: 404, mensagem: "Nenhuma informação foi localizada." },
                registros: null,
            });
        }

        const registrosConvertidos = responsePesoCaixa.map(item => ({
            data: item.data,
            peso: Number(item.peso) / 1000,
            limite_peso: Number(item.limite_peso) / 1000,
        }));

        // Datasets
        const pesos = registrosConvertidos.map(r => r.peso);
        const limitePeso = registrosConvertidos[0]?.limite_peso || 0;

        // Labels em 4 pontos
        const total = registrosConvertidos.length;
        const quartis = [
            0,
            Math.floor(total / 4),
            Math.floor(total / 2),
            total - 1
        ];
        const labels = quartis.map(i => (i + 1).toString());

        const registros = {
            limite_peso: limitePeso,
            labels,
            datasets: [
                { data: pesos },
            ],
            legend: ['Peso registrado', `Limite ${limitePeso}kg`],
        };

        res.status(200).send({
            retorno: { status: 200, mensagem: "Dados localizados com sucesso." },
            registros,
        });

    } catch (error) {
        console.error("Erro ao buscar peso:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao buscar peso, tente novamente.",
                erro: error.message,
            },
            registros: null,
        });
    }
};

exports.readPesoCaixas = async (req, res, next) => {
    try {
        const { usuario_id } = req.dados;
        const { caixa_id, data_inicial, data_final } = req.query;

        const responsePesoCaixa = await executeQuery(
            `SELECT peso_caixa.id as id, 
                    peso_caixa.peso_atual as peso_atual, 
                    peso_caixa.criado_em as criado_em, 
                    peso_caixa.caixa_id as caixa_id,
                    caixas.usuario_id as usuario_id,
                    caixas.observacao as observacao 
             FROM peso_caixa 
             LEFT JOIN caixas ON peso_caixa.caixa_id = caixas.id
             WHERE caixas.usuario_id = $1 
             AND caixas.id = $2
             AND peso_caixa.criado_em >= $3
             AND peso_caixa.criado_em <= $4
             ORDER BY peso_caixa.id asc`,
            [usuario_id, caixa_id, `${data_inicial} 00:00:00`, `${data_final} 23:59:59`]
        );

        if (responsePesoCaixa.length === 0) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Nenhuma informação foi localizada.",
                },
                registros: []
            });
        }

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: "Dados localizados com sucesso.",
            },
            registros: responsePesoCaixa
        });

    } catch (error) {
        console.error("Erro ao buscar peso:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao buscar peso, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

exports.createPesoCaixa = async (req, res, next) => {
    try {
        let { peso_atual, identificador_balanca } = req.body;

        if (!identificador_balanca) {
            return res.status(400).send({
                retorno: {
                    status: 400,
                    mensagem: "Campos obrigatórios ausentes. Verifique os dados e tente novamente.",
                },
                registros: []
            });
        }

        let responseConsultcaixa = [];

        try {
            const requestOptions = {
                headers: {
                    'Content-Type': 'application/json'
                },
                params: {
                    identificador_balanca: identificador_balanca
                }
            }
            responseConsultcaixa = await axios.get(`https://api-pesagem-chi.vercel.app/caixa/read_one_identificador_balanca`, requestOptions);
        } catch (error) {
            res.status(500).send({
                retorno: {
                    status: 500,
                    mensagem: error.response.data.retorno.mensagem,
                },
                registros: []
            });
        }

        const caixa_id = responseConsultcaixa.data.registros[0].id;

        const result = await executeQuery(
            `INSERT INTO peso_caixa (peso_atual, criado_em, caixa_id)
            VALUES ($1, NOW(), $2)
            RETURNING id, peso_atual, criado_em, caixa_id;`,
            [peso_atual, caixa_id]);

        res.status(201).send({
            retorno: {
                status: 201,
                mensagem: "Seu peso foi cadastrado com sucesso.",
            },
            registros: result
        });

    } catch (error) {
        console.error("Erro ao cadastrar peso:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao cadastrar peso, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.getAnaliseOpenAi = async (req, res, next) => {
    try {
        const dados = req.body;

        if (!dados || dados.length < 1) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Erro ao gerar analise, nenhuma informação foi localizada.",
                },
                registros: [],
            });
        }

        const texto = `
            Analise os seguintes registros de pesos de uma colmeia e gere um relatório técnico para o apicultor.
            Os dados estão em um array no seguinte formato [ 0.1, 0.15, 0.5], cada registro é o peso em kg.

            Sua tarefa:
            1. Determinar a tendência geral do período (crescimento, estabilidade ou queda).
            2. Gerar observações e possíveis ajustes que o apicultor deve considerar (ao menos 3 registros).

            Regras importantes:
            - Retorne SOMENTE um JSON válido.
            - Não escreva explicações, apenas o JSON.
            - O JSON deve seguir exatamente este formato:

            {
                "tendencia": "crescimento | estabilidade | queda",
                "ajustes": [
                    {
                        "texto": "descrição breve e prática do ajuste sugerido (ao menos 150 caracteres). Identificando variações anormais (valores muito acima ou abaixo da média), é muito importante saber o porque voce fez essa observação",
                        "nivel": "critico | leve"
                    }
                ]
            }
            Dados a analisar: ${JSON.stringify(dados)}
        `;

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: texto }],
                temperature: 0.7,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: "Análise de pesos gerada com sucesso.",
            },
            registros: JSON.parse(response.data.choices[0].message.content),
            // tokens: response.data.usage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao gerar análise de pesos, tente novamente.",
                erro: error.message,
            },
            registros: [],
        });
    }
};