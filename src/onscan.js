const scannerDataMap = new WeakMap();

const onScan = {
    /**
     * @param {Element} domElement
     * @param {Object} options
     * @return {Object} self
     */
    attachTo(domElement, options) {
        if (scannerDataMap.has(domElement)) {
            throw new Error(`onScan.js is already initialized for DOM element ${domElement}`);
        }

        const defaults = {
            onScan(code, qty) {},
            onScanError(debug) {},
            onKeyProcess(char, event) {},
            onKeyDetect(keyCode, event) {},
            onPaste(pasted, event) {},
            keyCodeMapper: (event) => onScan.decodeKeyEvent(event),
            onScanButtonLongPress() {},
            scanButtonKeyCode: false,
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

        const mergedOptions = Object.assign({}, defaults, options);

        // Initializing default values
        scannerDataMap.set(domElement, {
            options: mergedOptions,
            vars: {
                firstCharTime: 0,
                lastCharTime: 0,
                accumulatedString: '',
                testTimer: false,
                longPressed: false,
            },
        });

        // initializing handlers (based on settings)
        if (mergedOptions.reactToPaste === true) {
            domElement.addEventListener('paste', this._handlePaste, mergedOptions.captureEvents);
        }
        if (mergedOptions.scanButtonKeyCode !== false) {
            domElement.addEventListener('keyup', this._handleKeyUp, mergedOptions.captureEvents);
        }
        if (mergedOptions.reactToKeydown === true || mergedOptions.scanButtonKeyCode !== false) {
            domElement.addEventListener('keydown', this._handleKeyDown, mergedOptions.captureEvents);
        }
        return this;
    },

    /**
     * @param {Element} domElement
     * @return {void}
     */
    detachFrom(domElement) {
        const data = scannerDataMap.get(domElement);
        if (!data) {
            return;
        }
        const capture = data.options.captureEvents;

        // detaching all used events
        if (data.options.reactToPaste) {
            domElement.removeEventListener('paste', this._handlePaste, capture);
        }
        if (data.options.scanButtonKeyCode !== false) {
            domElement.removeEventListener('keyup', this._handleKeyUp, capture);
        }
        domElement.removeEventListener('keydown', this._handleKeyDown, capture);

        // clear any pending scan validation timer
        if (data.vars.testTimer) {
            clearTimeout(data.vars.testTimer);
        }

        // clearing data off element
        scannerDataMap.delete(domElement);
    },

    /**
     * @param {Element} domElement
     * @return {Object}
     */
    getOptions(domElement) {
        const data = scannerDataMap.get(domElement);
        if (!data) {
            throw new Error('onScan.js is not initialized for this DOM element. Use attachTo() first.');
        }
        return data.options;
    },

    /**
     * @param {Element} domElement
     * @param {Object} options
     * @return {Object} self
     */
    setOptions(domElement, options) {
        const data = scannerDataMap.get(domElement);
        if (!data) {
            throw new Error('onScan.js is not initialized for this DOM element. Use attachTo() first.');
        }
        const capture = data.options.captureEvents;

        // check if some handlers need to be changed based on possible option changes
        switch (data.options.reactToPaste) {
            case true:
                if (options.reactToPaste === false) {
                    domElement.removeEventListener('paste', this._handlePaste, capture);
                }
                break;
            case false:
                if (options.reactToPaste === true) {
                    domElement.addEventListener('paste', this._handlePaste, capture);
                }
                break;
        }

        switch (data.options.scanButtonKeyCode) {
            case false:
                if (options.scanButtonKeyCode !== false) {
                    domElement.addEventListener('keyup', this._handleKeyUp, capture);
                }
                break;
            default:
                if (options.scanButtonKeyCode === false) {
                    domElement.removeEventListener('keyup', this._handleKeyUp, capture);
                }
                break;
        }

        // merge old and new options
        data.options = Object.assign({}, data.options, options);

        // reinitialize
        this._reinitialize(domElement);
        return this;
    },

    /**
     * Decodes a keyboard event into a printable character.
     *
     * Uses event.key as the primary source, which correctly handles all keyboard
     * layouts, shifted characters, and special symbols. Returns null for modifier
     * keys, control keys, and other non-printable keys so they are ignored by the
     * scan accumulator.
     *
     * @param {KeyboardEvent} event
     * @return {string|null} the decoded character, or null if the event should be ignored
     */
    decodeKeyEvent(event) {
        const key = event.key;

        // If event.key is not available, fall back to legacy keyCode decoding
        if (key === undefined || key === '') {
            const code = event.which || event.keyCode;
            if (code >= 96 && code <= 105) {
                return String(code - 96);
            }
            if (code >= 48 && code <= 90) {
                const decoded = String.fromCharCode(code);
                return event.shiftKey ? decoded.toUpperCase() : decoded.toLowerCase();
            }
            return null;
        }

        // Ignore modifier and control keys (key values with length > 1 are named keys)
        if (key.length !== 1) {
            return null;
        }

        // Single-character key values are printable characters
        return key;
    },

    /**
     * Simulates a scan of the provided code.
     *
     * @param {Element} domElement
     * @param {string|Array} codeOrKeys
     * @return {Object} self
     */
    simulate(domElement, codeOrKeys) {
        this._reinitialize(domElement);
        if (Array.isArray(codeOrKeys)) {
            codeOrKeys.forEach((entry) => {
                let eventProps = {};
                if (typeof entry === 'object' && entry !== null) {
                    eventProps = entry;
                } else {
                    eventProps.keyCode = parseInt(entry);
                }
                const event = new KeyboardEvent('keydown', eventProps);
                domElement.dispatchEvent(event);
            });
        } else {
            this._validateScanCode(domElement, codeOrKeys);
        }
        return this;
    },

    /**
     * @private
     * @param {Element} domElement
     */
    _reinitialize(domElement) {
        const vars = scannerDataMap.get(domElement).vars;
        if (vars.testTimer) {
            clearTimeout(vars.testTimer);
            vars.testTimer = false;
        }
        vars.firstCharTime = 0;
        vars.lastCharTime = 0;
        vars.accumulatedString = '';
    },

    /**
     * @private
     * @param {Element} domElement
     * @return {boolean}
     */
    _isFocusOnIgnoredElement(domElement) {
        const ignoreIfFocusOn = scannerDataMap.get(domElement).options.ignoreIfFocusOn;

        if (!ignoreIfFocusOn) {
            return false;
        }

        const focused = document.activeElement;
        if (!focused) {
            return false;
        }

        const ignoreList = Array.isArray(ignoreIfFocusOn) ? ignoreIfFocusOn : [ignoreIfFocusOn];

        for (let i = 0; i < ignoreList.length; i++) {
            const item = ignoreList[i];
            if (item instanceof HTMLElement) {
                if (focused === item) {
                    return true;
                }
            } else if (typeof item === 'string') {
                if (focused.matches(item)) {
                    return true;
                }
            }
        }

        return false;
    },

    /**
     * @private
     * @param {Element} domElement
     * @param {string} scanCode
     * @return {boolean}
     */
    _validateScanCode(domElement, scanCode) {
        const scannerData = scannerDataMap.get(domElement);
        if (!scannerData) {
            return false;
        }
        const options = scannerData.options;
        const singleScanQty = scannerData.options.singleScanQty;
        const firstCharTime = scannerData.vars.firstCharTime;
        const lastCharTime = scannerData.vars.lastCharTime;
        let scanError = {};

        switch (true) {
            // detect codes that are too short
            case scanCode.length < options.minLength:
                scanError = {
                    message: 'Received code is shorter than minimal length',
                };
                break;

            // detect codes that were entered too slow
            case lastCharTime - firstCharTime > scanCode.length * options.avgTimeByChar:
                scanError = {
                    message: 'Received code was not entered in time',
                };
                break;

            // if a code was not filtered out earlier it is valid
            default:
                options.onScan.call(domElement, scanCode, singleScanQty);
                domElement.dispatchEvent(
                    new CustomEvent('scan', {
                        detail: {
                            scanCode: scanCode,
                            qty: singleScanQty,
                        },
                    }),
                );
                onScan._reinitialize(domElement);
                return true;
        }

        // If an error occurred, build the debug object
        scanError.scanCode = scanCode;
        scanError.scanDuration = lastCharTime - firstCharTime;
        scanError.avgTimeByChar = options.avgTimeByChar;
        scanError.minLength = options.minLength;

        options.onScanError.call(domElement, scanError);
        domElement.dispatchEvent(new CustomEvent('scanError', { detail: scanError }));

        onScan._reinitialize(domElement);
        return false;
    },

    /**
     * @private
     * @param {KeyboardEvent} e
     * @return {number}
     */
    _getNormalizedKeyNum(e) {
        return e.which || e.keyCode;
    },

    /**
     * @private
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
        const keyCode = onScan._getNormalizedKeyNum(e);
        const options = scannerDataMap.get(this).options;
        const vars = scannerDataMap.get(this).vars;
        let scanFinished = false;

        if (options.onKeyDetect.call(this, keyCode, e) === false) {
            return;
        }

        if (onScan._isFocusOnIgnoredElement(this)) {
            return;
        }

        // If it's just the button of the scanner, ignore it and wait for the real input
        if (options.scanButtonKeyCode !== false && keyCode === options.scanButtonKeyCode) {
            if (!vars.longPressed) {
                vars.longPressTimer = setTimeout(
                    options.onScanButtonLongPress,
                    options.scanButtonLongPressTime,
                    this,
                );
                vars.longPressed = true;
            }
            return;
        }

        let character;

        switch (true) {
            // If it's not the first character and we encounter a terminating character, trigger scan process
            case vars.firstCharTime && options.suffixKeyCodes.includes(keyCode):
                e.preventDefault();
                e.stopImmediatePropagation();
                scanFinished = true;
                break;

            // If it's the first character and we encountered one of the starting characters, don't process the scan
            case !vars.firstCharTime && options.prefixKeyCodes.includes(keyCode):
                e.preventDefault();
                e.stopImmediatePropagation();
                scanFinished = false;
                break;

            // Otherwise, just add the character to the scan string we're building
            default:
                character = options.keyCodeMapper.call(this, e);
                if (character === null) {
                    return;
                }
                vars.accumulatedString += character;

                if (options.preventDefault) {
                    e.preventDefault();
                }
                if (options.stopPropagation) {
                    e.stopImmediatePropagation();
                }

                scanFinished = false;
                break;
        }

        if (!vars.firstCharTime) {
            vars.firstCharTime = Date.now();
        }

        vars.lastCharTime = Date.now();

        if (vars.testTimer) {
            clearTimeout(vars.testTimer);
        }

        if (scanFinished) {
            onScan._validateScanCode(this, vars.accumulatedString);
            vars.testTimer = false;
        } else {
            vars.testTimer = setTimeout(
                onScan._validateScanCode,
                options.timeBeforeScanTest,
                this,
                vars.accumulatedString,
            );
        }

        if (character !== undefined) {
            options.onKeyProcess.call(this, character, e);
        }
    },

    /**
     * @private
     * @param {Event} e
     */
    _handlePaste(e) {
        const options = scannerDataMap.get(this).options;
        const vars = scannerDataMap.get(this).vars;
        const pasteString = (e.clipboardData || window.clipboardData).getData('text');

        if (onScan._isFocusOnIgnoredElement(this)) {
            return;
        }

        e.preventDefault();

        if (options.stopPropagation) {
            e.stopImmediatePropagation();
        }

        options.onPaste.call(this, pasteString, e);

        vars.firstCharTime = 0;
        vars.lastCharTime = 0;

        onScan._validateScanCode(this, pasteString);
    },

    /**
     * @private
     * @param {KeyboardEvent} e
     */
    _handleKeyUp(e) {
        if (onScan._isFocusOnIgnoredElement(this)) {
            return;
        }

        const keyCode = onScan._getNormalizedKeyNum(e);

        const data = scannerDataMap.get(this);
        if (keyCode === data.options.scanButtonKeyCode) {
            clearTimeout(data.vars.longPressTimer);
            data.vars.longPressed = false;
        }
    },

    /**
     * Returns TRUE if the scanner is currently in the middle of a scan sequence.
     *
     * @param {Element} domElement
     * @return {boolean}
     */
    isScanInProgressFor(domElement) {
        const data = scannerDataMap.get(domElement);
        return data ? data.vars.firstCharTime > 0 : false;
    },

    /**
     * Returns TRUE if onScan is attached to the given DOM element and FALSE otherwise.
     *
     * @param {Element} domElement
     * @return {boolean}
     */
    isAttachedTo(domElement) {
        return scannerDataMap.has(domElement);
    },
};

export default onScan;
