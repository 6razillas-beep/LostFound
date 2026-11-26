
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const db = require("./database/db");
const authRoutes = require("./routes/auth");
const itemsRoutes = require("./routes/items");
const noticesRoutes = require("./routes/notices");

const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

app.use("/api/items", itemsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notices", noticesRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        application: "LostFound",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// entrega os arquivos do site
const frontendPath = path.resolve(
    __dirname,
    "../../frontend/public"
);

app.use(express.static(frontendPath));

// ppágina inicial do sistema
app.get("/", (req, res) => {
    res.redirect("/materiais/site-materiais-v2/index.html");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("--------------------------------");
    console.log(" LOSTFOUND API");
    console.log("--------------------------------");
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log("Status: ONLINE");
});
