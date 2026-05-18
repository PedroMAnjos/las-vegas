-- Criação da extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Usuários (Login Customizado - Sem Auth do Supabase)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'professional', 'registrar')) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Hashes Operacionais (2FA do Professional)
CREATE TABLE operator_hashes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operator_name TEXT NOT NULL,
    operator_hash TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Mediadores (Dados extraídos)
CREATE TABLE mediators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by TEXT,
    extracted_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Logs (Auditoria com exclusão em cascata)
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operator_name TEXT,
    operator_hash TEXT,
    role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance para multi-tenant e cron job
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_mediators_tenant ON mediators(tenant_id);
CREATE INDEX idx_logs_tenant ON logs(tenant_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);

-- Inserindo um Tenant inicial para poder fazer os primeiros testes
INSERT INTO tenants (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Empresa Master');