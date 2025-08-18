const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PGSQL_USER,
    password: process.env.PGSQL_PASSWORD,
    host: process.env.PGSQL_HOST,
    port: process.env.PGSQL_PORT,
    database: process.env.PGSQL_DATABASE,
    ssl: {
        rejectUnauthorized: false // Importante: Render usa certificados não verificados
    }
});

const executeQuery = async (sql, params = []) => {
    try {
        const client = await pool.connect(); 
        const result = await client.query(sql, params); 
        client.release();  
        return result.rows;
    } catch (err) {
        console.error("Erro na consulta:", err);
        throw new Error("Erro ao executar a consulta no banco de dados.");
    }
};

module.exports = executeQuery;
