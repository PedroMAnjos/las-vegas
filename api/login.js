const app = require('../../js/server');

// Repassa a requisição para o Express processar com todas as proteções.
// Garante que o Vercel processe a rota Serverless de login corretamente.
module.exports = app;