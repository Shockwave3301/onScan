/**
 * Type-checking smoke test — this file is compiled but never executed.
 * `npm run typecheck` will verify these assignments are valid.
 */
import onScan, { OnScanOptions, ScanError, ScanEventDetail } from '../onscan';

// attachTo with options
const opts: OnScanOptions = {
    onScan(sScanned: string, iQty: number) {},
    onScanError(oDebug: ScanError) {},
    onKeyDetect(iKeyCode: number, oEvent: KeyboardEvent) {},
    onKeyProcess(sChar: string, oEvent: KeyboardEvent) {},
    onPaste(sPasted: string, oEvent: ClipboardEvent) {},
    keyCodeMapper(oEvent: KeyboardEvent) { return oEvent.key; },
    onScanButtonLongPress() {},
    scanButtonKeyCode: 113,
    scanButtonLongPressTime: 500,
    timeBeforeScanTest: 100,
    avgTimeByChar: 30,
    minLength: 6,
    suffixKeyCodes: [9, 13],
    prefixKeyCodes: [],
    ignoreIfFocusOn: false,
    stopPropagation: false,
    preventDefault: false,
    captureEvents: false,
    reactToKeydown: true,
    reactToPaste: false,
    singleScanQty: 1,
};

// ignoreIfFocusOn variants
const _a: OnScanOptions = { ignoreIfFocusOn: 'input' };
const _b: OnScanOptions = { ignoreIfFocusOn: document.body };
const _c: OnScanOptions = { ignoreIfFocusOn: ['input', document.body] };
const _d: OnScanOptions = { ignoreIfFocusOn: false };

// public API
onScan.attachTo(document.body, opts);
onScan.setOptions(document.body, { minLength: 4 });
const currentOpts: OnScanOptions = onScan.getOptions(document.body);
const char: string | null = onScan.decodeKeyEvent(new KeyboardEvent('keydown', { key: 'a' }));
onScan.simulate(document.body, 'ABC123');
onScan.simulate(document.body, [65, 66, 67]);
onScan.simulate(document.body, [{ key: 'A', keyCode: 65, shiftKey: true }]);
const inProgress: boolean = onScan.isScanInProgressFor(document.body);
const attached: boolean = onScan.isAttachedTo(document.body);
onScan.detachFrom(document.body);

// event detail types
const detail: ScanEventDetail = { scanCode: 'ABC', qty: 1 };
