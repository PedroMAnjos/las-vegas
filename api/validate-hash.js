const app = require('../../js/server');

// Repassa a requisição da validação de HASH.
// Garante que o Vercel processe a rota Serverless do 2FA corretamente.
module.exports = app;