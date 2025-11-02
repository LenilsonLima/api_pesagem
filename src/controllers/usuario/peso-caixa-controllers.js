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
            peso: Number(item.peso).toFixed(3),
            limite_peso: Number(item.limite_peso).toFixed(3),
        }));

        // Datasets
        const pesos = registrosConvertidos.map(r => r.peso);
        console.log(pesos);

        const limitePeso = registrosConvertidos[0]?.limite_peso || 0;
        const pesoAtaul = pesos[pesos.length - 1];

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
            peso_atual: pesoAtaul,
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
            [Number(peso_atual) / 1000, caixa_id]);

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

        const limiar_crescimento = 0.05;
        const limiar_queda = -0.05;

        const texto = `
            Você é um analista técnico especializado em apicultura e controle de peso de colmeias. 
            Analise os seguintes registros de peso (em kg) e gere um relatório técnico objetivo e preciso para o apicultor.

            Os dados estão em um array no formato: [0.1, 0.15, 0.5]. 
            Cada valor representa o peso total da colmeia em diferentes períodos de medição.

            Parâmetros de análise:
            - limiar_crescimento: ${limiar_crescimento}
            - limiar_queda: ${limiar_queda}

            Tarefas:
            1. Calcule a variação média entre medições consecutivas e determine a tendência geral do período:
            - "crescimento" → aumento consistente acima do limiar_crescimento
            - "queda" → redução consistente abaixo do limiar_queda
            - "estabilidade" → oscilações pequenas entre os limiares

            2. Gere observações e ajustes que o apicultor deve considerar (mínimo 3 recomendações).
            As observações devem:
            - Ter base em variações anormais (picos ou quedas bruscas);
            - Explicar o possível motivo da anomalia (florada, temperatura, chuva, falha de sensor, enxameação, etc.);
            - Ter linguagem técnica, mas de fácil compreensão prática.

            Regras importantes:
            Retorne SOMENTE um JSON válido, sem blocos de código, sem crases, sem texto extra. 
            O JSON deve ter o formato:

            {
                "tendencia": "crescimento | estabilidade | queda",
                "ajustes": [
                    {
                    "texto": "descrição detalhada",
                    "nivel": "critico | leve"
                    }
                ]
            }


            Dados para análise: ${JSON.stringify(dados)}
        `;


        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                // gpt-4o-mini aproximadamente 0.13 centavos a cada 100 análises
                // gpt-4o 25x mais caro, aproximadamente 3.50 a cada 100 análises (mais preciso)
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
            tokens: response.data.usage
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

exports.getAnaliseLocal = async (req, res, next) => {
    try {
        const dados = req.body;

        if (!dados || !Array.isArray(dados) || dados.length < 2) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Erro ao gerar análise, é necessário pelo menos 2 registros de peso.",
                },
                registros: [],
            });
        }

        // ----------------------------------------------
        // 🔹 1. Cálculos base
        // ----------------------------------------------

        const n = dados.length;
        const variacoes = [];
        for (let i = 1; i < n; i++) {
            const variacao = dados[i] - dados[i - 1];
            variacoes.push(variacao);
        }

        const soma = variacoes.reduce((a, b) => a + b, 0);
        const mediaVar = soma / variacoes.length;

        const varMin = Math.min(...variacoes);
        const varMax = Math.max(...variacoes);

        // Cálculo de desvio padrão das variações
        const mediaAbs = mediaVar;
        const desvioPadrao = Math.sqrt(
            variacoes.map(v => Math.pow(v - mediaAbs, 2)).reduce((a, b) => a + b, 0) / variacoes.length
        );

        // ----------------------------------------------
        // 🔹 2. Definição de limiares (ajustáveis)
        // ----------------------------------------------
        const LIMIAR_CRESCIMENTO = 0.05;  // kg
        const LIMIAR_QUEDA = -0.05;       // kg
        const LIMIAR_VARIACAO_ANORMAL = desvioPadrao * 2; // variação 2x maior que o desvio padrão

        // ----------------------------------------------
        // 🔹 3. Determinar tendência geral
        // ----------------------------------------------
        let tendencia;
        if (mediaVar > LIMIAR_CRESCIMENTO) tendencia = "crescimento";
        else if (mediaVar < LIMIAR_QUEDA) tendencia = "queda";
        else tendencia = "estabilidade";

        // ----------------------------------------------
        // 🔹 4. Geração das observações
        // ----------------------------------------------

        const ajustes = [];

        // Ajuste 1: crescimento forte
        if (mediaVar > LIMIAR_CRESCIMENTO * 2) {
            ajustes.push({
                texto: `A colmeia apresenta um crescimento acentuado, com média de variação de ${mediaVar.toFixed(3)} kg por período. Esse comportamento indica forte entrada de néctar ou aumento da população de abelhas campeiras. Verifique as condições de florada e espaço interno para evitar enxameação por excesso de alimento.`,
                nivel: "leve"
            });
        }

        // Ajuste 2: queda forte
        if (mediaVar < LIMIAR_QUEDA * 2) {
            ajustes.push({
                texto: `Foi observada uma redução significativa de peso, com média de ${mediaVar.toFixed(3)} kg por período. Essa queda pode estar relacionada a escassez de flores, alta umidade interna ou consumo acelerado do mel estocado. É importante verificar a ventilação da colmeia, presença de pragas e a necessidade de suplementação alimentar.`,
                nivel: "critico"
            });
        }

        // Ajuste 3: variação anormal isolada (pico positivo)
        if (varMax > LIMIAR_VARIACAO_ANORMAL) {
            ajustes.push({
                texto: `Detectou-se uma variação positiva atípica de ${varMax.toFixed(3)} kg em um único registro. Esse ganho abrupto pode indicar uma intensa atividade de coleta em um dia de florada abundante, ou erro de medição. Caso o comportamento não se repita nos próximos registros, considere recalibrar a balança ou revisar o sensor.`,
                nivel: "leve"
            });
        }

        // Ajuste 4: variação anormal isolada (pico negativo)
        if (Math.abs(varMin) > LIMIAR_VARIACAO_ANORMAL) {
            ajustes.push({
                texto: `Foi identificada uma perda de peso de ${varMin.toFixed(3)} kg em um intervalo curto, considerada fora do padrão normal (desvio padrão: ${desvioPadrao.toFixed(3)} kg). Essa queda pode ser causada por retirada de mel, chuva intensa que alterou a medição ou aumento do consumo interno. Caso continue, recomenda-se inspeção imediata da colmeia.`,
                nivel: "critico"
            });
        }

        // Ajuste 5: estabilidade prolongada
        if (tendencia === "estabilidade" && desvioPadrao < 0.02) {
            ajustes.push({
                texto: `A variação de peso permaneceu praticamente estável (desvio padrão de ${desvioPadrao.toFixed(3)} kg), indicando ausência de grandes eventos de coleta ou consumo. Essa condição é comum em períodos de entressafra ou baixa atividade forrageira. Avalie a oferta de florada e a saúde da colônia.`,
                nivel: "leve"
            });
        }

        // Ajuste 6: observação geral da tendência
        ajustes.push({
            texto: `A tendência geral do período é de ${tendencia}, com média de variação de ${mediaVar.toFixed(3)} kg e desvio padrão de ${desvioPadrao.toFixed(3)} kg. Esse comportamento reflete o equilíbrio entre coleta de néctar e consumo interno. Monitorar continuamente essas métricas auxilia na previsão da produção e saúde da colmeia.`,
            nivel: tendencia === "queda" ? "critico" : "leve"
        });

        // Garante pelo menos 3 observações
        while (ajustes.length < 3) {
            ajustes.push({
                texto: `Não foram identificadas anomalias significativas além das já listadas. Acompanhe a variação de peso nos próximos dias para confirmar a estabilidade das medições e detectar possíveis alterações de comportamento da colônia.`,
                nivel: "leve"
            });
        }

        // ----------------------------------------------
        // 🔹 5. Envio da resposta
        // ----------------------------------------------

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: "Análise de pesos gerada com sucesso (modo local).",
            },
            registros: {
                tendencia,
                ajustes
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao gerar análise de pesos (modo local).",
                erro: error.message,
            },
            registros: [],
        });
    }
};