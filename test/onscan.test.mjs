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
        it('should return a string for numpad keys', () => {
            onScan.attachTo(document);
            for (let i = 0; i <= 9; i++) {
                const result = onScan.decodeKeyEvent({ keyCode: 96 + i, which: 96 + i });
                expect(result).toBe(String(i));
                expect(typeof result).toBe('string');
            }
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

    describe('isAttachedTo', () => {
        it('should return false for unattached elements', () => {
            expect(onScan.isAttachedTo(document)).toBe(false);
        });
    });
});
