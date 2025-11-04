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

        const limitePeso = registrosConvertidos[0]?.limite_peso || 0;
        const pesoAtaul = pesos[pesos.length - 1] || 0;

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
            `SELECT
                    peso_caixa.caixa_id as caixa_id,
                    caixas.usuario_id as usuario_id,
                    caixas.observacao as observacao,
                    peso_caixa.peso_atual as peso_atual, 
                    peso_caixa.tipo_peso as tipo_peso,
                    TO_CHAR(peso_caixa.criado_em, 'YYYY-MM-DD') as criado_em 
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
        let { peso_atual, identificador_balanca, tipo_peso } = req.body;
        tipo_peso = tipo_peso || 0;

        if (!identificador_balanca || peso_atual == null) {
            return res.status(400).send({
                retorno: {
                    status: 400,
                    mensagem: "Campos obrigatórios ausentes: peso_atual ou identificador_balanca."
                },
                registros: []
            });
        }

        let responseConsultcaixa;
        try {
            const requestOptions = {
                headers: { 'Content-Type': 'application/json' },
                params: { identificador_balanca }
            };
            responseConsultcaixa = await axios.get(
                "https://api-pesagem-chi.vercel.app/caixa/read_one_identificador_balanca",
                requestOptions
            );
        } catch (error) {
            console.error("Erro ao consultar caixa:", error.response?.data || error.message);
            return res.status(500).send({
                retorno: {
                    status: 500,
                    mensagem: error?.response?.data?.retorno?.mensagem || "Erro ao consultar caixa."
                },
                registros: []
            });
        }

        const caixa = responseConsultcaixa?.data?.registros?.[0];
        if (!caixa?.id) {
            return res.status(404).send({
                retorno: { status: 404, mensagem: "Caixa não encontrada para o identificador informado." },
                registros: []
            });
        }

        const result = await executeQuery(
            `INSERT INTO peso_caixa (peso_atual, criado_em, caixa_id, tipo_peso)
             VALUES ($1, NOW(), $2, $3)
             RETURNING id, peso_atual, criado_em, caixa_id, tipo_peso;`,
            [Number(peso_atual) / 1000, caixa.id, tipo_peso]
        );

        return res.status(201).send({
            retorno: { status: 201, mensagem: "Seu registro foi cadastrado com sucesso." },
            registros: result
        });

    } catch (error) {
        console.error("Erro ao cadastrar registro:", error);
        return res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao cadastrar registro, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.getAnaliseOpenAi = async (req, res, next) => {
    try {
        const { usuario_id } = req.dados;
        const { caixa_id, data_inicial, data_final } = req.query;

        const responsePesoCaixa = await executeQuery(
            `SELECT
                    peso_caixa.peso_atual as peso_atual, 
                    peso_caixa.tipo_peso as tipo_peso, 
                    TO_CHAR(peso_caixa.criado_em, 'YYYY-MM-DD') as criado_em 
             FROM peso_caixa 
             LEFT JOIN caixas ON peso_caixa.caixa_id = caixas.id
             WHERE caixas.usuario_id = $1 
             AND caixas.id = $2
             AND peso_caixa.criado_em >= $3
             AND peso_caixa.criado_em <= $4
             ORDER BY peso_caixa.id asc`,
            [usuario_id, caixa_id, `${data_inicial} 00:00:00`, `${data_final} 23:59:59`]
        );

        if (!responsePesoCaixa || responsePesoCaixa.length < 1) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Erro ao gerar analise, nenhuma informação foi localizada.",
                },
                registros: [],
            });
        }

        const texto = `
Você é um analista técnico especializado em apicultura e controle de peso de colmeias. 
Analise os registros de peso (em kg) e gere um relatório técnico objetivo e preciso para o apicultor.

Os dados estão em um array no formato: 
[{ peso_atual: "25.000", criado_em: "2025-11-03", tipo_peso: 0 }]
Onde:
  - tipo_peso: 0 = medição comum
  - tipo_peso: 1 = coleta de mel realizada
  - peso_atual: peso total da colmeia em quilogramas (kg). Valores após o ponto representam gramas.
  - quando tipo_peso = 1, o peso_atual representa **quanto foi coletado (kg)** na data informada.

Regras de interpretação:
  - Só considere coleta de mel se tipo_peso = 1.
  - Pode haver **mais de uma coleta (tipo_peso = 1)** no mesmo dia ou período — todas devem ser consideradas.
  - Quedas de peso após uma coleta (ou entre coletas consecutivas) **são esperadas e não devem ser tratadas como anomalia**.
  - Uma sequência de medições muito baixas após coletas indica apenas o efeito acumulado das retiradas, e não falha.
  - Apenas quedas significativas **sem coletas associadas** devem ser interpretadas como possíveis falhas de sensor ou problemas biológicos.
  - Registros com peso zero ou próximo de zero por longos períodos podem indicar falha de medição.

Parâmetros:
  - limiar_crescimento = 0.030
  - limiar_queda = -0.030

Tarefas:
  1. Calcule a variação média entre medições consecutivas e determine a tendência geral do período:
      - "crescimento": aumento consistente acima do limiar_crescimento;
      - "queda": redução consistente abaixo do limiar_queda;
      - "estabilidade": oscilações pequenas entre os limiares.
      - Desconsidere quedas logo após coletas (tipo_peso = 1) ou entre coletas consecutivas, pois são esperadas.

  2. Gere observações e recomendações (mínimo 3):
      - Considere múltiplas coletas e o impacto acumulado delas.
      - Foque em anomalias que não estejam relacionadas às coletas.
      - Explique os possíveis motivos técnicos ou biológicos (florada, clima, falha de sensor, enxameação, etc.).
      - Use linguagem técnica e clara, prática para o apicultor.

Formato de saída:
  - Retorne apenas um JSON válido, sem blocos de código, crases ou texto extra.
  - Estrutura:
    {
      "tendencia": "crescimento | estabilidade | queda",
      "ajustes": [
        {
          "texto": "descrição detalhada",
          "nivel": "critico | leve"
        }
      ]
    }

Dados para análise: ${JSON.stringify(responsePesoCaixa)}
`;

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                // gpt-4o-mini aproximadamente 13 centavos a cada 100 análises
                // gpt-4o 25x mais caro, aproximadamente 3.50 reais a cada 100 análises (mais preciso)
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