const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const db = require("./database/db");
const authRoutes = require("./routes/auth");
const itemsRoutes = require("./routes/items");
const noticesRoutes = require("./routes/notices");
const PORT = 3000;

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

app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log(" LOSTFOUND API");
    console.log("--------------------------------");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log("Status: ONLINE");
});