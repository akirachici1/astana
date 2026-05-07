const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const dbPath = path.join(__dirname, 'astana.db');
let db = null;

function openDatabase() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const database = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Gagal koneksi DB:', err.message);
    else console.log('✅ Database SQLite terhubung');
  });

  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;', (pragmaErr) => {
    if (pragmaErr) {
      console.error('❌ Gagal mengaktifkan PRAGMA SQLite:', pragmaErr.message);
    }
  });

  database.getAsync = promisify(database.get.bind(database));
  database.allAsync = promisify(database.all.bind(database));
  database.execAsync = promisify(database.exec.bind(database));
  database.runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      database.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
      });
    });
  };

  return database;
}

function getDb() {
  if (!db) db = openDatabase();
  return db;
}

function closeDb() {
  if (db) {
    db.close((err) => {
      if (err) console.error('❌ Gagal tutup DB:', err.message);
      else console.log('✅ Database ditutup');
    });
    db = null;
  }
}

module.exports = { getDb, closeDb };
