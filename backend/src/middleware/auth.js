const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Acesso nao autorizado. Faca login."
        });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({
            error: "Configuracao de autenticacao ausente."
        });
    }

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: "Token invalido ou expirado."
            });
        }

        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
