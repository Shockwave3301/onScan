<p align="center">
  <img src="scanner.png" alt="onscan-next logo" width="128" />
</p>

<h1 align="center">onscan-next</h1>

<p align="center">Framework-agnostic JavaScript scan-events for hardware barcode scanners.</p>

## Quick start

1. Install via `npm install onscan-next`
2. Add the following initialization script to run on page/view load.

```javascript
import onScan from 'onscan-next';

// Enable scan events for the entire document
onScan.attachTo(document);
// Register event listener
document.addEventListener('scan', function (e) {
    alert(e.detail.qty + 'x ' + e.detail.scanCode);
});
```

## Installation

**Via a package manager:**

```bash
npm install onscan-next
# or
yarn add onscan-next
# or
pnpm add onscan-next
```

**Via CDN (no build step):**

```html
<script src="https://unpkg.com/onscan-next/dist/onscan.umd.min.js"></script>
<script>
    onScan.attachTo(document);
</script>
```

The package ships ESM, CommonJS, and UMD builds. Modern bundlers pick the right one automatically via the `exports` field; the UMD bundle exposes a global named `onScan` for direct-in-browser use.

## Demo & Playground

A demo playground is included in the package: run `npm run build` first, then load `index.html` in your browser to play around with the settings.

## Requirements

1. A hardware barcode scanner, that
    - acts as a keyboard (often called keyboard-wedge-mode), or
    - pastes the scanned codes (clipboard-mode)
2. A modern evergreen browser (Chrome, Firefox, Safari, Edge)

## Device Configuration

Most barcode scanners work out of the box, but some need to be configured first:

- **Keyboard wedge mode**: The scanner must be set to "keyboard wedge" or "HID keyboard" mode so it sends keystrokes to the browser. Some scanners default to serial or USB COM mode, which won't work.
- **Suffix character**: Many scanners can be configured to send a suffix character (like Enter, key code `13`) after each scan. This helps onscan-next detect the end of a scan reliably via the `suffixKeyCodes` option.
- **Clipboard/paste mode**: Some built-in device scanners (e.g., on Zebra or Honeywell handhelds) paste the scanned code instead of simulating keystrokes. Set `reactToPaste: true` for these devices.
- **Scan speed**: If your scanner sends characters slower than usual, increase `avgTimeByChar` (default: `30` ms) and/or `timeBeforeScanTest` (default: `100` ms).

Consult your scanner's manual for configuration barcodes or utility software.

## How it works

onscan-next attempts to distinguish between regular input and scan input by measuring input speed,
looking for certain prefix and suffix characters, etc. If a scan is detected, it triggers a custom
JavaScript event called `scan` for the DOM element specified during initialization.

There are lots of options to fine-tune detection of specific scanner models.

There are also a couple of useful extras (some requiring specific hardware):

- Passing a counter along with the scanned code
- Adding a secondary action to the hardware button of built-in scanners, if it is long pressed

## Some examples

```javascript
// Initialize with options
onScan.attachTo(document, {
    suffixKeyCodes: [13], // enter-key expected at the end of a scan
    reactToPaste: true, // Compatibility to built-in scanners in paste-mode (as opposed to keyboard-mode)
    onScan: function (code, qty) {
        // Alternative to document.addEventListener('scan')
        console.log('Scanned: ' + qty + 'x ' + code);
    },
    onKeyDetect: function (keyCode) {
        // output all potentially relevant key events - great for debugging!
        console.log('Pressed: ' + keyCode);
    },
});

// Simulate a scan programmatically - e.g. to test event handlers
onScan.simulate(document, '1234567890123');

// Simulate raw keyCodes
onScan.simulate(document, [48, 49, 50]);

// Simulate keydown events
onScan.simulate(document, [
    { keyCode: 80, key: 'P', shiftKey: true },
    { keyCode: 49, key: '1' },
]);

// Change options on-the-fly
onScan.setOptions(document, {
    singleScanQty: 5, // change the quantity to 5 for every scan
});

// Remove onscan-next from a DOM element completely
onScan.detachFrom(document);
```

## Options

The following options can be set when initializing onscan-next:

| Option                  | Default                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| onScan                  | function(code, qty){}        | Callback after successful scan. <br><br>Arguments: <br> - `code` - [string] scanned code <br> - `qty` - [integer] quantity                                                                                                                                                                                                                                                                                                                                      |
| onScanButtonLongPress   | function(){}                 | Callback after the scan button was pressed and held down for a time defined in `scanButtonLongPressThreshold`. This can only be used if the scan button behaves as a key itself and the `scanButtonKeyCode` option is set.                                                                                                                                                                                                                                      |
| onScanError             | function(debug){}           | Callback after a scanned string being dropped due to restrictions. <br><br>Arguments: <br> - `debug` - [object] plain object with various debug data                                                                                                                                                                                                                                                                                                           |
| onKeyDetect             | function(keyCode, event){}   | Callback after every detected key event. Further event processing can be canceled by returning `false` from this callback - e.g. to exclude certain key events completely. <br><br>Arguments: <br> - `keyCode` - [integer] detected key code <br> - `event` [KeyboardEvent] complete event instance                                                                                                                                                           |
| onKeyProcess            | function(char, event){}      | Callback after a key event was decoded and found to be part of a potential scan code. Keep in mind, that at this point it is not yet known whether it's a scan or not - it's just a valid character being processed and decoded. <br><br>Arguments: <br> - `char` - [string] decoded character<br> - `event` [KeyboardEvent] complete event instance                                                                                                          |
| onPaste                 | function(pasted, event){}    | Callback after detecting a paste. Only fired if `reactToPaste` is set to `true`. <br><br>Arguments: <br> - `pasted` - [string] pasted string <br> - `event` - [Event] complete event instance                                                                                                                                                                                                                                                                 |
| keyCodeMapper           | onScan.decodeKeyEvent()      | A function to extract the character from a `keydown` event. The event will be ignored if the function returns `null`. See chapter "Decoding key codes" below for more information.                                                                                                                                                                                                                                                                              |
| timeBeforeScanTest      | 100                          | Wait duration (ms) after keypress event to check if scanning finished                                                                                                                                                                                                                                                                                                                                                                                           |
| avgTimeByChar           | 30                           | Average time (ms) between 2 chars. If a scan is detected, but it took more time that [code length] \* `avgTimeByChar`, a `scanError` will be triggered.                                                                                                                                                                                                                                                                                                         |
| minLength               | 6                            | Minimum length for a scanned code. If the scan ends before reaching this length, it will trigger a `scanError` event.                                                                                                                                                                                                                                                                                                                                           |
| suffixKeyCodes          | [9,13]                       | An array with possible suffix codes sent by the scanner after the actual data. Detecting one of them means end of scanning, but they can never be part of the scanned code. Many scanners will send key code `13` (enter) as suffix by default. This can be changed in the configuration in most cases. <br><br>NOTE: KeyboardEvents with these key codes will be silenced via `event.stopImmediatePropagation()` and `event.preventDefault()`.                 |
| prefixKeyCodes          | []                           | An array with possible prefix codes sent by the scanner before the actual data. Detecting one of them means start of scanning, but they can never be part of the scanned code. Many scanners support prefix characters in their configuration.<br><br>NOTE: KeyboardEvents with these key codes will be silenced via `event.stopImmediatePropagation()` and `event.preventDefault()`.                                                                           |
| ignoreIfFocusOn         | false                        | Ignore scans if the currently focused element matches this selector. For example, if you set this option to `'input'`, scan events will not be fired if an input field is focused. You can either pass a DOMElement, a CSS selector or an array containing multiple such objects.                                                                                                                                                                            |
| scanButtonKeyCode       | false                        | Key code of the scanner hardware button (i.e. if the scanner button a acts as a key itself). Knowing this key code is important, because it is not part of the scanned code and must be ignored.                                                                                                                                                                                                                                                                |
| scanButtonLongPressTime | 500                          | Time (ms) to hold the scan button before `onScanButtonLongPress` is triggered. Only works if `scanButtonKeyCode` is set.                                                                                                                                                                                                                                                                                                                                        |
| stopPropagation         | false                        | Stop immediate propagation of events, that are processed successfully.<br><br><b>WARNING:</b> If `reactToKeydown` is true, every keyboard event, that could potentially be part of a scancode will be stopped!                                                                                                                                                                                                                                                  |
| preventDefault          | false                        | Prevent default action of events, that are processed successfully.<br><br><b>WARNING:</b> If `reactToKeydown` is true, the default of every keyboard event, that could potentially be part of a scancode will be prevented - in particular you won't be able to use the keyboard for typing!!!                                                                                                                                                                  |
| captureEvents           | false                        | Set to `true` to force all relevant events to be dispatched to onScan _before_ being dispatched to any `EventTarget` beneath it in the DOM tree. Use this if you need to cancel certain events in onScan callbacks. Technically this option is used as the third parameter in `.addEventListener(type, listener [, useCapture])` calls. The exact behavior is documented [here](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener). |
| singleScanQty           | 1                            | This is the quantity of items which gets returned on a single successful scan.                                                                                                                                                                                                                                                                                                                                                                                  |
| reactToKeydown          | true                         | Look for scan input among `keydown` events (i.e. if the scanner works in keyboard-mode).                                                                                                                                                                                                                                                                                                                                                                        |
| reactToPaste            | false                        | Look for scan input among `paste` events (i.e. if the scanner works in clipboard-mode).                                                                                                                                                                                                                                                                                                                                                                         |

## Events

| Event name          | `event.detail`                                                  | Description                                                                                                                           |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| scan                | `{ scanCode: string, qty: number }`                             | Triggered after successful scan.                                                                                                      |
| scanError           | `{ message, scanCode, scanDuration, avgTimeByChar, minLength }` | Triggered after a scanned string was dropped due to restrictions.                                                                     |
| scanButtonLongPress | —                                                               | Triggered after the scan button was pressed and held down for `scanButtonLongPressTime` ms. Only works if `scanButtonKeyCode` is set. |

These are standard `CustomEvent`s. Access the data via `event.detail`:

```javascript
document.addEventListener('scan', function (e) {
    console.log(e.detail.scanCode); // the scanned string
    console.log(e.detail.qty); // the quantity
});
document.addEventListener('scanError', function (e) {
    console.log(e.detail); // { message, scanCode, scanDuration, ... }
});
```

### Callbacks vs. events

You can also handle scans via **option callbacks** instead of (or in addition to) DOM events. Note that callbacks and events have **different signatures**:

|       | Callback (option)       | DOM Event (`addEventListener`)              |
| ----- | ----------------------- | ------------------------------------------- |
| Scan  | `onScan(scanCode, qty)` | `event.detail.scanCode`, `event.detail.qty` |
| Error | `onScanError(debugObj)` | `event.detail` (same debug object)          |

```javascript
onScan.attachTo(document, {
    // Callback style — arguments passed directly
    onScan: function(code, qty) { ... },
    onScanError: function(debug) { ... },
    onScanButtonLongPress: function() { ... },
    // These callbacks have no corresponding DOM event:
    onKeyDetect: function(keyCode, event) { ... },
    onKeyProcess: function(char, event) { ... },
    onPaste: function(pasted, event) { ... },
});
```

Note: `onKeyDetect`, `onKeyProcess`, and `onPaste` are callback-only — they do not have corresponding DOM events. They are primarily useful for debugging and finding the right configuration for a specific scanner.

## Methods

| Method              | Arguments                  | Description                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| attachTo            | DOMElement, options        | Initializes listening for scan events for given DOM element. Only events fired for this DOM element will be processed. Use `document` to process all possible events. This is the best pick in most cases. <br><br>NOTE: onscan-next can be attached to a DOM element only once. If you, for some reason, need to call `attachTo()` for a single element multiple times, you must call `detachFrom()` first. |
| detachFrom          | DOMElement                 | Removes all scanner detection logic from the given DOM element.                                                                                                                                                                                                                                                                                                                                            |
| simulate            | DOMElement, codeOrKeys     | Fires the `scan` event for the given scan code - useful to trigger listeners manually (e.g. for testing). Accepts either an already decoded string or an array with key codes or event property objects - see below for details.                                                                                                                                                                          |
| setOptions          | DOMElement, options        | Replaces only the newly sent options.                                                                                                                                                                                                                                                                                                                                                                      |
| getOptions          | DOMElement                 | Retrieves the entire options object.                                                                                                                                                                                                                                                                                                                                                                          |
| decodeKeyEvent      | Event                      | Extracts the scanned string character from a keyboard event (i.e. `keydown`)                                                                                                                                                                                                                                                                                                                               |
| isAttachedTo        | DOMElement                 | Returns `true` if onScan is attached to the given DOM element and `false` otherwise                                                                                                                                                                                                                                                                                                                        |
| isScanInProgressFor | DOMElement                 | Returns `true` if the scanner is currently in the middle of a scan sequence and `false` otherwise. Technically, this means that the scan sequence started (e.g. via prefix character) and has not ended yet (e.g. via suffix or timeout). This method is useful inside event handlers.                                                                                                                      |

## Decoding key codes

By default, onscan-next uses `event.key` to decode keyboard events into characters. Any single-character `key` value is treated as a printable character; multi-character `key` values (like `Shift`, `Enter`, `ArrowLeft`) are ignored. This correctly handles all keyboard layouts, shifted characters, and special symbols out of the box.

If you need custom decoding logic for a specific scanner, you can override the default algorithm by specifying a custom `keyCodeMapper` like this:

```javascript
onScan.attachTo(document, {
    onScan: function(code, qty) { ... },
    keyCodeMapper: function(event) {
	// Look for special keycodes or other event properties specific to
	// your scanner
	if (event.which == 'your_special_key_code') {
		return 'xxx';
	}
	// Fall back to the default decoder in all other cases
	return onScan.decodeKeyEvent(event);
    }
});
```

Background: Barcode scanners operating in keyboard-mode (as opposed to clipboard-mode) work by simulating pressing keyboard keys. They send numeric key codes and the browser interprets them as input. This works great for letters and numbers. However, many barcode scanners also send additional characters depending on their configuration: e.g. the trailing enter (key code `13`), prefix or suffix codes, delimiters, and even their own "virtual" key codes. There are also cases, when key codes are used in a non-standard way. All these cases can be easily treated using a custom `keyCodeMapper` as shown above.

### Simulating key codes

If you do not have your scanner at hand, you can simulate keyboard events programmatically via `onScan.simulate()`. You can pass the desired scan code in the following formats:

- a string - in this case no keyCode decoding is done and the code is merely validated against constraints like minLength, etc.
- an array of keyCodes (e.g. `[70,71,80]`) - will produce `keydown` events with corresponding `keyCode` properties. NOTE: these events will have empty `key` properties, so decoding may yield different results than with native events.
- an array of objects (e.g. `[{keyCode: 70, key: "F", shiftKey: true}, {keyCode: 71, key: "g"}]`) - this way almost any event can be simulated exactly, but it's a lot of work to do.

Hint: use the `onKeyDetect` checkbox in the playground to get a full dump of each keyboard event an just paste them in your simulation code.

## Troubleshooting

**Missing or extra characters in scanned codes?** Override the `keyCodeMapper` option with a custom function. Use `onKeyDetect` to log all raw key events from your scanner, then handle the problematic key codes in your mapper and fall back to `onScan.decodeKeyEvent(event)` for everything else. See [Decoding key codes](#decoding-key-codes) for a full example.

**Scans are not detected?** Check that your scanner is in keyboard wedge mode (see [Device Configuration](#device-configuration)). Try increasing `timeBeforeScanTest` and `avgTimeByChar` if your scanner is slower than typical. Use `onKeyDetect` to verify key events are actually reaching the browser.

**Scans fire in input fields?** Set `ignoreIfFocusOn: 'input'` (or a more specific CSS selector) to suppress scan events when an input element is focused.

## Framework Integration

onscan-next is framework-agnostic, but you need to attach/detach it in sync with your component lifecycle to avoid memory leaks.

### React

```javascript
import onScan from 'onscan-next';

function ScannerComponent() {
    useEffect(() => {
        onScan.attachTo(document, {
            onScan: (code, qty) => console.log('Scanned:', code),
        });
        return () => onScan.detachFrom(document);
    }, []);

    return <div>Ready to scan</div>;
}
```

### Vue

```javascript
import onScan from 'onscan-next';

export default {
    mounted() {
        onScan.attachTo(document, {
            onScan: (code, qty) => console.log('Scanned:', code),
        });
    },
    beforeUnmount() {
        onScan.detachFrom(document);
    },
};
```

### Angular

```typescript
import onScan from 'onscan-next';

@Component({ ... })
export class ScannerComponent implements OnInit, OnDestroy {
    ngOnInit() {
        onScan.attachTo(document, {
            onScan: (code, qty) => console.log('Scanned:', code),
        });
    }
    ngOnDestroy() {
        onScan.detachFrom(document);
    }
}
```

## License

onscan-next is an open source project licensed under MIT.

---

Logo by [manshagraphics](https://www.flaticon.com/authors/manshagraphics) on Flaticon.
