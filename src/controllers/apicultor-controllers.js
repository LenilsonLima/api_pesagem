const executeQuery = require("../../pgsql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

exports.readOneApicultor = async (req, res, next) => {
    try {
        const { apicultor_id } = req.dados;

        const responseApicultor = await executeQuery(
            `SELECT id, nome, email, criado_em FROM apicultores where id = $1`,
            [apicultor_id]
        );

        if (responseApicultor.length === 0) {
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
            registros: responseApicultor
        });

    } catch (error) {
        console.error("Erro ao buscar apicultor:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao buscar apicultor, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

exports.createApicultor = async (req, res, next) => {
    try {
        let { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).send({
                retorno: {
                    status: 400,
                    mensagem: "Campos obrigatórios ausentes. Verifique os dados e tente novamente.",
                },
                registros: []
            });
        }

        //verifica se o e-mail já existe
        const emailExistente = await executeQuery(`
            SELECT id, nome, email FROM apicultores WHERE LOWER(email) = $1
        `, [email.toLowerCase()]);

        if (emailExistente.length > 0) {
            return res.status(409).send({
                retorno: {
                    status: 409,
                    mensagem: "E-mail já cadastrado, tente outro.",
                },
                registros: []
            });
        }

        // Hash da senha de forma assíncrona
        const senhaHash = await bcrypt.hash(senha, 10);

        const result = await executeQuery(
            `INSERT INTO apicultores (nome, email, senha, criado_em)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, nome, email, criado_em;`,
            [nome, email, senhaHash]);

        res.status(201).send({
            retorno: {
                status: 201,
                mensagem: "Seu apicultor foi cadastrado com sucesso.",
            },
            registros: result
        });

    } catch (error) {
        console.error("Erro ao cadastrar apicultor:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao cadastrar apicultor, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

// Função para enviar o e-mail
const sendEmail = async (email, token) => {
    try {
        // Criar o transportador de e-mail
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Usando o Gmail como exemplo
            auth: {
                user: 'lenilson.pantoja@estudante.ifms.edu.br', // Seu e-mail
                pass: 'ckrvqhytjasvdbwu' // Sua senha ou app password
            },
            tls: {
                rejectUnauthorized: false // Desabilita a validação do certificado SSL
            }
        });

        // Configurar o e-mail
        const mailOptions = {
            from: 'PesaBox <lenilson.pantoja@estudante.ifms.edu.br>', // Seu e-mail
            to: email, // E-mail do destinatário
            subject: 'Alteração de Senha', // Assunto
            html: `
                <div style="width: 100%; background-color: #f4f4f4; padding: 40px 0; font-family: Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); padding: 30px; text-align: center;">
                        
                        <img src="https://cdn-icons-png.flaticon.com/512/4511/4511571.png" alt="Abelha" style="width: 80px; " />
                        
                        <h2 style="color: #333;">Recebemos uma solicitação para alterar sua senha de acesso à nossa plataforma</h2>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
                        <p style="font-size: 14px; color: #555;">
                        Se você não fez essa solicitação para alterar sua senha, alguém pode estar usando sua conta. Verifique e proteja a conta imediatamente.
                        </p>
                        <a href="https://pesabox.vercel.app/#/senha/alterar/${token}" 
                        style="display: inline-block; margin-top: 25px; background-color: #4285F4; color: white; padding: 12px 25px; border-radius: 4px; text-decoration: none; font-size: 15px; min-width: 300px;">
                        Alterar minha senha
                        </a>
                    </div>
                </div>
            `
        };

        // Enviar o e-mail
        await transporter.sendMail(mailOptions);
        console.log('E-mail enviado com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar o e-mail:', error);
        throw new Error('Erro ao enviar o e-mail');
    }
};

exports.createTokenAlterarSenha = async (req, res, next) => {
    try {
        let { email } = req.body;

        if (!email) {
            return res.status(400).send({
                retorno: {
                    status: 400,
                    mensagem: "Verifique os dados e tente novamente.",
                },
                registros: []
            });
        }

        const resultExisteEmail = await executeQuery(
            `select id from apicultores where email = $1`,
            [email]
        );

        if (resultExisteEmail?.length < 1) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Email não encontrado, tente novamente.",
                },
                registros: []
            });
        }

        const resultExisteToken = await executeQuery(
            `select id from token_alterar_senha where email = $1`,
            [email]
        );

        if (resultExisteToken?.length > 0) {
            await executeQuery(
                `delete from token_alterar_senha where email = $1`,
                [email]
            );
        }

        // Gerar um token único
        const hashToken = uuidv4();

        // Salvar o token no banco de dados
        const result = await executeQuery(
            `INSERT INTO token_alterar_senha (token_senha, email, criado_em)
            VALUES ($1, $2, NOW())
            RETURNING id, token_senha, email, criado_em;`,
            [hashToken, email]
        );

        // Enviar o e-mail com o token
        await sendEmail(email, hashToken);

        res.status(201).send({
            retorno: {
                status: 201,
                mensagem: `Enviamos um email para ${email} com um link para alterar sua senha, verifique sua caixa de entrada.`,
            },
            registros: result
        });

    } catch (error) {
        console.error("Erro ao solicitar alteração de senha:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao solicitar alteração de senha, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

exports.readOneTokenAlterarSenha = async (req, res, next) => {
    try {
        const { token_senha } = req.params;

        const responseApicultor = await executeQuery(
            `SELECT id FROM token_alterar_senha where token_senha = $1`,
            [token_senha]
        );

        if (responseApicultor.length === 0) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Ação não autorizada, tente novamente.",
                },
                registros: []
            });
        }

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: "Ação autorizada.",
            },
            registros: []
        });

    } catch (error) {
        console.error("Erro ao buscar token:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao buscar token, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

exports.updateSenha = async (req, res, next) => {
    try {
        const { token_senha, senha } = req.body;

        if (!token_senha || !senha) {
            return res.status(400).send({
                retorno: {
                    status: 400,
                    mensagem: "Campos obrigatórios não foram informados, tente novamente.",
                },
                registros: []
            });
        }

        const responseApicultor = await executeQuery(
            `SELECT id, email FROM token_alterar_senha where token_senha = $1`,
            [token_senha]
        );

        if (responseApicultor.length === 0) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Ação não autorizada, tente novamente.",
                },
                registros: []
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await executeQuery(
            `update apicultores set senha = $1 where email = $2`,
            [senhaHash, responseApicultor[0].email]
        );

        await executeQuery(
            `delete from token_alterar_senha where token_senha = $1`,
            [token_senha]
        );

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: "Sua senha foi alterada com sucesso.",
            },
            registros: []
        });

    } catch (error) {
        console.error("Erro ao buscar token:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao buscar token, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

exports.loginApicultor = async (req, res, next) => {
    try {
        let { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).send({
                retorno: {
                    status: 400,
                    mensagem: "Todos os campos devem ser preenchidos, tente novamente.",
                },
                registros: []
            });
        }

        // Converter e-mail para lowercase
        const emailLower = email.toLowerCase();

        const apicultor = await executeQuery(
            `SELECT id, nome, email, senha, criado_em 
            FROM apicultores 
            WHERE LOWER(email) = $1`,
            [emailLower]);

        if (!apicultor || apicultor.length === 0) {
            return res.status(401).send({
                retorno: {
                    status: 401,
                    mensagem: "Falha na autenticação, os dados informados são inválidos.",
                },
                registros: []
            });
        }

        const { id, nome, senha: senhaHash, criado_em } = apicultor[0];


        // Comparar senha fornecida com a armazenada
        const senhaCorreta = await bcrypt.compare(senha, senhaHash);
        if (!senhaCorreta) {
            return res.status(401).send({
                retorno: {
                    status: 401,
                    mensagem: "Falha na autenticação, os dados informados são inválidos.",
                },
                registros: []
            });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { apicultor_id: id, nome, email: emailLower, criado_em },
            process.env.JWT_KEY,
            { expiresIn: "48h" }
        );

        // Criar objeto de resposta sem senha
        const apicultorRetorno = { id, nome, email: emailLower, criado_em, token };

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: "Apicultor autenticado com sucesso.",
            },
            registros: apicultorRetorno
        });

    } catch (error) {
        console.error("Erro ao autenticar apicultor:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao autenticar apicultor, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

exports.updateApicultor = async (req, res, next) => {
    try {
        let { nome, email } = req.body;
        const { apicultor_id } = req.dados;

        // Converter e-mail para lowercase
        if (email) email = email.toLowerCase();

        const resultEmailExiste = await executeQuery(
            `select id from apicultores where email = $1 and id != $2`,
            [email, apicultor_id]
        );

        if (resultEmailExiste.length > 0) {
            return res.status(500).send({
                retorno: { status: 500, mensagem: `Email ${email} já existe para outro apicultor.` },
                registros: []
            });
        }

        const campos = [];
        const valores = [];
        let index = 1;

        if (nome) {
            campos.push(`nome=$${index++}`);
            valores.push(nome);
        }
        if (email) {
            campos.push(`email=$${index++}`);
            valores.push(email);
        }

        if (campos.length === 1) {
            return res.status(400).send({
                retorno: { status: 400, mensagem: "Nenhum dado para atualizar." },
                registros: []
            });
        }

        // Buscar dados atuais do apicultor
        const apicultorAtual = await executeQuery(
            `SELECT * FROM apicultores WHERE id = $1`,
            [apicultor_id]);

        if (!apicultorAtual.length) {
            return res.status(404).send({
                retorno: { status: 404, mensagem: "Apicultor não encontrado." },
                registros: []
            });
        }

        // Verificar se os dados realmente mudaram
        const dadosAtuais = apicultorAtual[0];
        const isDifferent = (
            (nome && nome !== dadosAtuais.nome) ||
            (email && email !== dadosAtuais.email)
        );

        if (!isDifferent) {
            return res.status(201).send({
                retorno: { status: 201, mensagem: "Nenhuma alteração foi feita." },
                registros: []
            });
        }

        valores.push(apicultor_id);
        const query = `UPDATE apicultores SET ${campos.join(", ")} WHERE id=$${valores.length} RETURNING *`;

        const result = await executeQuery(query, valores);

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: "Seu apicultor foi atualizado com sucesso.",
            },
            registros: result
        });

    } catch (error) {
        // console.error("Erro ao atualizar apicultor:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro ao atualizar apicultor, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};

exports.deleteApicultor = async (req, res, next) => {
    try {
        const { apicultor_id } = req.dados;

        // Verifica se o apicultor existe antes de excluir
        const apicultorExistente = await executeQuery(
            `SELECT id, nome, email FROM apicultores WHERE id = $1`,
            [apicultor_id]);

        if (!apicultorExistente.length) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Apicultor não encontrado ou já removido.",
                },
                registros: []
            });
        }

        // Excluir apicultor ou marcar como inativo
        const deletedApicultor = await executeQuery(
            `DELETE FROM apicultores WHERE id=$1 RETURNING *;`,
            [apicultor_id]);

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: `O apicultor '${deletedApicultor[0].nome}' foi removido com sucesso.`,
            },
            registros: deletedApicultor
        });

    } catch (error) {
        console.error("Erro ao excluir apicultor:", error);
        res.status(500).send({
            retorno: {
                status: 500,
                mensagem: "Erro interno ao remover apicultor, tente novamente.",
                erro: error.message
            },
            registros: []
        });
    }
};