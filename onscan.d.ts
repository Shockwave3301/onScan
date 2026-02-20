export interface OnScanOptions {
    /** Callback after successful scan. */
    onScan?: (this: Element, sScanned: string, iQty: number) => void;

    /** Callback after the scan button was pressed and held down. */
    onScanButtonLongPress?: (this: Element) => void;

    /** Callback after a scanned string was dropped due to restrictions. */
    onScanError?: (this: Element, oDebug: ScanError) => void;

    /**
     * Callback after every detected key event.
     * Return `false` to cancel further processing of this event.
     */
    onKeyDetect?: (this: Element, iKeyCode: number, oEvent: KeyboardEvent) => void | false;

    /** Callback after a key event was decoded and found to be part of a potential scan code. */
    onKeyProcess?: (this: Element, sChar: string, oEvent: KeyboardEvent) => void;

    /** Callback after detecting a paste. Only fired if `reactToPaste` is `true`. */
    onPaste?: (this: Element, sPasted: string, oEvent: ClipboardEvent) => void;

    /**
     * A function to extract the character from a `keydown` event.
     * Return `null` to ignore the event.
     * @default onScan.decodeKeyEvent
     */
    keyCodeMapper?: (this: Element, oEvent: KeyboardEvent) => string | null;

    /** Key code of the scanner hardware button. @default false */
    scanButtonKeyCode?: number | false;

    /** Time in ms to hold the scan button before `onScanButtonLongPress` fires. @default 500 */
    scanButtonLongPressTime?: number;

    /** Wait duration in ms after keypress to check if scanning finished. @default 100 */
    timeBeforeScanTest?: number;

    /** Average time in ms between two characters. Used to validate scan speed. @default 30 */
    avgTimeByChar?: number;

    /** Minimum length for a scanned code. @default 6 */
    minLength?: number;

    /** Possible suffix key codes sent by the scanner after actual data. @default [9, 13] */
    suffixKeyCodes?: number[];

    /** Possible prefix key codes sent by the scanner before actual data. @default [] */
    prefixKeyCodes?: number[];

    /**
     * Ignore scans if the currently focused element matches this value.
     * Accepts a CSS selector string, a DOM element, or an array of both.
     * @default false
     */
    ignoreIfFocusOn?: string | Element | Array<string | Element> | false;

    /** Stop immediate propagation of successfully processed events. @default false */
    stopPropagation?: boolean;

    /** Prevent default action of successfully processed events. @default false */
    preventDefault?: boolean;

    /** Use capture phase for event listeners. @default false */
    captureEvents?: boolean;

    /** React to `keydown` events (keyboard-mode scanners). @default true */
    reactToKeydown?: boolean;

    /** React to `paste` events (clipboard-mode scanners). @default false */
    reactToPaste?: boolean;

    /** Quantity returned on a single successful scan. @default 1 */
    singleScanQty?: number;
}

export interface ScanError {
    message: string;
    scanCode: string;
    scanDuration: number;
    avgTimeByChar: number;
    minLength: number;
}

export interface ScanEventDetail {
    scanCode: string;
    qty: number;
}

export interface OnScanScanEvent extends CustomEvent {
    detail: ScanEventDetail;
}

export interface OnScanErrorEvent extends CustomEvent {
    detail: ScanError;
}

interface OnScan {
    /**
     * Initializes listening for scan events on the given DOM element.
     * Use `document` to capture all events.
     */
    attachTo(oDomElement: Element, oOptions?: OnScanOptions): OnScan;

    /** Removes all scanner detection logic from the given DOM element. */
    detachFrom(oDomElement: Element): void;

    /** Returns the current options for the given DOM element. */
    getOptions(oDomElement: Element): OnScanOptions;

    /** Merges new options into the existing options for the given DOM element. */
    setOptions(oDomElement: Element, oOptions: Partial<OnScanOptions>): OnScan;

    /**
     * Decodes a keyboard event into a printable character.
     * Returns `null` for modifier keys, control keys, and other non-printable keys.
     */
    decodeKeyEvent(oEvent: KeyboardEvent): string | null;

    /**
     * Simulates a scan programmatically.
     * Accepts a decoded string, an array of key codes, or an array of KeyboardEvent init objects.
     */
    simulate(oDomElement: Element, mStringOrArray: string | Array<number | KeyboardEventInit>): OnScan;

    /** Returns `true` if the scanner is currently in the middle of a scan sequence. */
    isScanInProgressFor(oDomElement: Element): boolean;

    /** Returns `true` if onScan is attached to the given DOM element. */
    isAttachedTo(oDomElement: Element): boolean;
}

declare const onScan: OnScan;
export default onScan;
