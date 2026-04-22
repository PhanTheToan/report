import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
const schemaPath = path.join(__dirname, 'schema.sql');
const databasePath = path.join(dataDir, 'vuln-report.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec(fs.readFileSync(schemaPath, 'utf8'));

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn('findings', 'cvss_ref', "TEXT NOT NULL DEFAULT ''");
ensureColumn('findings', 'cvss_score', "TEXT NOT NULL DEFAULT ''");
ensureColumn('reports', 'appendix_html', "TEXT NOT NULL DEFAULT '<p></p>'");
