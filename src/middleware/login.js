const jwt = require("jsonwebtoken");
exports.obrigatorioLogin = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.dados = decoded;
    next();
  } catch (error) {
    return res.status(401).send({
      retorno: {
        status: 401,
        mensagem: "Falha na autenticação, token inválido.",
      },
    });
  }
};

exports.opcionalLogin = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.dados = decoded;
    next();
  } catch (error) {
    next();
  }
};