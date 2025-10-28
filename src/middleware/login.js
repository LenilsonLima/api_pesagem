const jwt = require("jsonwebtoken");
const executeQuery = require("../../pgsql");

exports.obrigatorioLogin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        retorno: {
          status: 401,
          mensagem: "Token de autenticação não fornecido.",
        },
        registros: [],
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    const apicultor = await executeQuery(
      `SELECT status FROM usuarios WHERE id = $1`,
      [decoded?.apicultor_id]
    );

    if (!apicultor.length) {
      return res.status(404).send({
        retorno: {
          status: 404,
          mensagem: "Apicultor não encontrado.",
        },
        registros: [],
      });
    }

    if (apicultor[0].status === 0) {
      return res.status(403).send({
        retorno: {
          status: 403,
          mensagem:
            "Acesso negado, sua conta de apicultor está bloqueada. Entre em contato com o administrador para mais informações.",
        },
        registros: [],
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
    });
  }
};


exports.opcionalLogin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      req.dados = decoded;
    }

    next(); // continua a execução mesmo se não houver token
  } catch (error) {
    next(); // ignora erro de token inválido e segue
  }
};
