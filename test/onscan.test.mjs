import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

    // Helper: simulate keydown events to trigger scan detection
    function simulateKeydowns(element, keys) {
        keys.forEach((k) => {
            const evt = new KeyboardEvent('keydown', typeof k === 'object' ? k : { keyCode: k });
            element.dispatchEvent(evt);
        });
    }

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

        it('should silently do nothing when detaching an unattached element', () => {
            expect(() => onScan.detachFrom(document)).not.toThrow();
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

        it('should throw from getOptions on unattached element', () => {
            expect(() => onScan.getOptions(document)).toThrow(/not initialized/);
        });

        it('should throw from setOptions on unattached element', () => {
            expect(() => onScan.setOptions(document, { minLength: 5 })).toThrow(/not initialized/);
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

    describe('prefixKeyCodes', () => {
        it('should strip prefix key codes from the scanned result', () => {
            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 3,
                prefixKeyCodes: [120],  // F9 as prefix
                suffixKeyCodes: [13],
                onScan: (code) => { scannedCode = code; },
            });
            simulateKeydowns(document, [
                { keyCode: 120, key: 'F9' },  // prefix — should be stripped
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },  // suffix — triggers scan
            ]);
            expect(scannedCode).toBe('ABC');
        });
    });

    describe('scanButtonKeyCode / onScanButtonLongPress', () => {
        it('should ignore scan button key code in scanned output', () => {
            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 3,
                scanButtonKeyCode: 0xE0,
                suffixKeyCodes: [13],
                onScan: (code) => { scannedCode = code; },
            });
            simulateKeydowns(document, [
                { keyCode: 0xE0, key: 'Unidentified' },  // scanner button — should be ignored
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);
            expect(scannedCode).toBe('ABC');
        });

        it('should fire onScanButtonLongPress after timeout', () => {
            vi.useFakeTimers();
            const longPressCb = vi.fn();
            onScan.attachTo(document, {
                scanButtonKeyCode: 0xE0,
                scanButtonLongPressTime: 500,
                onScanButtonLongPress: longPressCb,
            });

            simulateKeydowns(document, [{ keyCode: 0xE0, key: 'Unidentified' }]);
            expect(longPressCb).not.toHaveBeenCalled();

            vi.advanceTimersByTime(500);
            expect(longPressCb).toHaveBeenCalledTimes(1);

            onScan.detachFrom(document);
            vi.useRealTimers();
        });

        it('should cancel long press timer on keyup', () => {
            vi.useFakeTimers();
            const longPressCb = vi.fn();
            onScan.attachTo(document, {
                scanButtonKeyCode: 0xE0,
                scanButtonLongPressTime: 500,
                onScanButtonLongPress: longPressCb,
            });

            simulateKeydowns(document, [{ keyCode: 0xE0, key: 'Unidentified' }]);
            // Release the button before the threshold
            document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 0xE0 }));

            vi.advanceTimersByTime(600);
            expect(longPressCb).not.toHaveBeenCalled();

            onScan.detachFrom(document);
            vi.useRealTimers();
        });
    });

    describe('stopPropagation / preventDefault', () => {
        it('should call stopImmediatePropagation when stopPropagation is true', () => {
            onScan.attachTo(document, {
                minLength: 3,
                stopPropagation: true,
                suffixKeyCodes: [13],
            });

            const evt = new KeyboardEvent('keydown', { keyCode: 65, key: 'A', bubbles: true, cancelable: true });
            const spy = vi.spyOn(evt, 'stopImmediatePropagation');
            document.dispatchEvent(evt);
            expect(spy).toHaveBeenCalled();
        });

        it('should call preventDefault when preventDefault option is true', () => {
            onScan.attachTo(document, {
                minLength: 3,
                preventDefault: true,
                suffixKeyCodes: [13],
            });

            const evt = new KeyboardEvent('keydown', { keyCode: 65, key: 'A', bubbles: true, cancelable: true });
            const spy = vi.spyOn(evt, 'preventDefault');
            document.dispatchEvent(evt);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('keyCodeMapper', () => {
        it('should use custom keyCodeMapper when provided', () => {
            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 3,
                suffixKeyCodes: [13],
                keyCodeMapper: (event) => {
                    // Custom mapper: always return uppercase X
                    if (event.key && event.key.length === 1) return 'X';
                    return null;
                },
                onScan: (code) => { scannedCode = code; },
            });

            simulateKeydowns(document, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);

            expect(scannedCode).toBe('XXX');
        });

        it('should skip events when keyCodeMapper returns null', () => {
            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 2,
                suffixKeyCodes: [13],
                keyCodeMapper: (event) => {
                    // Skip B, keep everything else
                    if (event.key === 'B') return null;
                    return onScan.decodeKeyEvent(event);
                },
                onScan: (code) => { scannedCode = code; },
            });

            simulateKeydowns(document, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);

            expect(scannedCode).toBe('AC');
        });
    });

    describe('isScanInProgressFor', () => {
        it('should return false when no scan is in progress', () => {
            onScan.attachTo(document);
            expect(onScan.isScanInProgressFor(document)).toBe(false);
        });

        it('should return true during an active scan sequence', () => {
            onScan.attachTo(document, {
                minLength: 6,
                suffixKeyCodes: [13],
            });

            // Send a single character to start a scan sequence
            simulateKeydowns(document, [{ keyCode: 65, key: 'A' }]);
            expect(onScan.isScanInProgressFor(document)).toBe(true);
        });

        it('should return false for unattached elements', () => {
            expect(onScan.isScanInProgressFor(document)).toBe(false);
        });
    });

    describe('onKeyDetect', () => {
        it('should fire onKeyDetect for every key event', () => {
            const detected = [];
            onScan.attachTo(document, {
                minLength: 3,
                suffixKeyCodes: [13],
                onKeyDetect: (keyCode, event) => {
                    detected.push(keyCode);
                },
            });

            simulateKeydowns(document, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
            ]);

            expect(detected).toEqual([65, 66]);
        });

        it('should cancel event processing when onKeyDetect returns false', () => {
            let scannedCode = null;
            onScan.attachTo(document, {
                minLength: 2,
                suffixKeyCodes: [13],
                onKeyDetect: (keyCode) => {
                    // Block key code 66 (B)
                    if (keyCode === 66) return false;
                },
                onScan: (code) => { scannedCode = code; },
            });

            simulateKeydowns(document, [
                { keyCode: 65, key: 'A' },
                { keyCode: 66, key: 'B' },
                { keyCode: 67, key: 'C' },
                { keyCode: 13, key: 'Enter' },
            ]);

            expect(scannedCode).toBe('AC');
        });
    });

    describe('scan event', () => {
        it('should dispatch scan CustomEvent on the DOM element', () => {
            let eventDetail = null;
            onScan.attachTo(document, { minLength: 3 });
            document.addEventListener('scan', (e) => { eventDetail = e.detail; });

            onScan.simulate(document, 'BARCODE');

            expect(eventDetail).not.toBeNull();
            expect(eventDetail.scanCode).toBe('BARCODE');
            expect(eventDetail.qty).toBe(1);
        });

        it('should dispatch scanError CustomEvent for invalid scans', () => {
            let eventDetail = null;
            onScan.attachTo(document, { minLength: 10 });
            document.addEventListener('scanError', (e) => { eventDetail = e.detail; });

            onScan.simulate(document, 'SHORT');

            expect(eventDetail).not.toBeNull();
            expect(eventDetail.message).toContain('shorter');
            expect(eventDetail.scanCode).toBe('SHORT');
        });
    });

    describe('multiple elements', () => {
        it('should support attaching to different elements independently', () => {
            const div1 = document.createElement('div');
            const div2 = document.createElement('div');
            document.body.appendChild(div1);
            document.body.appendChild(div2);

            onScan.attachTo(div1, { minLength: 3 });
            onScan.attachTo(div2, { minLength: 5 });

            expect(onScan.isAttachedTo(div1)).toBe(true);
            expect(onScan.isAttachedTo(div2)).toBe(true);
            expect(onScan.getOptions(div1).minLength).toBe(3);
            expect(onScan.getOptions(div2).minLength).toBe(5);

            onScan.detachFrom(div1);
            expect(onScan.isAttachedTo(div1)).toBe(false);
            expect(onScan.isAttachedTo(div2)).toBe(true);

            onScan.detachFrom(div2);
            document.body.removeChild(div1);
            document.body.removeChild(div2);
        });
    });
});
