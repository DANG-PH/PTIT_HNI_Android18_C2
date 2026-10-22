import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config';

export const CATEGORIES = ['health', 'insurance', 'finance', 'legal', 'identity', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

/** A stored document. Title and body are Tide ciphertext: this service never sees plaintext. */
export interface DocumentRow {
  id: string;
  owner: string;
  category: Category;
  title_ct: string;
  body_ct: string;
  body_bytes: number;
  created_at: string;
}

export type ReceiptKind = 'index' | 'disclosure' | 'denied';

export interface ReceiptRow {
  id: string;
  owner: string;
  kind: ReceiptKind;
  doc_ids: string;
  question_ct: string | null;
  model: string | null;
  note: string | null;
  created_at: string;
}

@Injectable()
export class DbService implements OnModuleInit {
  db!: DatabaseSync;

  onModuleInit() {
    mkdirSync(dirname(env.dbPath), { recursive: true });
    this.db = new DatabaseSync(env.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        category TEXT NOT NULL,
        title_ct TEXT NOT NULL,
        body_ct TEXT NOT NULL,
        body_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS documents_owner ON documents(owner);
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        kind TEXT NOT NULL,
        doc_ids TEXT NOT NULL,
        question_ct TEXT,
        model TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS receipts_owner ON receipts(owner);
    `);
  }

  listDocs(owner: string): DocumentRow[] {
    return this.db
      .prepare('SELECT * FROM documents WHERE owner = ? ORDER BY created_at')
      .all(owner) as unknown as DocumentRow[];
  }

  ownedIds(owner: string, ids: string[]): Set<string> {
    const mine = this.db.prepare('SELECT id FROM documents WHERE owner = ?').all(owner) as {
      id: string;
    }[];
    const set = new Set(mine.map((r) => r.id));
    return new Set(ids.filter((id) => set.has(id)));
  }

  insertDoc(row: DocumentRow) {
    this.db
      .prepare(
        'INSERT INTO documents (id, owner, category, title_ct, body_ct, body_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(row.id, row.owner, row.category, row.title_ct, row.body_ct, row.body_bytes, row.created_at);
  }

  deleteDoc(owner: string, id: string): boolean {
    const res = this.db.prepare('DELETE FROM documents WHERE owner = ? AND id = ?').run(owner, id);
    return Number(res.changes) > 0;
  }

  deleteAll(owner: string) {
    this.db.prepare('DELETE FROM documents WHERE owner = ?').run(owner);
    this.db.prepare('DELETE FROM receipts WHERE owner = ?').run(owner);
  }

  /** Operator view: every row in the store, across all users. */
  allDocs(limit = 200): DocumentRow[] {
    return this.db
      .prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT ?')
      .all(limit) as unknown as DocumentRow[];
  }

  getDoc(id: string): DocumentRow | undefined {
    return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as unknown as
      | DocumentRow
      | undefined;
  }

  insertReceipt(row: ReceiptRow) {
    this.db
      .prepare(
        'INSERT INTO receipts (id, owner, kind, doc_ids, question_ct, model, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        row.id,
        row.owner,
        row.kind,
        row.doc_ids,
        row.question_ct,
        row.model,
        row.note,
        row.created_at,
      );
  }

  listReceipts(owner: string): ReceiptRow[] {
    return this.db
      .prepare('SELECT * FROM receipts WHERE owner = ? ORDER BY created_at DESC LIMIT 100')
      .all(owner) as unknown as ReceiptRow[];
  }
}
