/**
 * CRUD operations for the content library persisted in memory/content-library.json.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ContentLibraryEntry } from '../schemas';

const LIBRARY_PATH = path.join(process.cwd(), 'memory', 'content-library.json');

export function loadLibrary(): ContentLibraryEntry[] {
  if (!fs.existsSync(LIBRARY_PATH)) return [];
  const raw = fs.readFileSync(LIBRARY_PATH, 'utf-8');
  return JSON.parse(raw) as ContentLibraryEntry[];
}

export function saveLibrary(entries: ContentLibraryEntry[]): void {
  fs.writeFileSync(LIBRARY_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

export function addEntry(entry: ContentLibraryEntry): void {
  const entries = loadLibrary();
  // Replace if same slug already exists (idempotent re-publish)
  const idx = entries.findIndex((e) => e.slug === entry.slug);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  saveLibrary(entries);
}

export function slugExists(slug: string): boolean {
  return loadLibrary().some((e) => e.slug === slug);
}
