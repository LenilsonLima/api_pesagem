const app = require('./app.js');
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Servidor Express está ouvindo na porta ${PORT}`);
});
