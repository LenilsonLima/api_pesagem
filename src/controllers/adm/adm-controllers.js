const executeQuery = require("../../../pgsql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================
// Listar um usuário específico
// ==========================
exports.readAdmOneUsuario = async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) return res.status(400).send({
            retorno: { status: 400, mensagem: "Informe o ID do usuário." },
            registros: []
        });

        const usuario = await executeQuery(
            `SELECT id, nome, email, tipo, status, criado_em FROM usuarios WHERE id = $1`,
            [id]
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
            retorno: { status: 500, mensagem: error.message || "Erro ao buscar usuário." },
            registros: []
        });
    }
};

// ==========================
// Listar todos os usuários
// ==========================
exports.readAdmUsuarios = async (req, res) => {
    try {
        const { usuario_id } = req.dados;

        const usuarios = await executeQuery(
            `SELECT id, nome, email, tipo, status, criado_em
             FROM usuarios
             WHERE id <> $1
             ORDER BY id ASC`,
            [usuario_id]
        );

        if (!usuarios.length) {
            return res.status(404).send({
                retorno: { status: 404, mensagem: "Nenhum usuário encontrado." },
                registros: []
            });
        }

        res.status(200).send({
            retorno: { status: 200, mensagem: "Dados localizados com sucesso." },
            registros: usuarios
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: error.message || "Erro ao buscar usuários." },
            registros: []
        });
    }
};


// ==========================
// Excluir usuário
// ==========================
exports.deleteAdmUsuario = async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) return res.status(400).send({
            retorno: { status: 400, mensagem: "Informe o ID do usuário a ser removido." },
            registros: []
        });

        const usuarioExistente = await executeQuery(
            `SELECT id, nome FROM usuarios WHERE id = $1`,
            [id]
        );

        if (!usuarioExistente.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Usuário não encontrado ou já removido." },
            registros: []
        });

        const deletado = await executeQuery(
            `DELETE FROM usuarios WHERE id=$1 RETURNING id, nome, email, tipo, status, criado_em`,
            [id]
        );

        res.status(200).send({
            retorno: {
                status: 200,
                mensagem: `O usuário '${deletado[0].nome}' foi removido com sucesso.`,
            },
            registros: deletado
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: error.message || "Erro interno ao remover usuário." },
            registros: []
        });
    }
};

// ==========================
// Login administrador
// ==========================
exports.loginAdmUsuario = async (req, res) => {
    try {
        let { email, senha } = req.body;

        if (!email || !senha) return res.status(400).send({
            retorno: { status: 400, mensagem: "Todos os campos devem ser preenchidos." },
            registros: []
        });

        email = email.toLowerCase();

        const usuario = await executeQuery(
            `SELECT id, nome, email, senha, status, tipo, criado_em FROM usuarios WHERE LOWER(email) = $1`,
            [email]
        );

        if (!usuario.length || usuario[0].tipo !== 1) return res.status(401).send({
            retorno: { status: 401, mensagem: "Falha na autenticação, os dados informados são inválidos." },
            registros: []
        });

        if (usuario[0].status === 0) return res.status(403).send({
            retorno: { status: 403, mensagem: "Acesso negado, sua conta está bloqueada." },
            registros: []
        });

        const senhaValida = await bcrypt.compare(senha, usuario[0].senha);
        if (!senhaValida) return res.status(401).send({
            retorno: { status: 401, mensagem: "Falha na autenticação, os dados informados são inválidos." },
            registros: []
        });

        const { id: usuarioId, nome, tipo, criado_em } = usuario[0];

        const token = jwt.sign(
            { usuario_id: usuarioId, nome, email, tipo, criado_em },
            process.env.JWT_KEY
        );

        res.status(200).send({
            retorno: { status: 200, mensagem: "Usuário autenticado com sucesso." },
            registros: { id: usuarioId, nome, email, criado_em, token }
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: error.message || "Erro ao autenticar usuário." },
            registros: []
        });
    }
};