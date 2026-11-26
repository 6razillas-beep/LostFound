
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "../../lostfound.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        occurrence_date TEXT NOT NULL,
        type TEXT NOT NULL,
        image TEXT,
        status TEXT NOT NULL DEFAULT 'Recebido',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id)
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'aluno',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Nova',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_by INTEGER,
        resolved_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (resolved_by) REFERENCES users(id)
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS notice_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notice_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by INTEGER NOT NULL,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (notice_id) REFERENCES notices(id),
        FOREIGN KEY (changed_by) REFERENCES users(id)
    );
`);

console.log("Banco de dados conectado!");
console.log("Tabela de objetos pronta!");

module.exports = db;
