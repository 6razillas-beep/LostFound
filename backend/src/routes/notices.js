
const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authenticateToken = require("../middleware/auth");
const authorizeRole = require("../middleware/roles");

const validStatuses = ["Nova", "Resolvida"];

// Cadastrar aviso (somente aluno)
router.post(
    "/",
    authenticateToken,
    authorizeRole("aluno"),
    (req, res) => {
        try {
            const { title, description } = req.body;

            if (
                !title ||
                !description ||
                !title.trim() ||
                !description.trim()
            ) {
                return res.status(400).json({
                    error: "Preencha o titulo e a descricao."
                });
            }

            const protocol = `AV-${Date.now()}`;

            const transaction = db.transaction(() => {
                const result = db.prepare(`
                    INSERT INTO notices (
                        protocol,
                        title,
                        description,
                        created_by,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    protocol,
                    title.trim(),
                    description.trim(),
                    req.user.id,
                    "Nova"
                );

                db.prepare(`
                    INSERT INTO notice_history (
                        notice_id,
                        old_status,
                        new_status,
                        changed_by
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    result.lastInsertRowid,
                    null,
                    "Nova",
                    req.user.id
                );

                return result.lastInsertRowid;
            });

            const id = transaction();

            res.status(201).json({
                message: "Aviso cadastrado com sucesso!",
                id,
                protocol
            });

        } catch (error) {
            console.error("Erro ao cadastrar aviso:", error);

            res.status(500).json({
                error: "Erro ao cadastrar aviso."
            });
        }
    }
);

// listar avisos
router.get(
    "/",
    authenticateToken,
    (req, res) => {
        try {
            let notices;

            if (req.user.role === "func") {
                notices = db.prepare(`
                    SELECT *
                    FROM notices
                    ORDER BY created_at DESC
                `).all();

            } else if (req.user.role === "aluno") {
                notices = db.prepare(`
                    SELECT *
                    FROM notices
                    WHERE created_by = ?
                    ORDER BY created_at DESC
                `).all(req.user.id);

            } else {
                return res.status(403).json({
                    error: "Funcao sem permissao."
                });
            }

            res.json({
                total: notices.length,
                notices
            });

        } catch (error) {
            console.error("Erro ao consultar avisos:", error);

            res.status(500).json({
                error: "Erro ao consultar avisos."
            });
        }
    }
);

// consultar aviso por ID
router.get(
    "/:id",
    authenticateToken,
    (req, res) => {
        try {
            const { id } = req.params;

            const notice = db.prepare(`
                SELECT *
                FROM notices
                WHERE id = ?
            `).get(id);

            if (!notice) {
                return res.status(404).json({
                    error: "Aviso nao encontrado."
                });
            }

            if (
                req.user.role === "aluno" &&
                notice.created_by !== req.user.id
            ) {
                return res.status(403).json({
                    error: "Voce nao tem permissao para consultar este aviso."
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

            res.json(notice);

        } catch (error) {
            console.error("Erro ao consultar aviso:", error);

            res.status(500).json({
                error: "Erro ao consultar aviso."
            });
        }
    }
);

// alterar status (somente funcionario)
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

            const transaction = db.transaction(() => {
                const notice = db.prepare(
                    "SELECT * FROM notices WHERE id = ?"
                ).get(id);

                if (!notice) return null;

                if (notice.status === status) {
                    return {
                        unchanged: true,
                        old_status: notice.status,
                        new_status: status
                    };
                }

                db.prepare(`
                    UPDATE notices
                    SET
                        status = ?,
                        resolved_by = ?,
                        resolved_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(
                    status,
                    status === "Resolvida" ? req.user.id : null,
                    id
                );

                db.prepare(`
                    INSERT INTO notice_history (
                        notice_id,
                        old_status,
                        new_status,
                        changed_by
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    id,
                    notice.status,
                    status,
                    req.user.id
                );

                return {
                    unchanged: false,
                    old_status: notice.status,
                    new_status: status
                };
            });

            const result = transaction();

            if (!result) {
                return res.status(404).json({
                    error: "Aviso nao encontrado."
                });
            }

            res.json({
                message: result.unchanged
                    ? "O aviso ja possui esse status."
                    : "Status atualizado com sucesso!",
                ...result
            });

        } catch (error) {
            console.error("Erro ao atualizar aviso:", error);

            res.status(500).json({
                error: "Erro ao atualizar status do aviso."
            });
        }
    }
);

// Consultar historico do aviso
router.get(
    "/:id/history",
    authenticateToken,
    (req, res) => {
        try {
            const { id } = req.params;

            const notice = db.prepare(`
                SELECT id, created_by
                FROM notices
                WHERE id = ?
            `).get(id);

            if (!notice) {
                return res.status(404).json({
                    error: "Aviso nao encontrado."
                });
            }

            if (
                req.user.role === "aluno" &&
                notice.created_by !== req.user.id
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
                SELECT
                    old_status,
                    new_status,
                    changed_at,
                    changed_by
                FROM notice_history
                WHERE notice_id = ?
                ORDER BY id ASC
            `).all(id);

            res.json({
                notice_id: Number(id),
                total: history.length,
                history
            });

        } catch (error) {
            console.error("Erro ao consultar historico:", error);

            res.status(500).json({
                error: "Erro ao consultar historico."
            });
        }
    }
);

module.exports = router;
