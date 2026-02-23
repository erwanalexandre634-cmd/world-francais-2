import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

let solutions = null;
let accepted = null;

/**
 * Charge et renvoie la liste des mots solutions (tableau).
 */
export function getSolutions() {
  if (!solutions) {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'mots-solutions.txt'), 'utf-8');
    solutions = raw
      .split('\n')
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length === 5);
  }
  return solutions;
}

/**
 * Charge et renvoie le set de tous les mots acceptés (solutions incluses).
 */
export function getAccepted() {
  if (!accepted) {
    const solList = getSolutions();
    const raw = fs.readFileSync(path.join(DATA_DIR, 'mots-acceptes.txt'), 'utf-8');
    const accList = raw
      .split('\n')
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length === 5);

    accepted = new Set([...solList, ...accList]);
  }
  return accepted;
}
