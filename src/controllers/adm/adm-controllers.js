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
        const usuarios = await executeQuery(
            `SELECT id, nome, email, tipo, status, criado_em FROM usuarios ORDER BY criado_em DESC`,
            []
        );

        if (!usuarios.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Nenhum usuário encontrado." },
            registros: []
        });

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
// Bloquear/Desbloquear usuário
// ==========================
exports.blockAdmUsuario = async (req, res) => {
    try {
        const { status, id } = req.body;

        if (status === undefined || id === undefined) return res.status(400).send({
            retorno: { status: 400, mensagem: "Todos os campos devem ser preenchidos." },
            registros: []
        });

        if (![0, 1].includes(status)) return res.status(400).send({
            retorno: { status: 400, mensagem: "Status inválido. Use 0 ou 1." },
            registros: []
        });

        const usuarioExiste = await executeQuery(
            `SELECT id FROM usuarios WHERE id = $1`,
            [id]
        );

        if (!usuarioExiste.length) return res.status(404).send({
            retorno: { status: 404, mensagem: "Usuário não encontrado." },
            registros: []
        });

        const atualizado = await executeQuery(
            `UPDATE usuarios SET status = $1 WHERE id = $2 RETURNING id, nome, email, tipo, status, criado_em`,
            [status, id]
        );

        res.status(200).send({
            retorno: { status: 200, mensagem: "Usuário atualizado com sucesso." },
            registros: atualizado
        });

    } catch (error) {
        res.status(500).send({
            retorno: { status: 500, mensagem: error.message || "Erro ao atualizar usuário." },
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