import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

let db: Database | null = null;

export function getDb(): Database {
    if (!db) {
        throw new Error("Database not initialized. Call initDb() first.");
    }
    return db;
}

export function initDb(dataDir = "./data"): Database {
    const dbPath = resolve(dataDir, "playlist-proxy.db");

    // Ensure data directory exists
    const dir = resolve(dataDir);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath, { create: true });
    db.exec("PRAGMA journal_mode = WAL;");

    runMigrations(db);
    seedDefaults(db);

    return db;
}

function runMigrations(db: Database) {
    // Create migrations table
    db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    const migrations = [
        {
            id: 1,
            name: "create_settings_table",
            sql: `
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `,
        },
        {
            id: 2,
            name: "create_sources_table",
            sql: `
        CREATE TABLE IF NOT EXISTS sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          m3u_url TEXT NOT NULL,
          epg_url TEXT,
          channel_renumber_type TEXT DEFAULT 'none',
          channel_renumber_value REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `,
        },
    ];

    const appliedMigrations = db
        .query<{ id: number }, []>("SELECT id FROM migrations")
        .all()
        .map((row) => row.id);

    for (const migration of migrations) {
        if (!appliedMigrations.includes(migration.id)) {
            db.exec(migration.sql);
            db.run("INSERT INTO migrations (id, name) VALUES (?, ?)", [
                migration.id,
                migration.name,
            ]);
        }
    }
}

function seedDefaults(db: Database) {
    const defaults = {
        port: "3000",
        hostname: "",
        protocol: "http",
        proxy_streams: "false",
        cache_duration: "300",
    };

    const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");

    for (const [key, value] of Object.entries(defaults)) {
        insertSetting.run(key, value);
    }
}

export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
