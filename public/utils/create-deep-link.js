/**
 * Modul: Anlege-Direktlink `?new`
 *
 * Die Shortcuts des installierten Symbols (manifest.json, langer Druck auf das
 * App-Icon unter Android) oeffnen eine Seite UND ihre Primaeraktion: „Neuer
 * Termin" ist `/calendar?new`, „Neue Aufgabe" `/tasks?new`. Ein Manifest kann
 * nur Adressen nennen, keinen Klick - deshalb traegt die Adresse den Wunsch,
 * und der Router loest ihn nach der ersten Navigation genau so aus wie der
 * Kurzbefehl `n` und der Abschnitt „Neu anlegen" der Suche: `triggerPageFab()`.
 *
 * Der Parameter wird VOR dem Ausloesen aus der Adresse genommen (replaceState):
 * Neuladen, Zurueck oder ein geteilter Link oeffnen den Dialog nicht ein
 * zweites Mal. Wert egal (`?new`, `?new=1`) - die Anwesenheit zaehlt.
 */

export const CREATE_PARAM = 'new';

/**
 * Nimmt `?new` aus der Adresse und meldet, ob er da war.
 *
 * @param {{ pathname: string, search: string, hash: string }} loc
 * @param {{ state: any, replaceState: (data: any, unused: string, url: string) => void }} hist
 * @returns {boolean} ob die Adresse den Anlege-Wunsch trug
 */
export function takeCreateDeepLink(loc, hist) {
  const params = new URLSearchParams(loc.search);
  if (!params.has(CREATE_PARAM)) return false;
  params.delete(CREATE_PARAM);
  const rest = params.toString();
  hist.replaceState(hist.state, '', `${loc.pathname}${rest ? `?${rest}` : ''}${loc.hash || ''}`);
  return true;
}
