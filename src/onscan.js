/*
 * onScan.js - scan-events for hardware barcodes scanners in javascript
 */
const scannerDataMap = new WeakMap();

const onScan = {

	/**
	 * @param {Element} oDomElement
	 * @param {Object} oOptions
	 * @return {Object} self
	 */
	attachTo(oDomElement, oOptions) {

		if (scannerDataMap.has(oDomElement)) {
			throw new Error("onScan.js is already initialized for DOM element " + oDomElement);
		}

		const oDefaults = {
			onScan(sScanned, iQty) {},
			onScanError(oDebug) {},
			onKeyProcess(sChar, oEvent) {},
			onKeyDetect(iKeyCode, oEvent) {},
			onPaste(sPasted, oEvent) {},
			keyCodeMapper: (oEvent) => onScan.decodeKeyEvent(oEvent),
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

		const mergedOptions = Object.assign({}, oDefaults, oOptions);

		// initializing options and variables
		scannerDataMap.set(oDomElement, {
			options: mergedOptions,
			vars: {
				firstCharTime: 0,
				lastCharTime: 0,
				accumulatedString: '',
				testTimer: false,
				longPressTimeStart: 0,
				longPressed: false,
			},
		});

		// initializing handlers (based on settings)
		if (mergedOptions.reactToPaste === true) {
			oDomElement.addEventListener("paste", this._handlePaste, mergedOptions.captureEvents);
		}
		if (mergedOptions.scanButtonKeyCode !== false) {
			oDomElement.addEventListener("keyup", this._handleKeyUp, mergedOptions.captureEvents);
		}
		if (mergedOptions.reactToKeydown === true || mergedOptions.scanButtonKeyCode !== false) {
			oDomElement.addEventListener("keydown", this._handleKeyDown, mergedOptions.captureEvents);
		}
		return this;
	},

	/**
	 * @param {Element} oDomElement
	 * @return {void}
	 */
	detachFrom(oDomElement) {
		const oData = scannerDataMap.get(oDomElement);
		if (!oData) { return; }
		const bCapture = oData.options.captureEvents;

		// detaching all used events
		if (oData.options.reactToPaste) {
			oDomElement.removeEventListener("paste", this._handlePaste, bCapture);
		}
		if (oData.options.scanButtonKeyCode !== false) {
			oDomElement.removeEventListener("keyup", this._handleKeyUp, bCapture);
		}
		oDomElement.removeEventListener("keydown", this._handleKeyDown, bCapture);

		// clear any pending scan validation timer
		if (oData.vars.testTimer) {
			clearTimeout(oData.vars.testTimer);
		}

		// clearing data off element
		scannerDataMap.delete(oDomElement);
	},

	/**
	 * @param {Element} oDomElement
	 * @return {Object}
	 */
	getOptions(oDomElement) {
		const oData = scannerDataMap.get(oDomElement);
		if (!oData) {
			throw new Error("onScan.js is not initialized for this DOM element. Use attachTo() first.");
		}
		return oData.options;
	},

	/**
	 * @param {Element} oDomElement
	 * @param {Object} oOptions
	 * @return {Object} self
	 */
	setOptions(oDomElement, oOptions) {
		const oData = scannerDataMap.get(oDomElement);
		const bCapture = oData.options.captureEvents;

		// check if some handlers need to be changed based on possible option changes
		switch (oData.options.reactToPaste) {
			case true:
				if (oOptions.reactToPaste === false) {
					oDomElement.removeEventListener("paste", this._handlePaste, bCapture);
				}
				break;
			case false:
				if (oOptions.reactToPaste === true) {
					oDomElement.addEventListener("paste", this._handlePaste, bCapture);
				}
				break;
		}

		switch (oData.options.scanButtonKeyCode) {
			case false:
				if (oOptions.scanButtonKeyCode !== false) {
					oDomElement.addEventListener("keyup", this._handleKeyUp, bCapture);
				}
				break;
			default:
				if (oOptions.scanButtonKeyCode === false) {
					oDomElement.removeEventListener("keyup", this._handleKeyUp, bCapture);
				}
				break;
		}

		// merge old and new options
		oData.options = Object.assign({}, oData.options, oOptions);

		// reinitialize
		this._reinitialize(oDomElement);
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
	 * @param {KeyboardEvent} oEvent
	 * @return {string|null} the decoded character, or null if the event should be ignored
	 */
	decodeKeyEvent(oEvent) {
		const sKey = oEvent.key;

		// If event.key is not available, fall back to legacy keyCode decoding
		if (sKey === undefined || sKey === '') {
			const iCode = oEvent.which || oEvent.keyCode;
			if (iCode >= 96 && iCode <= 105) {
				return String(iCode - 96);
			}
			if (iCode >= 48 && iCode <= 90) {
				const sDecoded = String.fromCharCode(iCode);
				return oEvent.shiftKey ? sDecoded.toUpperCase() : sDecoded.toLowerCase();
			}
			return null;
		}

		// Ignore modifier and control keys (key values with length > 1 are named keys)
		if (sKey.length !== 1) {
			return null;
		}

		// Single-character key values are printable characters
		return sKey;
	},

	/**
	 * Simulates a scan of the provided code.
	 *
	 * @param {Element} oDomElement
	 * @param {string|Array} mStringOrArray
	 * @return {Object} self
	 */
	simulate(oDomElement, mStringOrArray) {
		this._reinitialize(oDomElement);
		if (Array.isArray(mStringOrArray)) {
			mStringOrArray.forEach((mKey) => {
				let oEventProps = {};
				if (typeof mKey === "object" && mKey !== null) {
					oEventProps = mKey;
				} else {
					oEventProps.keyCode = parseInt(mKey);
				}
				const oEvent = new KeyboardEvent('keydown', oEventProps);
				oDomElement.dispatchEvent(oEvent);
			});
		} else {
			this._validateScanCode(oDomElement, mStringOrArray);
		}
		return this;
	},

	/**
	 * @private
	 * @param {Element} oDomElement
	 */
	_reinitialize(oDomElement) {
		const oVars = scannerDataMap.get(oDomElement).vars;
		if (oVars.testTimer) {
			clearTimeout(oVars.testTimer);
			oVars.testTimer = false;
		}
		oVars.firstCharTime = 0;
		oVars.lastCharTime = 0;
		oVars.accumulatedString = '';
	},

	/**
	 * @private
	 * @param {Element} oDomElement
	 * @return {boolean}
	 */
	_isFocusOnIgnoredElement(oDomElement) {
		const ignoreIfFocusOn = scannerDataMap.get(oDomElement).options.ignoreIfFocusOn;

		if (!ignoreIfFocusOn) {
			return false;
		}

		const oFocused = document.activeElement;
		const aIgnoreList = Array.isArray(ignoreIfFocusOn) ? ignoreIfFocusOn : [ignoreIfFocusOn];

		for (let i = 0; i < aIgnoreList.length; i++) {
			const item = aIgnoreList[i];
			if (item instanceof HTMLElement) {
				if (oFocused === item) {
					return true;
				}
			} else if (typeof item === 'string') {
				if (oFocused.matches(item)) {
					return true;
				}
			}
		}

		return false;
	},

	/**
	 * @private
	 * @param {Element} oDomElement
	 * @param {string} sScanCode
	 * @return {boolean}
	 */
	_validateScanCode(oDomElement, sScanCode) {
		const oScannerData = scannerDataMap.get(oDomElement);
		if (!oScannerData) { return false; }
		const oOptions = oScannerData.options;
		const iSingleScanQty = oScannerData.options.singleScanQty;
		const iFirstCharTime = oScannerData.vars.firstCharTime;
		const iLastCharTime = oScannerData.vars.lastCharTime;
		let oScanError = {};

		switch (true) {

			// detect codes that are too short
			case (sScanCode.length < oOptions.minLength):
				oScanError = {
					message: "Received code is shorter than minimal length"
				};
				break;

			// detect codes that were entered too slow
			case ((iLastCharTime - iFirstCharTime) > (sScanCode.length * oOptions.avgTimeByChar)):
				oScanError = {
					message: "Received code was not entered in time"
				};
				break;

			// if a code was not filtered out earlier it is valid
			default:
				oOptions.onScan.call(oDomElement, sScanCode, iSingleScanQty);
				oDomElement.dispatchEvent(new CustomEvent('scan', {
					detail: {
						scanCode: sScanCode,
						qty: iSingleScanQty,
					},
				}));
				onScan._reinitialize(oDomElement);
				return true;
		}

		// If an error occurred, build the debug object
		oScanError.scanCode = sScanCode;
		oScanError.scanDuration = iLastCharTime - iFirstCharTime;
		oScanError.avgTimeByChar = oOptions.avgTimeByChar;
		oScanError.minLength = oOptions.minLength;

		oOptions.onScanError.call(oDomElement, oScanError);
		oDomElement.dispatchEvent(new CustomEvent('scanError', { detail: oScanError }));

		onScan._reinitialize(oDomElement);
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
		const iKeyCode = onScan._getNormalizedKeyNum(e);
		const oOptions = scannerDataMap.get(this).options;
		const oVars = scannerDataMap.get(this).vars;
		let bScanFinished = false;

		if (oOptions.onKeyDetect.call(this, iKeyCode, e) === false) {
			return;
		}

		if (onScan._isFocusOnIgnoredElement(this)) {
			return;
		}

		// If it's just the button of the scanner, ignore it and wait for the real input
		if (oOptions.scanButtonKeyCode !== false && iKeyCode === oOptions.scanButtonKeyCode) {
			if (!oVars.longPressed) {
				oVars.longPressTimer = setTimeout(oOptions.onScanButtonLongPress, oOptions.scanButtonLongPressTime, this);
				oVars.longPressed = true;
			}
			return;
		}

		let character;

		switch (true) {
			// If it's not the first character and we encounter a terminating character, trigger scan process
			case (oVars.firstCharTime && oOptions.suffixKeyCodes.indexOf(iKeyCode) !== -1):
				e.preventDefault();
				e.stopImmediatePropagation();
				bScanFinished = true;
				break;

			// If it's the first character and we encountered one of the starting characters, don't process the scan
			case (!oVars.firstCharTime && oOptions.prefixKeyCodes.indexOf(iKeyCode) !== -1):
				e.preventDefault();
				e.stopImmediatePropagation();
				bScanFinished = false;
				break;

			// Otherwise, just add the character to the scan string we're building
			default:
				character = oOptions.keyCodeMapper.call(this, e);
				if (character === null) {
					return;
				}
				oVars.accumulatedString += character;

				if (oOptions.preventDefault) {
					e.preventDefault();
				}
				if (oOptions.stopPropagation) {
					e.stopImmediatePropagation();
				}

				bScanFinished = false;
				break;
		}

		if (!oVars.firstCharTime) {
			oVars.firstCharTime = Date.now();
		}

		oVars.lastCharTime = Date.now();

		if (oVars.testTimer) {
			clearTimeout(oVars.testTimer);
		}

		if (bScanFinished) {
			onScan._validateScanCode(this, oVars.accumulatedString);
			oVars.testTimer = false;
		} else {
			oVars.testTimer = setTimeout(onScan._validateScanCode, oOptions.timeBeforeScanTest, this, oVars.accumulatedString);
		}

		if (character !== undefined) {
			oOptions.onKeyProcess.call(this, character, e);
		}
	},

	/**
	 * @private
	 * @param {Event} e
	 */
	_handlePaste(e) {
		const oOptions = scannerDataMap.get(this).options;
		const oVars = scannerDataMap.get(this).vars;
		const sPasteString = (e.clipboardData || window.clipboardData).getData('text');

		if (onScan._isFocusOnIgnoredElement(this)) {
			return;
		}

		e.preventDefault();

		if (oOptions.stopPropagation) {
			e.stopImmediatePropagation();
		}

		oOptions.onPaste.call(this, sPasteString, e);

		oVars.firstCharTime = 0;
		oVars.lastCharTime = 0;

		onScan._validateScanCode(this, sPasteString);
	},

	/**
	 * @private
	 * @param {KeyboardEvent} e
	 */
	_handleKeyUp(e) {
		if (onScan._isFocusOnIgnoredElement(this)) {
			return;
		}

		const iKeyCode = onScan._getNormalizedKeyNum(e);

		const oData = scannerDataMap.get(this);
		if (iKeyCode === oData.options.scanButtonKeyCode) {
			clearTimeout(oData.vars.longPressTimer);
			oData.vars.longPressed = false;
		}
	},

	/**
	 * Returns TRUE if the scanner is currently in the middle of a scan sequence.
	 *
	 * @param {Element} oDomElement
	 * @return {boolean}
	 */
	isScanInProgressFor(oDomElement) {
		const oData = scannerDataMap.get(oDomElement);
		return oData ? oData.vars.firstCharTime > 0 : false;
	},

	/**
	 * Returns TRUE if onScan is attached to the given DOM element and FALSE otherwise.
	 *
	 * @param {Element} oDomElement
	 * @return {boolean}
	 */
	isAttachedTo(oDomElement) {
		return scannerDataMap.has(oDomElement);
	},
};

export default onScan;
