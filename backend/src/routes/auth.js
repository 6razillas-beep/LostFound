
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/db");

const router = express.Router();

router.post("/register", (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Nome, email e senha sao obrigatorios."
            });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({
                error: "O nome precisa ter pelo menos 2 caracteres."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "A senha precisa ter pelo menos 8 caracteres."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = db.prepare(`
            SELECT id FROM users
            WHERE email = ?
        `).get(normalizedEmail);

        if (existingUser) {
            return res.status(409).json({
                error: "Este email ja esta cadastrado."
            });
        }

        const passwordHash = bcrypt.hashSync(password, 12);

        const result = db.prepare(`
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, 'aluno')
        `).run(
            name.trim(),
            normalizedEmail,
            passwordHash
        );

        res.status(201).json({
            message: "Conta de aluno criada com sucesso!",
            user: {
                id: result.lastInsertRowid,
                name: name.trim(),
                email: normalizedEmail,
                role: "aluno"
            }
        });

    } catch (error) {
        console.error("Erro no cadastro:", error);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "Este email ja esta cadastrado."
            });
        }

        res.status(500).json({
            error: "Erro interno no servidor."
        });
    }
});

router.post("/login", (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email e senha sao obrigatorios."
            });
        }

        const user = db.prepare(`
            SELECT * FROM users
            WHERE email = ?
        `).get(email);

        if (!user) {
            return res.status(401).json({
                error: "Credenciais invalidas."
            });
        }

        const passwordMatches = bcrypt.compareSync(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Credenciais invalidas."
            });
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            return res.status(500).json({
                error: "Chave de autenticacao nao configurada."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            secret,
            { expiresIn: "8h" }
        );

        res.json({
            message: "Login realizado com sucesso!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Erro no login:", error);

        res.status(500).json({
            error: "Erro interno no servidor."
        });
    }
});

module.exports = router;
