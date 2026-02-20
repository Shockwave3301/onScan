# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

onScan.js is a framework-agnostic JavaScript library for detecting hardware barcode scanner input in web browsers. It distinguishes scanner input from regular keyboard typing by measuring input speed and looking for prefix/suffix characters. Version 1.5.2, published on npm as `onscan.js`.

## Project Structure

This is a single-file library with no build system, bundler, or test framework:

- **onscan.js** — the entire library source (UMD module pattern, ~530 lines)
- **onscan.min.js** — manually maintained minified version
- **index.html** — interactive playground/demo for testing scanner configurations

There are no `npm scripts`, no build commands, no linter, and no automated tests. The playground (`index.html`) serves as the primary manual testing tool.

## Architecture

The library is a single `onScan` object exposed via UMD (CommonJS/AMD/global). All state is stored on the DOM element itself via `oDomElement.scannerDetectionData`, which holds both `options` and `vars` (timing and accumulated scan string).

Key internal flow:
1. `attachTo()` registers `keydown`, `paste`, and/or `keyup` event listeners on a DOM element based on options
2. `_handleKeyDown()` accumulates characters, checks prefix/suffix key codes, and sets a timeout (`timeBeforeScanTest`) to validate the scan
3. `_validateScanCode()` checks accumulated string against `minLength` and timing constraints (`avgTimeByChar`), then fires either `scan` or `scanError` custom events
4. The `keyCodeMapper` option (default: `decodeKeyEvent()`) converts `keydown` events to characters, filtering to key codes 48-111

Event listeners use `this` bound to the DOM element (not the `onScan` object), so internal methods reference `onScan` by name and access state via `this.scannerDetectionData`.

## Working with the Code

- To test changes, open `index.html` in a browser and use the playground UI
- `onScan.simulate(document, 'code')` can trigger scan events programmatically for testing
- When updating `onscan.js`, the minified `onscan.min.js` must also be updated manually
