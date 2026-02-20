# BACKLOG.md

Work plan for modernizing the onScan.js fork. Items are grouped into phases.
Each task has a checkbox for tracking completion.

---

## Phase 1: Tooling & Project Setup

These are prerequisites — set up the development infrastructure before touching library code.

- [x] **1.1** Add `eslint` and a base config; fix or suppress existing violations
- [x] **1.2** Add `prettier` with a shared config
- [x] **1.3** Add a bundler (e.g. Rollup or esbuild) that produces UMD, CJS, and ESM outputs from a single source
- [x] **1.4** Auto-generate `onscan.min.js` as part of the build instead of maintaining it manually
- [x] **1.5** Add `scripts` to `package.json`: `build`, `lint`, `format`, `test`, `dev`
- [x] **1.6** Add a test framework (e.g. Vitest or Jest with jsdom) and a skeleton test file
- [x] **1.7** Set up CI (GitHub Actions) to run lint + tests on push/PR

---

## Phase 2: Critical Bug Fixes

Fix broken behavior that affects current users. No API changes — drop-in safe.

- [x] **2.1** Fix `_handlePaste`: replace global `event` with the `e` parameter on lines 461 and 474
- [x] **2.2** Fix `simulate()`: dispatch events on `oDomElement` instead of hardcoded `document` (line 213)
- [x] **2.3** Fix `_handleKeyDown`: guard `onKeyProcess` call so `character` is not `undefined` when a prefix/suffix key was matched (line 448)
- [x] **2.4** Fix `decodeKeyEvent`: return a string `'0'`–`'9'` for numpad keys instead of a number (line 181)
- [x] **2.5** Fix `ignoreIfFocusOn`: handle DOM element values (not just CSS selector strings) without crashing on `.matches()` (line 257)
- [x] **2.6** Clear any pending `testTimer` in `attachTo` / `detachFrom` to prevent stale timers firing after detach

---

## Phase 3: Key Decoding Overhaul

Address the root cause of issues #15, #19, #31, #40, #43 — the allowlisted keyCode range silently drops valid characters.

- [x] **3.1** Rewrite `decodeKeyEvent` to use `event.key` as the primary source instead of keyCode ranges
- [x] **3.2** Filter out only control/modifier keys (`Shift`, `Control`, `Alt`, `Meta`, `Dead`, etc.) and keys with `.key` length > 1 that aren't printable
- [x] **3.3** Remove `_getNormalizedKeyNum` (uses deprecated `e.which` / `e.keyCode`) or keep only as an internal fallback for `suffixKeyCodes`/`prefixKeyCodes`
- [x] **3.4** Support hyphens, colons, brackets, and other punctuation that scanners commonly send
- [x] **3.5** Add unit tests for the new decoder covering: letters, numbers, numpad, shifted characters, punctuation, modifier-only keys, and Android Chrome edge cases

---

## Phase 4: Modernize JavaScript

Convert from ES5 to modern JS. This is a breaking change for IE — document the new browser baseline.

- [x] **4.1** Replace all `var` with `const` / `let`
- [x] **4.2** Replace `_mergeOptions` with `Object.assign` or object spread
- [x] **4.3** Replace DOM expando (`oDomElement.scannerDetectionData`) with a `WeakMap` keyed by element
- [x] **4.4** Convert UMD wrapper to ES module source; let the bundler (Phase 1.3) produce UMD/CJS outputs *(done in Phase 1.3)*
- [x] **4.5** Use arrow functions where `this` binding to the DOM element is not needed
- [ ] **4.6** Drop IE9+ support claim from README; document baseline as modern evergreen browsers

---

## Phase 5: TypeScript Support

Address issues #36 and #45.

- [ ] **5.1** Write a `onscan.d.ts` type definition file covering all public methods and the options object
- [ ] **5.2** Type `ignoreIfFocusOn` correctly as `string | Element | Array<string | Element> | false`
- [ ] **5.3** Add the `types` field to `package.json`
- [ ] **5.4** Add a CI step that validates the types compile cleanly

---

## Phase 6: Documentation Fixes

Address issues #11, #42, and general confusion.

- [ ] **6.1** Fix README `scan` event listener example: show `event.detail.scanCode` / `event.detail.qty` instead of wrong `(sScancode, iQuantity)` callback signature
- [ ] **6.2** Clarify the difference between callback-style (`onScan` option) and event-style (`addEventListener('scan', ...)`) APIs — they have different signatures
- [ ] **6.3** Add a "Framework Integration" section with brief Vue/React/Angular lifecycle examples (issues #29, #37)
- [ ] **6.4** Add a "Device Configuration" section noting that some scanners need "keyboard wedge" or "send characters as events" mode enabled (issues #18, #22)
- [ ] **6.5** Document the `keyCodeMapper` override pattern for non-standard characters prominently, not just in the "Decoding key codes" section

---

## Phase 7: Feature Additions

New capabilities requested by the community.

- [ ] **7.1** Add option to `preventDefault` on all keydown events *during* scan accumulation (not just on success), so scanned characters don't leak into focused inputs (issue #25)
- [ ] **7.2** Add a `scanLock` / debounce option that blocks new scans until the current `onScan` callback resolves, including async/Promise support (issue #21)
- [ ] **7.3** Include per-character timing data in the `scanError` debug object for easier threshold tuning (issue #27-related)
- [ ] **7.4** Add a `maxLength` option to cap scan code length

---

## Phase 8: Playground / Demo

- [ ] **8.1** Extract inline `<script>` from `index.html` into a separate JS file
- [ ] **8.2** Update or remove Bootstrap 4 CDN dependency
- [ ] **8.3** Add controls for any new options introduced in Phase 7
