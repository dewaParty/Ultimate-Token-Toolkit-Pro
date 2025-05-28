// ==UserScript==
// @name         Ultimate Token Toolkit Pro (One-Click with Indicator + Ad Blocker)
// @namespace    http://tampermonkey.net/
// @version      7.1.5
// @description  One-Click Token Generator with Generation Indicator and Ad Blocker - Direct Redirect Fix
// @author       Dewa
// @match        https://62.146.236.10/token/*
// @match        https://62.146.236.10/choose/*
// @match        https://generatetoken.my.id/samarinda/TokenBelut.php
// @grant        unsafeWindow
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        AUTH_TOKEN: "INPUT YOUR TOKEN HERE",
        INITIAL_DELAY: 300, // Reduced delay for faster redirect
        ENABLE_REDIRECT: true,
        REDIRECT_DELAY: 500, // Much faster redirect
        STEALTH_MODE: true,
        TOKEN_CHECK_INTERVAL: 500,
        AD_BLOCK_ENABLED: true,
        MAX_REDIRECT_ATTEMPTS: 3
    };

    // Ad blocking domains and patterns
    const AD_PATTERNS = [
        /heartilyfootindebted\.com/,
        /popads/i,
        /popup/i,
        /advertisement/i,
        /adnxs\.com/,
        /doubleclick\.net/,
        /googlesyndication\.com/,
        /googleadservices\.com/,
        /adsystem\.google/,
        /amazon-adsystem\.com/,
        /facebook\.com\/tr/,
        /analytics\.google/,
        /googletagmanager/
    ];

    const state = {
        flags: {
            tokenGenerated: false,
            processing: false,
            uiInjected: false,
            adBlockerActive: false,
            redirectInProgress: false
        },
        elements: {},
        resultToken: "",
        blockedAds: 0,
        redirectAttempts: 0
    };

    // Initialize Ad Blocker
    function initializeAdBlocker() {
        if (!CONFIG.AD_BLOCK_ENABLED || state.flags.adBlockerActive) return;

        state.flags.adBlockerActive = true;

        // Block window.open popups
        const originalWindowOpen = unsafeWindow.open;
        unsafeWindow.open = function(url, name, specs) {
            if (url && shouldBlockUrl(url)) {
                state.blockedAds++;
                log(`Blocked popup ad: ${url}`);
                updateAdBlockerStatus();
                return null;
            }
            return originalWindowOpen.call(this, url, name, specs);
        };

        // Block document.write ads
        const originalDocumentWrite = document.write;
        document.write = function(content) {
            if (content && shouldBlockContent(content)) {
                state.blockedAds++;
                log(`Blocked document.write ad content`);
                updateAdBlockerStatus();
                return;
            }
            return originalDocumentWrite.call(this, content);
        };

        // Override addEventListener for ad-related events
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'beforeunload' && typeof listener === 'string' && shouldBlockContent(listener)) {
                state.blockedAds++;
                log(`Blocked beforeunload ad event`);
                updateAdBlockerStatus();
                return;
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // Block script injections
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'SCRIPT' && shouldBlockScript(node)) {
                            state.blockedAds++;
                            node.remove();
                            log(`Blocked ad script injection`);
                            updateAdBlockerStatus();
                        }

                        // Block iframe ads
                        if (node.tagName === 'IFRAME' && shouldBlockUrl(node.src)) {
                            state.blockedAds++;
                            node.remove();
                            log(`Blocked iframe ad: ${node.src}`);
                            updateAdBlockerStatus();
                        }
                    }
                });
            });
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });

        log("Ad blocker initialized");
    }

    function shouldBlockUrl(url) {
        if (!url) return false;
        return AD_PATTERNS.some(pattern => pattern.test(url));
    }

    function shouldBlockContent(content) {
        if (!content) return false;
        const contentStr = content.toString().toLowerCase();
        return AD_PATTERNS.some(pattern => pattern.test(contentStr)) ||
               contentStr.includes('popup') ||
               contentStr.includes('advertisement') ||
               contentStr.includes('window.open');
    }

    function shouldBlockScript(scriptElement) {
        const src = scriptElement.src;
        const content = scriptElement.textContent || scriptElement.innerHTML;

        return shouldBlockUrl(src) || shouldBlockContent(content);
    }

    function updateAdBlockerStatus() {
        const adBlockStatus = document.getElementById('utt-adblock-status');
        if (adBlockStatus) {
            adBlockStatus.textContent = `🛡️ Blocked: ${state.blockedAds} ads`;
        }
    }

    // Improved redirect function with immediate execution
    function performRedirect(targetUrl, reason) {
        if (state.flags.redirectInProgress) {
            log("Redirect already in progress, skipping");
            return;
        }

        if (state.redirectAttempts >= CONFIG.MAX_REDIRECT_ATTEMPTS) {
            log("Max redirect attempts reached");
            updateStatus("Max redirect attempts reached", "error");
            return;
        }

        state.flags.redirectInProgress = true;
        state.redirectAttempts++;

        log(`Immediate redirect to: ${targetUrl} (${reason})`);
        updateStatus(`Redirecting... (${reason})`, "info");

        // Immediate redirect without delay for /choose/ page
        try {
            window.location.replace(targetUrl);
        } catch (error) {
            log(`Redirect error: ${error.message}`);
            // Fallback methods
            setTimeout(() => {
                try {
                    window.location.href = targetUrl;
                } catch (e) {
                    window.location.assign(targetUrl);
                }
            }, 100);
        }
    }

    // Simplified and faster redirect handling
    function handleRedirect() {
        if (!CONFIG.ENABLE_REDIRECT) {
            log("Redirect disabled in config");
            return;
        }

        const currentUrl = window.location.href;
        log(`Current URL: ${currentUrl}`);

        // Direct immediate redirect for /choose/ page
        if (currentUrl.includes('/choose/')) {
            log("Detected /choose/ page - performing immediate redirect");
            performRedirect("https://generatetoken.my.id/samarinda/TokenBelut.php", "Direct redirect from choose page");
            return;
        }

        // Step 1: /token/ -> /choose/
        if (currentUrl.includes('/token/') && !currentUrl.includes('/choose/')) {
            log("Step 1: Detected /token/ page");
            performRedirect("https://62.146.236.10/choose/", "Step 1: token to choose");
            return;
        }

        // Step 3: We're at the final destination
        if (currentUrl.includes('TokenBelut.php')) {
            log("Step 3: Reached TokenBelut.php - ready for generation");
            updateStatus("Ready for token generation", "success");
            // Start generation process immediately
            setTimeout(() => {
                generateToken();
            }, 500);
            return;
        }

        log("No redirect action needed for current URL");
    }

    function initialize() {
        log(`Initializing on: ${window.location.href}`);

        // For /choose/ page, redirect immediately without UI setup
        if (window.location.href.includes('/choose/')) {
            log("On /choose/ page - redirecting immediately");
            handleRedirect();
            return;
        }

        if (state.flags.uiInjected) {
            log("UI already injected, skipping");
            return;
        }

        // Initialize ad blocker first
        initializeAdBlocker();

        setupUI();

        // Process based on current page
        const initProcess = () => {
            // Check for existing token first
            if (checkForExistingToken()) {
                showTokenResult();
                return;
            }

            // Handle redirects based on current URL
            handleRedirect();
        };

        // Immediate execution for faster processing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initProcess);
        } else {
            initProcess();
        }
    }

    function checkForExistingToken() {
        // Check various token display locations
        const tokenElements = document.querySelectorAll('[id*="token"], [class*="token"], .result, #token_display');

        for (const el of tokenElements) {
            const tokenText = el.textContent.trim();
            if (tokenText.length > 10 && !tokenText.toLowerCase().includes('generate')) {
                state.resultToken = tokenText;
                state.flags.tokenGenerated = true;
                log(`Found existing token: ${tokenText.substring(0, 8)}...`);
                return true;
            }
        }
        return false;
    }

    function generateToken() {
        if (state.flags.tokenGenerated || state.flags.processing) {
            updateStatus("Token already generated", "success");
            return;
        }

        // Only generate if we're on the TokenBelut.php page
        if (!window.location.href.includes('TokenBelut.php')) {
            log("Not on generation page, skipping token generation");
            return;
        }

        state.flags.processing = true;
        updateStatus("Starting generation...", "info");
        log("Starting token generation process");

        const hwidInput = document.getElementById('hwid') ||
                         document.querySelector('input[name="hwid"], input[type="text"]');
        const generateBtn = document.getElementById('generateBtn') ||
                          document.querySelector('button.generate-btn, input[type="submit"], button[type="submit"]');

        if (!hwidInput || !generateBtn) {
            log("Missing form elements, waiting for page to load...");
            updateStatus("Waiting for page elements...", "warning");

            // Retry after a delay
            setTimeout(() => {
                state.flags.processing = false;
                generateToken();
            }, 2000);
            return;
        }

        log("Form elements found, proceeding with generation");

        // Direct injection and submission
        hwidInput.value = CONFIG.AUTH_TOKEN;
        triggerEvent(hwidInput, 'input');
        triggerEvent(hwidInput, 'change');

        setTimeout(() => {
            generateBtn.click();
            updateStatus("Generation in progress...", "warning");
            log("Form submitted, monitoring for results");
            monitorGeneration();
        }, 500);
    }

    function monitorGeneration() {
        const startTime = Date.now();
        const maxWaitTime = 20000; // 20 seconds max

        const checkInterval = setInterval(() => {
            if (checkForExistingToken()) {
                clearInterval(checkInterval);
                showTokenResult();
                return;
            }

            const elapsed = Date.now() - startTime;
            if (elapsed > maxWaitTime) {
                clearInterval(checkInterval);
                updateStatus("Generation timeout - retrying...", "error");
                log("Generation timeout, attempting retry");
                state.flags.processing = false;

                // Retry once
                setTimeout(() => {
                    generateToken();
                }, 3000);
            } else {
                // Update progress
                const remaining = Math.ceil((maxWaitTime - elapsed) / 1000);
                updateStatus(`Generating... (${remaining}s remaining)`, "warning");
            }
        }, CONFIG.TOKEN_CHECK_INTERVAL);
    }

    function showTokenResult() {
        if (!state.resultToken) return;

        state.flags.tokenGenerated = true;
        state.flags.processing = false;

        log(`Token generation completed: ${state.resultToken.substring(0, 8)}...`);

        // Update UI to show completion
        updateStatus(`Token generated successfully!`, "success");
        document.getElementById('utt-token-display').textContent = state.resultToken;
        document.getElementById('utt-token-display').style.display = 'block';
        document.getElementById('utt-generate-btn').style.display = 'none';
        document.getElementById('utt-copy-btn').style.display = 'block';

        // Add completion indicator
        const completedDiv = document.createElement('div');
        completedDiv.className = 'utt-completed';
        completedDiv.textContent = '✓ TOKEN GENERATED SUCCESSFULLY';
        document.querySelector('.utt-panel').appendChild(completedDiv);

        // Auto-copy to clipboard
        GM_setClipboard(state.resultToken)
            .then(() => {
                log("Token copied to clipboard");
                updateStatus("Token copied to clipboard!", "success");
            })
            .catch(err => {
                console.error("Copy failed:", err);
                updateStatus("Generation complete (copy manually)", "success");
            });

        // Optional: Redirect back to main page after success
        if (CONFIG.ENABLE_REDIRECT) {
            setTimeout(() => {
                updateStatus("Redirecting back to main page...", "info");
                performRedirect("https://62.146.236.10", "Completion redirect");
            }, CONFIG.REDIRECT_DELAY * 4);
        }
    }

    function setupUI() {
        if (state.flags.uiInjected) return;

        GM_addStyle(`
            .utt-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                background: #1a1a2e;
                border: 1px solid #00ff88;
                border-radius: 8px;
                padding: 15px;
                z-index: 9999;
                box-shadow: 0 0 15px rgba(0,255,136,0.2);
                font-family: 'Segoe UI', sans-serif;
            }
            .utt-status {
                padding: 10px;
                margin: 10px 0;
                border-radius: 5px;
                font-size: 13px;
            }
            .utt-status.success {
                background: rgba(0,255,136,0.1);
                border-left: 3px solid #00ff88;
                color: #00ff88;
            }
            .utt-status.error {
                background: rgba(255,0,0,0.1);
                border-left: 3px solid red;
                color: #ff5555;
            }
            .utt-status.warning {
                background: rgba(255,165,0,0.1);
                border-left: 3px solid orange;
                color: orange;
            }
            .utt-status.info {
                background: rgba(0,191,255,0.1);
                border-left: 3px solid #00bfff;
                color: #00bfff;
            }
            .utt-btn {
                background: linear-gradient(135deg, #00ff88, #00bfff);
                border: none;
                color: #111;
                padding: 8px 15px;
                border-radius: 5px;
                font-weight: bold;
                cursor: pointer;
                margin: 5px 0;
                width: 100%;
                transition: 0.3s;
            }
            .utt-btn:hover {
                opacity: 0.9;
            }
            .utt-btn:disabled {
                background: #555;
                cursor: not-allowed;
            }
            #utt-token-display {
                word-break: break-all;
                padding: 10px;
                background: rgba(0,0,0,0.3);
                border-radius: 5px;
                margin: 10px 0;
                font-family: monospace;
                color: #00ff88;
                border: 1px solid rgba(0,255,136,0.3);
                display: none;
            }
            .utt-completed {
                color: #00ff88;
                font-weight: bold;
                text-align: center;
                margin: 10px 0;
                padding: 8px;
                background: rgba(0,255,136,0.1);
                border-radius: 5px;
                border: 1px solid rgba(0,255,136,0.3);
            }
            .utt-adblock-status {
                background: rgba(255,100,0,0.1);
                border-left: 3px solid #ff6400;
                color: #ff6400;
                padding: 8px;
                border-radius: 5px;
                font-size: 12px;
                margin: 5px 0;
                text-align: center;
            }
            .utt-toggle {
                background: #333;
                border: 1px solid #555;
                color: #fff;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 11px;
                cursor: pointer;
                margin-left: 5px;
            }
            .utt-toggle.active {
                background: #00ff88;
                color: #111;
            }
            .utt-url-info {
                background: rgba(0,0,0,0.2);
                padding: 8px;
                border-radius: 5px;
                font-size: 11px;
                color: #888;
                margin: 5px 0;
                word-break: break-all;
            }
        `);

        const panel = document.createElement('div');
        panel.className = 'utt-panel';
        panel.innerHTML = `
            <div style="font-weight:bold; color:#00ff88; margin-bottom:10px;">
                Ultimate Token Toolkit Pro
                <span style="float:right; font-size:11px; color:#888;">v7.1.5</span>
            </div>
            <div class="utt-url-info">
                Current: ${window.location.pathname}
            </div>
            <div class="utt-adblock-status" id="utt-adblock-status">
                🛡️ Blocked: ${state.blockedAds} ads
                <button class="utt-toggle ${CONFIG.AD_BLOCK_ENABLED ? 'active' : ''}" id="utt-adblock-toggle">
                    ${CONFIG.AD_BLOCK_ENABLED ? 'ON' : 'OFF'}
                </button>
            </div>
            <div class="utt-status info" id="utt-status">
                Initializing system...
            </div>
            <div id="utt-token-display"></div>
            <button id="utt-generate-btn" class="utt-btn">
                GENERATE TOKEN
            </button>
            <button id="utt-copy-btn" class="utt-btn" style="display:none; background:linear-gradient(135deg, #00bfff, #0088ff);">
                COPY TOKEN
            </button>
        `;

        document.body.appendChild(panel);

        // Add button events
        document.getElementById('utt-generate-btn')?.addEventListener('click', generateToken);
        document.getElementById('utt-copy-btn')?.addEventListener('click', () => {
            GM_setClipboard(state.resultToken);
            updateStatus("Token copied to clipboard!", "success");
        });

        // Ad blocker toggle
        document.getElementById('utt-adblock-toggle')?.addEventListener('click', (e) => {
            CONFIG.AD_BLOCK_ENABLED = !CONFIG.AD_BLOCK_ENABLED;
            e.target.textContent = CONFIG.AD_BLOCK_ENABLED ? 'ON' : 'OFF';
            e.target.className = `utt-toggle ${CONFIG.AD_BLOCK_ENABLED ? 'active' : ''}`;

            if (CONFIG.AD_BLOCK_ENABLED && !state.flags.adBlockerActive) {
                initializeAdBlocker();
            }

            log(`Ad blocker ${CONFIG.AD_BLOCK_ENABLED ? 'enabled' : 'disabled'}`);
        });

        state.flags.uiInjected = true;
        log("UI setup completed");
    }

    function updateStatus(message, type) {
        const statusEl = document.getElementById('utt-status');
        if (statusEl) {
            statusEl.className = `utt-status ${type}`;
            statusEl.textContent = message;
        }
        log(`Status: ${message} (${type})`);
    }

    function triggerEvent(element, eventName) {
        const event = new Event(eventName, { bubbles: true });
        element.dispatchEvent(event);
    }

    function log(message) {
        if (!CONFIG.STEALTH_MODE) {
            console.log(`%c[UTT] ${message}`, 'color: #00ff88;');
        }
    }

    // Initialize immediately for /choose/ page, otherwise wait
    if (window.location.href.includes('/choose/')) {
        initialize();
    } else {
        // Initialize when page loads for other pages
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            setTimeout(initialize, CONFIG.INITIAL_DELAY);
        }
    }

    // Backup initialization
    setTimeout(initialize, 100);

})();
