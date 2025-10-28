CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    status INT DEFAULT 1, -- 1 = ativo, 0 = inativo
    tipo INT DEFAULT 0, -- 0 = apicultor comum, 0 = administrador
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE caixas (
    id SERIAL PRIMARY KEY,
    observacao VARCHAR(255),
    identificador_balanca VARCHAR(100) UNIQUE NOT NULL,
    limite_peso DECIMAL(10,2),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE peso_caixa (
    id SERIAL PRIMARY KEY,
    peso_atual DECIMAL(10,2) DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    caixa_id INTEGER REFERENCES caixas(id) ON DELETE CASCADE
);

CREATE TABLE token_alterar_senha (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    token_senha VARCHAR(255) UNIQUE NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
