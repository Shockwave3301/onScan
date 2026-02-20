import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import onScan from '../src/onscan.js';

describe('onScan', () => {
    beforeEach(() => {
        if (onScan.isAttachedTo(document)) {
            onScan.detachFrom(document);
        }
    });

    afterEach(() => {
        if (onScan.isAttachedTo(document)) {
            onScan.detachFrom(document);
        }
    });

    describe('attachTo / detachFrom', () => {
        it('should attach to a DOM element', () => {
            onScan.attachTo(document);
            expect(onScan.isAttachedTo(document)).toBe(true);
        });

        it('should detach from a DOM element', () => {
            onScan.attachTo(document);
            onScan.detachFrom(document);
            expect(onScan.isAttachedTo(document)).toBe(false);
        });

        it('should throw if attached twice', () => {
            onScan.attachTo(document);
            expect(() => onScan.attachTo(document)).toThrow();
        });
    });

    describe('getOptions / setOptions', () => {
        it('should return default options', () => {
            onScan.attachTo(document);
            const opts = onScan.getOptions(document);
            expect(opts.minLength).toBe(6);
            expect(opts.avgTimeByChar).toBe(30);
            expect(opts.suffixKeyCodes).toEqual([9, 13]);
        });

        it('should merge custom options', () => {
            onScan.attachTo(document, { minLength: 3 });
            expect(onScan.getOptions(document).minLength).toBe(3);
        });

        it('should update options via setOptions', () => {
            onScan.attachTo(document);
            onScan.setOptions(document, { minLength: 10 });
            expect(onScan.getOptions(document).minLength).toBe(10);
        });
    });

    describe('simulate', () => {
        it('should trigger onScan callback with a string code', () => {
            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 3,
                onScan: (code, qty) => {
                    scannedCode = code;
                },
            });
            onScan.simulate(document, 'ABC123');
            expect(scannedCode).toBe('ABC123');
        });

        it('should dispatch key events on the target element, not document', () => {
            const div = document.createElement('div');
            document.body.appendChild(div);
            let scannedCode = null;
            onScan.attachTo(div, {
                minLength: 3,
                suffixKeyCodes: [13],
                onScan: (code) => {
                    scannedCode = code;
                },
            });

            // Simulate with array of event objects including a suffix
            onScan.simulate(div, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);

            expect(scannedCode).toBe('ABC');
            onScan.detachFrom(div);
            document.body.removeChild(div);
        });

        it('should trigger scanError for codes shorter than minLength', () => {
            let errorData = null;
            onScan.attachTo(document, {
                minLength: 10,
                onScanError: (err) => {
                    errorData = err;
                },
            });
            onScan.simulate(document, 'SHORT');
            expect(errorData).not.toBeNull();
            expect(errorData.message).toContain('shorter');
        });
    });

    describe('decodeKeyEvent', () => {
        // Helper to create a minimal keyboard event-like object
        function keyEvt(props) {
            return Object.assign({ keyCode: 0, which: 0, key: '', shiftKey: false }, props);
        }

        it('should decode regular letters via event.key', () => {
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'a' }))).toBe('a');
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Z' }))).toBe('Z');
        });

        it('should decode numbers via event.key', () => {
            expect(onScan.decodeKeyEvent(keyEvt({ key: '0' }))).toBe('0');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '9' }))).toBe('9');
        });

        it('should decode hyphens, colons, and brackets (issue #19, #31)', () => {
            expect(onScan.decodeKeyEvent(keyEvt({ key: '-' }))).toBe('-');
            expect(onScan.decodeKeyEvent(keyEvt({ key: ':' }))).toBe(':');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '[' }))).toBe('[');
            expect(onScan.decodeKeyEvent(keyEvt({ key: ']' }))).toBe(']');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '{' }))).toBe('{');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '}' }))).toBe('}');
        });

        it('should decode shifted characters (issue #43)', () => {
            expect(onScan.decodeKeyEvent(keyEvt({ key: '?', shiftKey: true }))).toBe('?');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '!', shiftKey: true }))).toBe('!');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '@', shiftKey: true }))).toBe('@');
        });

        it('should decode other punctuation and symbols', () => {
            expect(onScan.decodeKeyEvent(keyEvt({ key: '.' }))).toBe('.');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '/' }))).toBe('/');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '=' }))).toBe('=');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '+' }))).toBe('+');
            expect(onScan.decodeKeyEvent(keyEvt({ key: '"' }))).toBe('"');
        });

        it('should return null for modifier keys', () => {
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Shift' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Control' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Alt' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Meta' }))).toBeNull();
        });

        it('should return null for control/navigation keys', () => {
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Enter' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Tab' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Escape' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'ArrowLeft' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Backspace' }))).toBeNull();
            expect(onScan.decodeKeyEvent(keyEvt({ key: 'Dead' }))).toBeNull();
        });

        it('should fall back to keyCode for numpad when event.key is missing', () => {
            for (let i = 0; i <= 9; i++) {
                const result = onScan.decodeKeyEvent({ keyCode: 96 + i, which: 96 + i });
                expect(result).toBe(String(i));
                expect(typeof result).toBe('string');
            }
        });

        it('should fall back to keyCode for letters when event.key is missing', () => {
            const result = onScan.decodeKeyEvent({ keyCode: 65, which: 65 });
            expect(result).toBe('a');
            const shifted = onScan.decodeKeyEvent({ keyCode: 65, which: 65, shiftKey: true });
            expect(shifted).toBe('A');
        });

        it('should return null for unknown keyCodes when event.key is missing', () => {
            expect(onScan.decodeKeyEvent({ keyCode: 16, which: 16 })).toBeNull();
            expect(onScan.decodeKeyEvent({ keyCode: 17, which: 17 })).toBeNull();
        });
    });

    describe('paste handling', () => {
        it('should detect scan from paste event', () => {
            let scannedCode = null;
            onScan.attachTo(document, {
                reactToPaste: true,
                reactToKeydown: false,
                minLength: 3,
                onScan: (code) => {
                    scannedCode = code;
                },
            });

            const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
            pasteEvent.clipboardData = { getData: () => 'BARCODE123' };
            document.dispatchEvent(pasteEvent);

            expect(scannedCode).toBe('BARCODE123');
        });
    });

    describe('ignoreIfFocusOn', () => {
        // Helper: simulate keydown events to trigger scan detection (unlike string simulate which bypasses keydown)
        function simulateKeydowns(element, keys) {
            keys.forEach((k) => {
                const evt = new KeyboardEvent('keydown', typeof k === 'object' ? k : { keyCode: k });
                element.dispatchEvent(evt);
            });
        }

        it('should ignore scans when a DOM element has focus', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 3,
                suffixKeyCodes: [13],
                ignoreIfFocusOn: input,
                onScan: (code) => { scannedCode = code; },
            });
            simulateKeydowns(document, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);
            expect(scannedCode).toBeNull();

            onScan.detachFrom(document);
            document.body.removeChild(input);
        });

        it('should ignore scans when a CSS selector matches focused element', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 3,
                suffixKeyCodes: [13],
                ignoreIfFocusOn: 'input',
                onScan: (code) => { scannedCode = code; },
            });
            simulateKeydowns(document, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);
            expect(scannedCode).toBeNull();

            onScan.detachFrom(document);
            document.body.removeChild(input);
        });

        it('should ignore scans with an array of mixed selectors and elements', () => {
            const input = document.createElement('input');
            const textarea = document.createElement('textarea');
            document.body.appendChild(input);
            document.body.appendChild(textarea);
            textarea.focus();

            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 3,
                suffixKeyCodes: [13],
                ignoreIfFocusOn: [input, 'textarea'],
                onScan: (code) => { scannedCode = code; },
            });
            simulateKeydowns(document, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);
            expect(scannedCode).toBeNull();

            onScan.detachFrom(document);
            document.body.removeChild(input);
            document.body.removeChild(textarea);
        });
    });

    describe('isAttachedTo', () => {
        it('should return false for unattached elements', () => {
            expect(onScan.isAttachedTo(document)).toBe(false);
        });
    });
});
