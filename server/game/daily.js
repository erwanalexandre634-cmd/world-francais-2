import { getSolutions } from './words.js';

const REFERENCE_DATE = new Date('2026-02-24T00:00:00+01:00');

/**
 * Calcule le numéro du puzzle basé sur la date actuelle (timezone Europe/Paris).
 */
export function getPuzzleNumber() {
  const now = new Date();
  const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const refLocal = new Date(REFERENCE_DATE.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  const diffMs = parisNow.setHours(0, 0, 0, 0) - refLocal.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Renvoie le mot du jour.
 */
export function getMotDuJour() {
  const solutions = getSolutions();
  const puzzle = getPuzzleNumber();
  return solutions[puzzle % solutions.length];
}
