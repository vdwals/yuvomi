/**
 * Test: Anlege-Direktlink `?new` (public/utils/create-deep-link.js)
 * Zweck: Die Manifest-Shortcuts „Neuer Termin"/„Neue Aufgabe" oeffnen
 *        `/calendar?new` bzw. `/tasks?new`. Der Parameter muss erkannt und
 *        aus der Adresse genommen werden, ohne die anderen anzufassen - sonst
 *        oeffnete jedes Neuladen den Dialog wieder.
 * Ausführen: node --test test/test-create-deep-link.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeCreateDeepLink, CREATE_PARAM } from '../public/utils/create-deep-link.js';

function fakeHistory() {
  return {
    state: { marker: 1 },
    calls: [],
    replaceState(data, unused, url) { this.calls.push({ data, unused, url }); },
  };
}

test('ohne Parameter: nichts ausgeloest, Adresse unberuehrt', () => {
  const hist = fakeHistory();
  assert.equal(takeCreateDeepLink({ pathname: '/calendar', search: '?date=2026-11-24', hash: '' }, hist), false);
  assert.equal(hist.calls.length, 0);
});

test('?new: erkannt und entfernt, history.state bleibt', () => {
  const hist = fakeHistory();
  assert.equal(takeCreateDeepLink({ pathname: '/calendar', search: '?new', hash: '' }, hist), true);
  assert.deepEqual(hist.calls, [{ data: { marker: 1 }, unused: '', url: '/calendar' }]);
});

test('?new=1 zwischen anderen Parametern: nur er geht, Hash bleibt', () => {
  const hist = fakeHistory();
  assert.equal(takeCreateDeepLink({ pathname: '/tasks', search: '?a=1&new=1&b=2', hash: '#x' }, hist), true);
  assert.equal(hist.calls[0].url, '/tasks?a=1&b=2#x');
});

test('der Parametername ist `new`', () => {
  assert.equal(CREATE_PARAM, 'new');
});
