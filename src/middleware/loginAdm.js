const jwt = require("jsonwebtoken");
const executeQuery = require("../../pgsql");

exports.obrigatorioLoginAdm = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        retorno: { status: 401, mensagem: "Token de autenticação não fornecido." },
        registros: []
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    if (!decoded?.usuario_id) {
      return res.status(401).send({
        retorno: { status: 401, mensagem: "Token inválido." },
        registros: []
      });
    }

    if (decoded?.tipo != 1) {
      return res.status(403).send({
        retorno: { status: 403, mensagem: "Ação não autorizada." },
        registros: []
      });
    }

    // Buscar status e tipo do usuário
    const usuario = await executeQuery(
      `SELECT status, tipo FROM usuarios WHERE id = $1`,
      [decoded.usuario_id]
    );

    if (!usuario.length) {
      return res.status(404).send({
        retorno: { status: 404, mensagem: "Usuário não encontrado." },
        registros: []
      });
    }

    if (usuario[0].status === 0) {
      return res.status(403).send({
        retorno: {
          status: 403,
          mensagem:
            "Acesso negado, sua conta de usuário está bloqueada. Entre em contato com o administrador.",
        },
        registros: []
      });
    }


    req.dados = decoded;
    next();

  } catch (error) {
    return res.status(401).send({
      retorno: {
        status: 401,
        mensagem: "Falha na autenticação: token inválido ou expirado.",
      },
      registros: []
    });
  }
};