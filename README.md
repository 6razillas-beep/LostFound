# LostFound — Sistema de Achados e Perdidos

Sistema web para gerenciamento de objetos perdidos, encontrados e avisos.

## Tecnologias
- Node.js
- Express
- SQLite
- HTML, CSS e JavaScript
- Vite
- JWT e bcrypt

## Instalação

### Backend

No terminal:

    cd C:\lostfound\backend
    npm install
    Copy-Item .env.example .env

Edite o arquivo `.env` e configure uma chave secreta forte para JWT_SECRET.

Inicie o backend:

    npm run dev

API: http://localhost:3000

### Frontend

Em outro terminal:

    cd C:\lostfound\frontend
    npm install
    npm run dev

Acesse:
http://localhost:5173/materiais/site-materiais-v2/index.html

## Segurança

Não publique o arquivo `.env`, bancos de dados, backups ou dados pessoais de usuários.
