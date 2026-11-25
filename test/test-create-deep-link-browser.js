/**
 * Modul: Manifest-Shortcuts im Browser - Browser-Sonde
 * Zweck: Die Shortcuts des installierten Symbols (public/manifest.json) sind
 *        nur Adressen. Diese Sonde faehrt sie wie ein Kaltstart aus dem
 *        Startbildschirm an und belegt, was dahinter passieren muss:
 *   - `/calendar?new` und `/tasks?new` oeffnen den Anlege-Dialog der Seite
 *     (utils/create-deep-link.js + triggerPageFab), und `new` ist danach aus
 *     der Adresse verschwunden - Neuladen oeffnet ihn nicht ein zweites Mal;
 *   - `/calendar?date=today` zeigt die Tagesansicht des heutigen Tags des
 *     Haushalts (dayDeepLinkDate in pages/calendar.js);
 *   - `/shopping` ohne Parameter oeffnet keinen Dialog.
 * Ausfuehren: npm run test:create-deep-link-browser (haengt an test:document-guards)
 */

import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startHarness, openPage, gotoRoute } from './document-guards-harness.js';

const MANIFEST = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'));
const shortcutUrl = (name) => {
  const hit = MANIFEST.shortcuts.find((s) => s.name === name);
  assert.ok(hit, `Shortcut „${name}" fehlt im Manifest`);
  return hit.url;
};

const OPEN_MODAL = '.modal-overlay:not([inert]) .modal-panel';

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

for (const name of ['Neuer Termin', 'Neue Aufgabe']) {
  test(`Shortcut „${name}": der Anlege-Dialog steht offen, ?new ist aus der Adresse`, async () => {
    const page = await openPage(harness, { device: 'mobile', locale: 'de' });
    try {
      const url = shortcutUrl(name);
      await gotoRoute(page, url);
      await page.waitForSelector(OPEN_MODAL, { timeout: 10000 });
      const { pathname, search } = await page.evaluate(() => ({ pathname: location.pathname, search: location.search }));
      assert.equal(pathname, new URL(url, 'https://x.invalid').pathname);
      assert.ok(!new URLSearchParams(search).has('new'), `?new steht noch in der Adresse: ${search}`);
    } finally {
      await page.close();
    }
  });
}

test('Shortcut „Kalender heute": Tagesansicht am heutigen Tag des Haushalts', async () => {
  const page = await openPage(harness, { device: 'mobile', locale: 'de' });
  try {
    await gotoRoute(page, shortcutUrl('Kalender heute'));
    await page.waitForSelector('#day-col[data-date]', { timeout: 10000 });
    const { shown, today, labelledBy } = await page.evaluate(async () => {
      const { todayKey } = await import('/utils/timezone.js');
      return {
        shown: document.querySelector('#day-col')?.getAttribute('data-date'),
        today: todayKey(),
        labelledBy: document.querySelector('#cal-body')?.getAttribute('aria-labelledby'),
      };
    });
    assert.equal(shown, today);
    assert.equal(labelledBy, 'cal-view-tab-day');
    assert.equal(await page.$(OPEN_MODAL), null, 'ohne ?new darf kein Dialog aufgehen');
  } finally {
    await page.close();
  }
});

test('Shortcut „Einkaufsliste": die Liste, kein Dialog', async () => {
  const page = await openPage(harness, { device: 'mobile', locale: 'de' });
  try {
    await gotoRoute(page, shortcutUrl('Einkaufsliste'));
    assert.equal(await page.evaluate(() => location.pathname), '/shopping');
    assert.equal(await page.$(OPEN_MODAL), null);
  } finally {
    await page.close();
  }
});
