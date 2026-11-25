/**
 * Modul: „Nur meine Termine" am Kalender-Feed - Browser-Sonde
 * Zweck: Der Schalter in Einstellungen → Kalender → Feed speichert nichts auf
 *        dem Server; er stellt um, WELCHE Adresse dort steht, kopiert und
 *        abonniert wird (`?scope=mine`, buildFeed in server/services/ics-export.js).
 *        Die Sonde belegt die ganze Kette im Browser:
 *   - an: das Adressfeld und der Abonnieren-Link (webcal://) tragen `scope=mine`,
 *     und genau diese Adresse liefert nur eigene und unzugewiesene Termine;
 *   - die Wahl ueberlebt das Neuladen (das Geraet merkt sie sich);
 *   - aus: wieder die Adresse ohne `scope`.
 * Ausfuehren: npm run test:feed-scope-browser (haengt an test:document-guards)
 */

import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness, openPage, gotoRoute } from './document-guards-harness.js';

const SHEET = '/settings/modules/calendar?section=personal-feeds';

let harness;

before(async () => {
  harness = await startHarness();
});

beforeEach(async () => {
  await harness.reset();
});

after(async () => {
  await harness?.close();
});

/** Feed einschalten und drei Termine anlegen: meiner, fremder, ohne Zuweisung. */
async function seed(page) {
  return page.evaluate(async () => {
    const { api } = await import('/api.js');
    const { user: me } = await api.get('/auth/me');
    const users = (await api.get('/auth/users')).data ?? [];
    const other = users.find((u) => u.id !== me.id && !u.deactivated_at);
    const create = (title, ids) => api.post('/calendar', {
      title,
      start_datetime: '2048-05-02T09:00:00',
      end_datetime: '2048-05-02T10:00:00',
      assigned_to: ids,
    });
    await create('ScopeProbeMine', [me.id]);
    if (other) await create('ScopeProbeForeign', [other.id]);
    await create('ScopeProbeNobody', null);
    await api.post('/calendar/feed/regenerate');
    return { hasOther: Boolean(other) };
  });
}

const readUrls = (page) => page.evaluate(() => ({
  field: /** @type {HTMLInputElement} */ (document.querySelector('#calendar-feed-url'))?.value ?? '',
  subscribe: document.querySelector('[data-feed-subscribe]')?.getAttribute('href') ?? '',
}));

test('„Nur meine Termine": Adresse, Abo-Link und Feed-Inhalt folgen dem Schalter', async () => {
  const page = await openPage(harness, { device: 'mobile', locale: 'de' });
  try {
    await page.evaluate(() => localStorage.removeItem('yuvomi-calendar-feed-scope-mine'));
    const { hasOther } = await seed(page);
    await gotoRoute(page, SHEET);
    await page.waitForSelector('#feed-scope-mine', { timeout: 15000 });

    const off = await readUrls(page);
    assert.ok(off.field && !off.field.includes('scope='), `ohne Schalter keine scope-Adresse: ${off.field}`);

    await page.click('#feed-scope-mine');
    const on = await readUrls(page);
    assert.equal(new URL(on.field).searchParams.get('scope'), 'mine', on.field);
    assert.ok(on.subscribe.startsWith('webcal://'), on.subscribe);
    assert.ok(on.subscribe.includes('scope=mine'), on.subscribe);

    const ics = await page.evaluate(async (url) => (await fetch(url)).text(), on.field);
    assert.ok(ics.includes('SUMMARY:ScopeProbeMine'), 'eigener Termin fehlt');
    assert.ok(ics.includes('SUMMARY:ScopeProbeNobody'), 'unzugewiesener Termin fehlt');
    assert.ok(hasOther, 'der Seed braucht eine zweite Person, sonst prueft die Sonde den Filter nicht');
    assert.ok(!ics.includes('SUMMARY:ScopeProbeForeign'), 'fremder Termin im Feed "nur meine"');

    await gotoRoute(page, SHEET);
    await page.waitForSelector('#feed-scope-mine', { timeout: 15000 });
    assert.equal(await page.$eval('#feed-scope-mine', (el) => /** @type {HTMLInputElement} */ (el).checked), true,
      'die Wahl muss das Neuladen ueberleben');
    assert.ok((await readUrls(page)).field.includes('scope=mine'));

    await page.click('#feed-scope-mine');
    const back = await readUrls(page);
    assert.ok(!back.field.includes('scope='), back.field);
    assert.ok(!back.subscribe.includes('scope='), back.subscribe);
  } finally {
    await page.close();
  }
});
