-- SQL para remover a constraint de foreign key e permitir inserção manual de clientes
-- Execute este comando no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar qual é o nome da constraint
SELECT 
    constraint_name, 
    table_name, 
    column_name, 
    foreign_table_name, 
    foreign_column_name
FROM 
    information_schema.key_column_usage 
WHERE 
    table_name = 'poupeja_users' 
    AND constraint_name LIKE '%fkey%';

-- 2. Remover a constraint de foreign key (substitua 'poupeja_users_id_fkey' pelo nome real se for diferente)
ALTER TABLE poupeja_users 
DROP CONSTRAINT IF EXISTS poupeja_users_id_fkey;

-- 3. Verificar se a constraint foi removida
SELECT 
    constraint_name, 
    table_name
FROM 
    information_schema.table_constraints 
WHERE 
    table_name = 'poupeja_users' 
    AND constraint_type = 'FOREIGN KEY';

-- 4. Opcional: Criar uma nova constraint mais flexível que permite NULL
-- Descomente as linhas abaixo se quiser manter alguma validação
/*
ALTER TABLE poupeja_users 
ADD CONSTRAINT poupeja_users_id_fkey_optional 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE 
DEFERRABLE INITIALLY DEFERRED;
*/

-- 5. Verificar a estrutura da tabela após as mudanças
\d poupeja_users;