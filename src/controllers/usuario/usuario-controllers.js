const executeQuery = require("../../../pgsql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// ==========================
// Listar um usuário específico
// ==========================
exports.readOneUsuario = async (req, res) => {
    try {
        const { usuario_id } = req.dados;

        const usuario = await executeQuery(
            `SELECT id, nome, email, criado_em FROM usuarios WHERE id = $1`,
            [usuario_id]
        );

        if (!usuario.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Nenhuma informação foi localizada." },
            registros: []
        });

        res.status(200).send({
            retorno: { status: 200, mensagem: "Dados localizados com sucesso." },
            registros: usuario
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao buscar usuário.", erro: error.message },
            registros: []
        });
    }
};

// ==========================
// Criar usuário
// ==========================
exports.createUsuario = async (req, res) => {
    try {
        let { nome, email, senha } = req.body;

        if (!nome || !email || !senha) return res.status(400).send({
            retorno: { status: 400, mensagem: "Campos obrigatórios ausentes." },
            registros: []
        });

        const emailExistente = await executeQuery(
            `SELECT id FROM usuarios WHERE LOWER(email) = $1`,
            [email.toLowerCase()]
        );

        if (emailExistente.length > 0) return res.status(409).send({
            retorno: { status: 409, mensagem: "E-mail já cadastrado." },
            registros: []
        });

        const senhaHash = await bcrypt.hash(senha, 10);

        const result = await executeQuery(
            `INSERT INTO usuarios (nome, email, senha, criado_em) VALUES ($1, $2, $3, NOW()) RETURNING id, nome, email, criado_em;`,
            [nome, email.toLowerCase(), senhaHash]
        );

        res.status(201).send({
            retorno: { status: 201, mensagem: "Usuário cadastrado com sucesso." },
            registros: result
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao cadastrar usuário.", erro: error.message },
            registros: []
        });
    }
};

// ==========================
// Função para envio de e-mail
// ==========================
const sendEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'lenilson.pantoja@estudante.ifms.edu.br',
            pass: process.env.EMAIL_APP_PASSWORD
        },
        tls: { rejectUnauthorized: false }
    });

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
                        <a href="https://pesagem-omega.vercel.app/#/senha/alterar/${token}" 
                        style="display: inline-block; margin-top: 25px; background-color: #4285F4; color: white; padding: 12px 25px; border-radius: 4px; text-decoration: none; font-size: 15px; min-width: 300px;">
                        Alterar minha senha
                        </a>
                    </div>
                </div>
            `
    };

    await transporter.sendMail(mailOptions);
};

// ==========================
// Criar token de alteração de senha
// ==========================
exports.createTokenAlterarSenha = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).send({
            retorno: { status: 400, mensagem: "Informe o e-mail." },
            registros: []
        });

        const usuario = await executeQuery(`SELECT id FROM usuarios WHERE email = $1`, [email]);
        if (!usuario.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Email não encontrado." },
            registros: []
        });

        await executeQuery(`DELETE FROM token_alterar_senha WHERE email = $1`, [email]);

        const token = uuidv4();
        const result = await executeQuery(
            `INSERT INTO token_alterar_senha (token_senha, email, criado_em) VALUES ($1, $2, NOW()) RETURNING id, token_senha, email, criado_em;`,
            [token, email]
        );

        await sendEmail(email, token);

        res.status(201).send({
            retorno: { status: 201, mensagem: `Email enviado para ${email} com link de alteração de senha.` },
            registros: result
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao criar token de senha.", erro: error.message },
            registros: []
        });
    }
};

// ==========================
// Validar token de alteração de senha
// ==========================
exports.readOneTokenAlterarSenha = async (req, res) => {
    try {
        const { token_senha } = req.query;

        const tokenExiste = await executeQuery(
            `SELECT id FROM token_alterar_senha WHERE token_senha = $1`,
            [token_senha]
        );

        if (!tokenExiste.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Ação não autorizada." },
            registros: []
        });

        res.status(200).send({
            retorno: { status: 200, mensagem: "Ação autorizada." },
            registros: []
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao validar token.", erro: error.message },
            registros: []
        });
    }
};

// ==========================
// Alterar senha
// ==========================
exports.updateSenha = async (req, res) => {
    try {
        const { token_senha, senha } = req.body;
        if (!token_senha || !senha) return res.status(400).send({
            retorno: { status: 400, mensagem: "Campos obrigatórios ausentes." },
            registros: []
        });

        const tokenDB = await executeQuery(`SELECT email FROM token_alterar_senha WHERE token_senha = $1`, [token_senha]);
        if (!tokenDB.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Ação não autorizada." },
            registros: []
        });

        const senhaHash = await bcrypt.hash(senha, 10);
        await executeQuery(`UPDATE usuarios SET senha = $1 WHERE email = $2`, [senhaHash, tokenDB[0].email]);
        await executeQuery(`DELETE FROM token_alterar_senha WHERE token_senha = $1`, [token_senha]);

        res.status(200).send({
            retorno: { status: 200, mensagem: "Senha alterada com sucesso." },
            registros: []
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao alterar senha.", erro: error.message },
            registros: []
        });
    }
};

// ==========================
// Login do usuário
// ==========================
exports.loginUsuario = async (req, res) => {
    try {
        let { email, senha } = req.body;
        if (!email || !senha) return res.status(400).send({
            retorno: { status: 400, mensagem: "Todos os campos devem ser preenchidos." },
            registros: []
        });

        email = email.toLowerCase();
        const usuario = await executeQuery(`SELECT * FROM usuarios WHERE LOWER(email) = $1`, [email]);

        if (!usuario.length) return res.status(401).send({
            retorno: { status: 401, mensagem: "Dados inválidos." },
            registros: []
        });

        if (usuario[0].status === 0) return res.status(403).send({
            retorno: { status: 403, mensagem: "Conta bloqueada." },
            registros: []
        });

        const senhaValida = await bcrypt.compare(senha, usuario[0].senha);
        if (!senhaValida) return res.status(401).send({
            retorno: { status: 401, mensagem: "Dados inválidos." },
            registros: []
        });

        const { id, nome, tipo, criado_em } = usuario[0];
        const token = jwt.sign({ usuario_id: id, nome, email, tipo, criado_em }, process.env.JWT_KEY);

        res.status(200).send({
            retorno: { status: 200, mensagem: "Usuário autenticado com sucesso." },
            registros: { id, nome, email, criado_em, token }
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao autenticar usuário.", erro: error.message },
            registros: []
        });
    }
};

// ==========================
// Atualizar usuário
// ==========================
exports.updateUsuario = async (req, res) => {
    try {
        let { nome, email } = req.body;
        const { usuario_id } = req.dados;

        if (!nome && !email) return res.status(400).send({
            retorno: { status: 400, mensagem: "Nenhum dado para atualizar." },
            registros: []
        });

        if (email) email = email.toLowerCase();
        const emailExistente = await executeQuery(
            `SELECT id FROM usuarios WHERE email = $1 AND id != $2`,
            [email, usuario_id]
        );

        if (emailExistente.length) return res.status(409).send({
            retorno: { status: 409, mensagem: "Email já existe para outro usuário." },
            registros: []
        });

        const campos = [];
        const valores = [];
        let index = 1;

        if (nome) { campos.push(`nome=$${index++}`); valores.push(nome); }
        if (email) { campos.push(`email=$${index++}`); valores.push(email); }

        valores.push(usuario_id);
        const result = await executeQuery(`UPDATE usuarios SET ${campos.join(", ")} WHERE id=$${valores.length} RETURNING id, nome, email, criado_em`, valores);

        res.status(200).send({
            retorno: { status: 200, mensagem: "Usuário atualizado com sucesso." },
            registros: result
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao atualizar usuário.", erro: error.message },
            registros: []
        });
    }
};

// ==========================
// Bloquear usuário
// ==========================
exports.blockUsuario = async (req, res) => {
    try {
        const { usuario_id, tipo } = req.dados;
        const { id } = req.query;

        const id_select = id ? id : usuario_id;

        if (tipo != 1 && usuario_id != id_select) {
            return res.status(404).send({
                retorno: {
                    status: 404,
                    mensagem: "Ação não disponível para este usuário."
                },
                registros: []
            });
        }

        const usuario = await executeQuery(`SELECT id, nome, status FROM usuarios WHERE id = $1`, [id_select]);
        const status = usuario[0]?.status == 0 ? 1 : 0;

        if (!usuario.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Usuário não encontrado." },
            registros: []
        });

        const bloqueado = await executeQuery(`UPDATE usuarios SET status=$1 WHERE id=$2 RETURNING id, nome, email, criado_em`, [status, id_select]);

        res.status(200).send({
            retorno: { status: 200, mensagem: `Usuário '${bloqueado[0].nome}' bloqueado com sucesso.` },
            registros: bloqueado
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: "Erro ao bloquear usuário.", erro: error.message },
            registros: []
        });
    }
};
