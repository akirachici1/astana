/**
 * database/db.js — Koneksi singleton ke SQLite (via node-sqlite3-wasm)
 * Pure JavaScript SQLite, tidak perlu native build
 */

'use strict';

require('dotenv').config();
const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || './database/astana.db';
const resolvedPath = path.resolve(DB_PATH);

// Pastikan direktori ada
const dbDir = path.dirname(resolvedPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(resolvedPath);
    _db.run('PRAGMA foreign_keys = ON');
  }
  return _db;
}

module.exports = { getDb };
