
const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authenticateToken = require("../middleware/auth");
const authorizeRole = require("../middleware/roles");

// Status permitidos
const validStatuses = [
    "Em análise",
    "Procurando",
    "Encontrado",
    "Entregue"
];

// Cadastrar objeto (somente aluno)
router.post(
    "/",
    authenticateToken,
    authorizeRole("aluno"),
    (req, res) => {
        try {
            const {
                title,
                description,
                category,
                location,
                occurrence_date,
                type,
                image
            } = req.body;

            if (
                !title ||
                !description ||
                !category ||
                !location ||
                !occurrence_date ||
                !type
            ) {
                return res.status(400).json({
                    error: "Preencha todos os campos obrigatorios."
                });
            }

            const protocol = `LF-${Date.now()}`;

            const insert = db.prepare(`
                INSERT INTO items (
                    protocol,
                    title,
                    description,
                    category,
                    location,
                    occurrence_date,
                    type,
                    image,
                    status,
                    created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = insert.run(
    protocol,
    title,
    description,
    category,
    location,
    occurrence_date,
    type,
    image || null,
    "Em análise",
    req.user.id
);

            db.prepare(`
                INSERT INTO status_history (
                    item_id,
                    old_status,
                    new_status,
                    changed_by
                )
                VALUES (?, ?, ?, ?)
            `).run(
                result.lastInsertRowid,
                null,
                "Em análise",
                req.user.id
            );

            res.status(201).json({
                message: "Objeto cadastrado com sucesso!",
                id: result.lastInsertRowid,
                protocol
            });

        } catch (error) {
            console.error("Erro ao cadastrar objeto:", error);

            res.status(500).json({
                error: "Erro ao cadastrar objeto."
            });
        }
    }
);

// Listar objetos
router.get(
    "/",
    authenticateToken,
    (req, res) => {
        try {
            let items;

            if (req.user.role === "func") {
                items = db.prepare(`
                    SELECT * FROM items
                    ORDER BY created_at DESC
                `).all();

            } else if (req.user.role === "aluno") {
                items = db.prepare(`
                    SELECT * FROM items
                    WHERE created_by = ?
                    ORDER BY created_at DESC
                `).all(req.user.id);

            } else {
                return res.status(403).json({
                    error: "Funcao sem permissao."
                });
            }

            res.json({
                total: items.length,
                items
            });

        } catch (error) {
            console.error("Erro ao consultar objetos:", error);

            res.status(500).json({
                error: "Erro ao consultar objetos."
            });
        }
    }
);

// Consultar objeto por protocolo (público)
router.get("/protocol/:protocol", (req, res) => {
    try {
        const { protocol } = req.params;

        const item = db.prepare(`
            SELECT
                protocol,
                title,
                description,
                category,
                location,
                occurrence_date,
                type,
                status,
                created_at
            FROM items
            WHERE protocol = ?
        `).get(protocol);

        if (!item) {
            return res.status(404).json({
                error: "Nenhum objeto encontrado."
            });
        }

        res.json(item);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao consultar protocolo."
        });
    }
});

// Alterar status (somente funcionário)
router.patch(
    "/:id/status",
    authenticateToken,
    authorizeRole("func"),
    (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    error: "Status invalido."
                });
            }

            const updateTransaction = db.transaction(() => {
                const item = db.prepare(
                    "SELECT * FROM items WHERE id = ?"
                ).get(id);

                if (!item) return null;

                if (item.status === status) {
                    return {
                        unchanged: true,
                        old_status: item.status,
                        new_status: status
                    };
                }

                db.prepare(`
                    UPDATE items
                    SET status = ?
                    WHERE id = ?
                `).run(status, id);

                db.prepare(`
                    INSERT INTO status_history (
                        item_id,
                        old_status,
                        new_status,
                        changed_by
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    id,
                    item.status,
                    status,
                    req.user.id
                );

                return {
                    unchanged: false,
                    old_status: item.status,
                    new_status: status
                };
            });

            const result = updateTransaction();

            if (!result) {
                return res.status(404).json({
                    error: "Objeto nao encontrado."
                });
            }

            res.json({
                message: result.unchanged
                    ? "O objeto ja possui esse status."
                    : "Status atualizado com sucesso!",
                ...result
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Erro ao atualizar status."
            });
        }
    }
);

// Consultar histórico
router.get(
    "/:id/history",
    authenticateToken,
    (req, res) => {
        try {
            const { id } = req.params;

            const item = db.prepare(
                "SELECT id, created_by FROM items WHERE id = ?"
            ).get(id);

            if (!item) {
                return res.status(404).json({
                    error: "Objeto nao encontrado."
                });
            }

            if (
                req.user.role === "aluno" &&
                item.created_by !== req.user.id
            ) {
                return res.status(403).json({
                    error: "Voce nao tem permissao para consultar este historico."
                });
            }

            if (
                req.user.role !== "aluno" &&
                req.user.role !== "func"
            ) {
                return res.status(403).json({
                    error: "Funcao sem permissao."
                });
            }

            const history = db.prepare(`
                SELECT old_status, new_status, changed_at, changed_by
                FROM status_history
                WHERE item_id = ?
                ORDER BY id ASC
            `).all(id);

            res.json({
                item_id: Number(id),
                total: history.length,
                history
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Erro ao consultar historico."
            });
        }
    }
);

module.exports = router;
