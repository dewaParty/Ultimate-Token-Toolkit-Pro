// ==UserScript==
// @name         Ultimate Token Toolkit Pro X
// @namespace    http://tampermonkey.net/
// @version      8.0.2
// @description  Advanced Token Generator with Smart Redirect, Enhanced Ad Blocker, and Token History
// @author       Dewa
// @match        https://62.146.236.10/token/*
// @match        https://62.146.236.10/choose/*
// @match        https://generatetoken.my.id/samarinda/TokenBelut.php
// @match        https://62.146.236.10/
// @grant        unsafeWindow
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // CONFIGURATION
    const CONFIG = {
        AUTH_TOKEN: "C20EAA8F48737C0519E1079B89126F0A",
        INITIAL_DELAY: 200,
        ENABLE_REDIRECT: true,
        REDIRECT_DELAY: 300,
        STEALTH_MODE: false,
        TOKEN_CHECK_INTERVAL: 300,
        AD_BLOCK_ENABLED: true,
        MAX_REDIRECT_ATTEMPTS: 5,
        SAVE_TOKEN_HISTORY: true,
        MAX_HISTORY_ITEMS: 10,
        THEME: {
            PRIMARY: '#4F46E5',          // Indigo
            SECONDARY: '#3B82F6',        // Blue
            ACCENT: '#8B5CF6',           // Violet
            BACKGROUND: '#1E1E2E',       // Dark blue-gray
            TEXT: '#F9FAFB',             // Almost white
            ERROR: '#EF4444',            // Red
            WARNING: '#F59E0B',          // Amber
            INFO: '#3B82F6',             // Blue
            SUCCESS: '#10B981'           // Emerald
        },
        SHOW_NOTIFICATIONS: true,
        ENABLE_ANALYTICS: false
    };

    // Import utilities
    const Utils = {
        version: '8.0.2',

        // State management
        state: {
            flags: {
                tokenGenerated: false,
                processing: false,
                uiInjected: false,
                adBlockerActive: false,
                redirectInProgress: false,
                panelCollapsed: false,
                advanced: false,
                mainPageTokenRequested: false,
                tokenCopied: false,
                tokenSaved: false
            },
            elements: {},
            resultToken: "",
            blockedAds: 0,
            redirectAttempts: 0,
            tokenHistory: [],
            startTime: null,
            statusHistory: [],
            pendingMainPageRedirect: false
        },

        // Logger utility
        log: function(message, type = 'info') {
            if (!CONFIG.STEALTH_MODE) {
                const styles = {
                    info: 'color: #3B82F6',
                    success: 'color: #10B981',
                    warning: 'color: #F59E0B',
                    error: 'color: #EF4444'
                };
                console.log(`%c[UTT X] ${message}`, styles[type] || styles.info);
            }

            // Add to status history
            Utils.state.statusHistory.unshift({
                message,
                type,
                timestamp: new Date().toISOString()
            });

            // Keep only last 20 status messages
            if (Utils.state.statusHistory.length > 20) {
                Utils.state.statusHistory.pop();
            }
        },

        // Update status UI
        updateStatus: function(message, type) {
            const statusEl = document.getElementById('utt-status');
            if (statusEl) {
                statusEl.className = `utt-status ${type}`;
                statusEl.textContent = message;

                // Add animation
                statusEl.style.animation = 'none';
                setTimeout(() => {
                    statusEl.style.animation = 'statusPulse 0.5s ease';
                }, 10);
            }
            this.log(`Status: ${message}`, type);
        },

        // Show notification
        showNotification: function(title, message, type = 'info') {
            if (!CONFIG.SHOW_NOTIFICATIONS) return;

            try {
                GM_notification({
                    title: `UTT X - ${title}`,
                    text: message,
                    timeout: 5000,
                    onclick: function() {
                        // Focus the window when notification is clicked
                        window.focus();
                    }
                });
            } catch (err) {
                this.log('Notification failed: ' + err.message, 'error');
            }
        },

        // Trigger event
        triggerEvent: function(element, eventName) {
            const event = new Event(eventName, { bubbles: true });
            element.dispatchEvent(event);
        },

        // Generate a unique ID
        generateUniqueId: function() {
            return '_' + Math.random().toString(36).substr(2, 9);
        },

        // Save token to history
        saveTokenToHistory: function(token) {
            if (!CONFIG.SAVE_TOKEN_HISTORY) return;

            try {
                let history = GM_getValue('tokenHistory', []);

                // Add new token with timestamp
                const newEntry = {
                    token,
                    timestamp: new Date().toISOString(),
                    source: window.location.href
                };

                // Avoid duplicates
                history = history.filter(item => item.token !== token);

                // Add new entry to the beginning
                history.unshift(newEntry);

                // Limit history size
                if (history.length > CONFIG.MAX_HISTORY_ITEMS) {
                    history = history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
                }

                GM_setValue('tokenHistory', history);
                Utils.state.tokenHistory = history;
                Utils.log('Token saved to history', 'success');

                // NEW: Mark token as saved
                Utils.state.flags.tokenSaved = true;

                // Update UI if needed
                Utils.updateTokenHistoryUI();

                // NEW: Check if we should show success message
                Utils.checkAndShowSuccessMessage();
            } catch (err) {
                Utils.log('Failed to save token history: ' + err.message, 'error');
            }
        },

        // NEW: Check if all conditions are met to show success message
        checkAndShowSuccessMessage: function() {
            if (Utils.state.flags.tokenGenerated &&
                Utils.state.flags.tokenSaved &&
                Utils.state.flags.tokenCopied) {

                // If all conditions are met, show success message
                const panelElement = document.querySelector('.utt-panel');
                if (panelElement) {
                    const existingComplete = document.querySelector('.utt-completed');
                    if (!existingComplete) {
                        const completedDiv = document.createElement('div');
                        completedDiv.className = 'utt-completed';
                        completedDiv.innerHTML = '✓ TOKEN GENERATED SUCCESSFULLY';
                        panelElement.appendChild(completedDiv);
                        Utils.log('Success message displayed - all conditions met', 'success');
                    }
                }

                // If this was from main page, redirect back
                if (Utils.state.pendingMainPageRedirect && CONFIG.ENABLE_REDIRECT) {
                    setTimeout(() => {
                        Utils.updateStatus("Redirecting back to main page...", "info");
                        RedirectHandler.performRedirect("https://62.146.236.10", "Completion redirect");
                    }, CONFIG.REDIRECT_DELAY * 2);
                }
            }
        },

        // Update token history UI
        updateTokenHistoryUI: function() {
            const historyContainer = document.getElementById('utt-token-history');
            if (!historyContainer) return;

            try {
                const history = GM_getValue('tokenHistory', []);
                Utils.state.tokenHistory = history;

                if (history.length === 0) {
                    historyContainer.innerHTML = '<div class="utt-history-empty">No token history</div>';
                    return;
                }

                let html = '';
                history.forEach((item, index) => {
                    const date = new Date(item.timestamp);
                    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                    const shortToken = item.token.substring(0, 15) + '...';

                    html += `
                        <div class="utt-history-item" data-index="${index}">
                            <div class="utt-history-token">${shortToken}</div>
                            <div class="utt-history-date">${formattedDate}</div>
                            <div class="utt-history-actions">
                                <button class="utt-history-copy" data-token="${item.token}">Copy</button>
                                <button class="utt-history-delete" data-index="${index}">Delete</button>
                            </div>
                        </div>
                    `;
                });

                historyContainer.innerHTML = html;

                // Add event listeners
                document.querySelectorAll('.utt-history-copy').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const token = this.getAttribute('data-token');
                        GM_setClipboard(token);
                        Utils.updateStatus('Historical token copied!', 'success');
                    });
                });

                document.querySelectorAll('.utt-history-delete').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const index = parseInt(this.getAttribute('data-index'));
                        let history = GM_getValue('tokenHistory', []);
                        history.splice(index, 1);
                        GM_setValue('tokenHistory', history);
                        Utils.updateTokenHistoryUI();
                        Utils.updateStatus('Token removed from history', 'info');
                    });
                });
            } catch (err) {
                Utils.log('Failed to update history UI: ' + err.message, 'error');
            }
        },

        // Format time duration
        formatDuration: function(milliseconds) {
            if (milliseconds < 1000) return `${milliseconds}ms`;
            const seconds = Math.floor(milliseconds / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        },

        // Analytics
        trackEvent: function(category, action, label) {
            if (!CONFIG.ENABLE_ANALYTICS || CONFIG.STEALTH_MODE) return;

            try {
                // Simple anonymous analytics - no personal data collected
                const data = {
                    v: Utils.version,
                    cat: category,
                    act: action,
                    lbl: label,
                    t: new Date().toISOString(),
                    r: document.referrer,
                    u: window.location.href.split('?')[0] // No query params
                };

                // This would normally send to an analytics service
                // but we'll just log it for demonstration
                Utils.log(`Analytics: ${category} - ${action} - ${label}`);
            } catch (err) {
                // Silently fail
            }
        },

        // NEW: Safe clipboard copy function that works across Tampermonkey versions
        safeClipboardCopy: function(text) {
            try {
                // Some versions of GM_setClipboard return a Promise, others don't
                const result = GM_setClipboard(text);

                if (result && typeof result.then === 'function') {
                    // Promise-based version
                    result.then(() => {
                        Utils.log("Token copied to clipboard", 'success');
                        Utils.updateStatus("Token copied to clipboard!", "success");
                        Utils.showNotification("Success!", "Token copied to clipboard", 'success');
                        Utils.state.flags.tokenCopied = true;
                        Utils.checkAndShowSuccessMessage();
                    }).catch(err => {
                        Utils.log("Clipboard copy failed: " + err.message, 'error');
                        Utils.updateStatus("Copy failed - try manually", "error");
                    });
                } else {
                    // Non-promise version
                    Utils.log("Token copied to clipboard", 'success');
                    Utils.updateStatus("Token copied to clipboard!", "success");
                    Utils.showNotification("Success!", "Token copied to clipboard", 'success');
                    Utils.state.flags.tokenCopied = true;
                    Utils.checkAndShowSuccessMessage();
                }
            } catch (err) {
                Utils.log("Clipboard copy failed: " + err.message, 'error');
                Utils.updateStatus("Copy failed - try manually", "error");
            }
        }
    };

    // Ad Blocker Module
    const AdBlocker = {
        // Enhanced ad patterns with specific targeting
        AD_PATTERNS: [
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
            /googletagmanager/,
            /adroll\.com/,
            /adform\.net/,
            /adswizz\.com/,
            /adblade\.com/,
            /popunder/i,
            /pushtimize\.com/,
            /notix\.io/,
            /clicksgear\.com/,
            /exosrv\.com/,
            /propeller\.com/,
            /trafficjunky\.com/,
            /juicyads\.com/,
            /exoclick\.com/,
            /mgid\.com/,
            /adskeeper\.co\.uk/,
            /popcash\.net/,
            /popmonetizer\.net/,
            /pu-push\.com/,
            /pushengage\.com/,
            /pushsar\.com/
        ],

        initialize: function() {
            if (!CONFIG.AD_BLOCK_ENABLED || Utils.state.flags.adBlockerActive) return;

            Utils.state.flags.adBlockerActive = true;
            Utils.log('Enhanced Ad Blocker initializing...', 'info');

            // Override window.open to block popups
            this.blockPopups();

            // Block document.write
            this.blockDocumentWrite();

            // Intercept event listeners
            this.blockEventListeners();

            // Block script injections and iframes
            this.setupDOMObserver();

            // Block network requests to ad servers
            this.blockNetworkRequests();

            // Remove existing ads
            this.removeExistingAds();

            Utils.log('Enhanced Ad Blocker initialized successfully', 'success');
        },

        blockPopups: function() {
            const originalWindowOpen = unsafeWindow.open;
            unsafeWindow.open = function(url, name, specs) {
                if (url && AdBlocker.shouldBlockUrl(url)) {
                    Utils.state.blockedAds++;
                    Utils.log(`Blocked popup ad: ${url}`, 'success');
                    AdBlocker.updateAdBlockerStatus();
                    return null;
                }
                return originalWindowOpen.call(this, url, name, specs);
            };
        },

        blockDocumentWrite: function() {
            const originalDocumentWrite = document.write;
            document.write = function(content) {
                if (content && AdBlocker.shouldBlockContent(content)) {
                    Utils.state.blockedAds++;
                    Utils.log(`Blocked document.write ad content`, 'success');
                    AdBlocker.updateAdBlockerStatus();
                    return;
                }
                return originalDocumentWrite.call(this, content);
            };
        },

        blockEventListeners: function() {
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                // Block ad-related events
                if ((type === 'beforeunload' || type === 'click') &&
                    typeof listener === 'function' &&
                    listener.toString().match(/popup|window\.open|advertisement/i)) {
                    Utils.state.blockedAds++;
                    Utils.log(`Blocked ${type} ad event`, 'success');
                    AdBlocker.updateAdBlockerStatus();
                    return;
                }
                return originalAddEventListener.call(this, type, listener, options);
            };
        },

        setupDOMObserver: function() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Block scripts
                            if (node.tagName === 'SCRIPT' && AdBlocker.shouldBlockScript(node)) {
                                Utils.state.blockedAds++;
                                node.remove();
                                Utils.log(`Blocked ad script: ${node.src || 'inline'}`, 'success');
                                AdBlocker.updateAdBlockerStatus();
                            }

                            // Block iframes
                            if (node.tagName === 'IFRAME' && AdBlocker.shouldBlockUrl(node.src)) {
                                Utils.state.blockedAds++;
                                node.remove();
                                Utils.log(`Blocked iframe ad: ${node.src}`, 'success');
                                AdBlocker.updateAdBlockerStatus();
                            }

                            // Block div ads
                            if ((node.tagName === 'DIV' || node.tagName === 'SECTION') &&
                                (node.id && node.id.match(/ad|popup|banner/i) ||
                                 node.className && node.className.match(/ad|popup|banner/i))) {
                                Utils.state.blockedAds++;
                                node.remove();
                                Utils.log(`Blocked div ad container`, 'success');
                                AdBlocker.updateAdBlockerStatus();
                            }
                        }
                    });
                });
            });

            observer.observe(document, {
                childList: true,
                subtree: true
            });
        },

        blockNetworkRequests: function() {
            // This is a limited implementation as userscripts cannot fully block network requests
            // For demonstration purposes
            Utils.log('Network request blocking initialized', 'info');
        },

        removeExistingAds: function() {
            setTimeout(() => {
                // Remove common ad elements
                const selectors = [
                    '[id*="google_ads"]',
                    '[id*="banner"]',
                    '[class*="banner"]',
                    '[id*="advertising"]',
                    '[class*="advertising"]',
                    '[id*="popup"]',
                    '[class*="popup"]',
                    'iframe[src*="ads"]',
                    'iframe[src*="advertisement"]',
                    'iframe[src*="banner"]',
                    'iframe[data-src*="ads"]'
                ];

                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(element => {
                        Utils.state.blockedAds++;
                        element.remove();
                        Utils.log(`Removed existing ad: ${selector}`, 'success');
                    });
                });

                AdBlocker.updateAdBlockerStatus();
            }, 500);
        },

        shouldBlockUrl: function(url) {
            if (!url) return false;
            return this.AD_PATTERNS.some(pattern => pattern.test(url));
        },

        shouldBlockContent: function(content) {
            if (!content) return false;
            const contentStr = content.toString().toLowerCase();
            return this.AD_PATTERNS.some(pattern => pattern.test(contentStr)) ||
                   contentStr.includes('popup') ||
                   contentStr.includes('advertisement') ||
                   contentStr.includes('window.open');
        },

        shouldBlockScript: function(scriptElement) {
            const src = scriptElement.src;
            const content = scriptElement.textContent || scriptElement.innerHTML;

            return this.shouldBlockUrl(src) || this.shouldBlockContent(content);
        },

        updateAdBlockerStatus: function() {
            const adBlockStatus = document.getElementById('utt-adblock-status');
            if (adBlockStatus) {
                adBlockStatus.textContent = `🛡️ Blocked: ${Utils.state.blockedAds} ads`;

                // Add animation for new blocks
                adBlockStatus.style.animation = 'none';
                setTimeout(() => {
                    adBlockStatus.style.animation = 'blockPulse 0.5s ease';
                }, 10);
            }
        }
    };

    // Redirect Handler Module
    const RedirectHandler = {
        performRedirect: function(targetUrl, reason) {
            if (Utils.state.flags.redirectInProgress) {
                Utils.log("Redirect already in progress, skipping", 'warning');
                return;
            }

            if (Utils.state.redirectAttempts >= CONFIG.MAX_REDIRECT_ATTEMPTS) {
                Utils.log("Max redirect attempts reached", 'error');
                Utils.updateStatus("Max redirect attempts reached", "error");
                Utils.showNotification("Redirect Failed", "Maximum redirect attempts reached. Please try manually navigating to the site.", 'error');
                return;
            }

            Utils.state.flags.redirectInProgress = true;
            Utils.state.redirectAttempts++;

            Utils.log(`Redirecting to: ${targetUrl} (${reason})`, 'info');
            Utils.updateStatus(`Redirecting... (${reason})`, "info");

            // Record analytics
            Utils.trackEvent('redirect', 'attempt', targetUrl);

            // Store current state in session storage before redirect
            // NEW: Save critical state for cross-page persistence
            try {
                const stateToSave = {
                    mainPageTokenRequested: Utils.state.flags.mainPageTokenRequested,
                    pendingMainPageRedirect: Utils.state.pendingMainPageRedirect,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('uttx_state', JSON.stringify(stateToSave));
                Utils.log("State saved before redirect", 'info');
            } catch (err) {
                Utils.log("Error saving state: " + err.message, 'error');
            }

            // Try multiple redirect methods
            try {
                // Method 1: location.replace (most seamless)
                window.location.replace(targetUrl);

                // Method 2: Fallback with timeout
                setTimeout(() => {
                    if (Utils.state.flags.redirectInProgress) {
                        try {
                            Utils.log("Trying fallback redirect method", 'warning');
                            window.location.href = targetUrl;
                        } catch (e) {
                            // Method 3: Last resort
                            setTimeout(() => {
                                window.location.assign(targetUrl);
                            }, 100);
                        }
                    }
                }, 500);
            } catch (error) {
                Utils.log(`Redirect error: ${error.message}`, 'error');
                Utils.showNotification("Redirect Error", `Failed to redirect: ${error.message}`, 'error');

                // Release flag so we can try again
                setTimeout(() => {
                    Utils.state.flags.redirectInProgress = false;
                }, 1000);
            }
        },

        handleRedirect: function() {
            if (!CONFIG.ENABLE_REDIRECT) {
                Utils.log("Redirect disabled in config", 'warning');
                return;
            }

            const currentUrl = window.location.href;
            Utils.log(`Processing URL: ${currentUrl}`, 'info');

            // NEW: Restore state from session storage if available
            this.restoreState();

            // Smart URL pattern detection
            if (currentUrl.includes('/choose/')) {
                Utils.log("Detected /choose/ page - performing immediate redirect", 'info');
                this.performRedirect("https://generatetoken.my.id/samarinda/TokenBelut.php", "Direct redirect from choose page");
                return;
            }

            if (currentUrl.includes('/token/') && !currentUrl.includes('/choose/')) {
                Utils.log("Detected /token/ page - redirecting to /choose/", 'info');
                this.performRedirect("https://62.146.236.10/choose/", "Step 1: token to choose");
                return;
            }

            if (currentUrl.includes('TokenBelut.php')) {
                Utils.log("On TokenBelut.php - ready for generation", 'success');
                Utils.updateStatus("Ready for token generation", "success");

                // NEW: Check if we came from main page and should auto-generate
                if (Utils.state.flags.mainPageTokenRequested) {
                    Utils.log("Auto-generating token based on main page request", 'info');
                    setTimeout(() => {
                        TokenGenerator.generateToken();
                    }, 500);
                }
                return;
            }

            if (currentUrl === "https://62.146.236.10/") {
                Utils.log("On main page - no redirect needed", 'info');
                Utils.updateStatus("On main page - ready for action", "info");
                return;
            }

            Utils.log("No redirect action needed for current URL", 'info');
        },

        // NEW: Restore state from session storage
        restoreState: function() {
            try {
                const savedState = sessionStorage.getItem('uttx_state');
                if (savedState) {
                    const state = JSON.parse(savedState);

                    // Only restore if state is recent (within last 30 seconds)
                    if (state && state.timestamp && (Date.now() - state.timestamp) < 30000) {
                        Utils.state.flags.mainPageTokenRequested = state.mainPageTokenRequested || false;
                        Utils.state.pendingMainPageRedirect = state.pendingMainPageRedirect || false;

                        Utils.log("Restored state from previous page", 'success');
                    } else {
                        Utils.log("Saved state too old, not restoring", 'warning');
                    }

                    // Clear after restoring
                    sessionStorage.removeItem('uttx_state');
                }
            } catch (err) {
                Utils.log("Error restoring state: " + err.message, 'error');
            }
        }
    };

    // Token Generator Module
    const TokenGenerator = {
        generateToken: function() {
            if (Utils.state.flags.tokenGenerated || Utils.state.flags.processing) {
                Utils.updateStatus("Token already generated or in progress", "warning");
                return;
            }

            // Reset status flags for new generation
            Utils.state.flags.tokenGenerated = false;
            Utils.state.flags.tokenCopied = false;
            Utils.state.flags.tokenSaved = false;

            // Only generate if we're on the TokenBelut.php page
            if (!window.location.href.includes('TokenBelut.php')) {
                Utils.log("Not on generation page, skipping token generation", 'warning');

                // NEW: Set flag if we're on the main page
                if (window.location.href === "https://62.146.236.10/") {
                    Utils.state.flags.mainPageTokenRequested = true;
                    Utils.state.pendingMainPageRedirect = true;
                    Utils.log("Main page token generation requested, setting flag", 'info');
                }

                if (CONFIG.ENABLE_REDIRECT) {
                    Utils.updateStatus("Redirecting to token generation page...", "info");
                    RedirectHandler.performRedirect("https://generatetoken.my.id/samarinda/TokenBelut.php", "Auto-redirect to generation page");
                }
                return;
            }

            Utils.state.flags.processing = true;
            Utils.state.startTime = Date.now();
            Utils.updateStatus("Starting token generation...", "info");
            Utils.log("Starting token generation process", 'info');
            Utils.trackEvent('token', 'generation_start', window.location.href);

            // Find input and button
            this.findElements();
        },

        findElements: function() {
            // Smart element detection - try multiple selectors
            const hwidInput = document.getElementById('hwid') ||
                             document.querySelector('input[name="hwid"]') ||
                             document.querySelector('input[type="text"]') ||
                             document.querySelector('input');

            const generateBtn = document.getElementById('generateBtn') ||
                              document.querySelector('button.generate-btn') ||
                              document.querySelector('input[type="submit"]') ||
                              document.querySelector('button[type="submit"]') ||
                              document.querySelector('button');

            if (!hwidInput || !generateBtn) {
                Utils.log("Form elements not found, waiting...", 'warning');
                Utils.updateStatus("Waiting for page elements...", "warning");

                // Retry after a short delay
                setTimeout(() => {
                    // Increment attempt counter
                    this.elementFindAttempts = (this.elementFindAttempts || 0) + 1;

                    if (this.elementFindAttempts > 10) {
                        Utils.log("Failed to find form elements after multiple attempts", 'error');
                        Utils.updateStatus("Failed to find form elements", "error");
                        Utils.state.flags.processing = false;
                        Utils.showNotification("Generation Failed", "Could not find the required form elements. Please try again or check if the website structure changed.", 'error');
                        return;
                    }

                    this.findElements();
                }, 500);
                return;
            }

            Utils.log("Form elements found, proceeding with generation", 'success');

            // Set values and submit form
            this.submitForm(hwidInput, generateBtn);
        },

        submitForm: function(hwidInput, generateBtn) {
            // Input token with animation
            this.animatedInput(hwidInput, CONFIG.AUTH_TOKEN, () => {
                Utils.triggerEvent(hwidInput, 'input');
                Utils.triggerEvent(hwidInput, 'change');

                setTimeout(() => {
                    // Highlight button before clicking
                    generateBtn.style.boxShadow = '0 0 10px rgba(79, 70, 229, 0.8)';

                    setTimeout(() => {
                        generateBtn.click();
                        Utils.updateStatus("Generation in progress...", "warning");
                        Utils.log("Form submitted, monitoring for results", 'info');

                        // Start monitoring for results
                        this.monitorGeneration();
                    }, 300);
                }, 300);
            });
        },

        animatedInput: function(input, value, callback) {
            // Simulate human typing
            let i = 0;
            const interval = setInterval(() => {
                input.value = value.substring(0, i + 1);
                i++;

                if (i >= value.length) {
                    clearInterval(interval);
                    if (callback) callback();
                }
            }, 20);
        },

        monitorGeneration: function() {
            const startTime = Date.now();
            const maxWaitTime = 15000; // 15 seconds max

            const checkInterval = setInterval(() => {
                if (this.checkForExistingToken()) {
                    clearInterval(checkInterval);
                    this.handleTokenResult();
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed > maxWaitTime) {
                    clearInterval(checkInterval);
                    Utils.updateStatus("Generation timeout - retrying...", "error");
                    Utils.log("Generation timeout, attempting retry", 'error');

                    // Record failure
                    Utils.trackEvent('token', 'generation_timeout', window.location.href);

                    // Retry once
                    Utils.state.flags.processing = false;
                    setTimeout(() => {
                        this.generateToken();
                    }, 3000);
                } else {
                    // Update progress
                    const remaining = Math.ceil((maxWaitTime - elapsed) / 1000);
                    const progress = Math.round((elapsed / maxWaitTime) * 100);
                    Utils.updateStatus(`Generating... ${progress}% (${remaining}s remaining)`, "warning");

                    // Update progress bar if it exists
                    const progressBar = document.getElementById('utt-progress-bar');
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                }
            }, CONFIG.TOKEN_CHECK_INTERVAL);
        },

        checkForExistingToken: function() {
            // Enhanced token detection
            const tokenSelectors = [
                '[id*="token"]',
                '[class*="token"]',
                '.result',
                '#token_display',
                '.token-result',
                'textarea',
                '.code',
                'pre',
                '[id*="result"]'
            ];

            for (const selector of tokenSelectors) {
                const elements = document.querySelectorAll(selector);

                for (const el of elements) {
                    const tokenText = el.textContent.trim();

                    if (tokenText.length > 10 &&
                        !tokenText.toLowerCase().includes('generate') &&
                        !tokenText.toLowerCase().includes('click') &&
                        !tokenText.toLowerCase().includes('button')) {

                        Utils.state.resultToken = tokenText;
                        Utils.state.flags.tokenGenerated = true;
                        Utils.log(`Found token: ${tokenText.substring(0, 8)}...`, 'success');
                        return true;
                    }
                }
            }

            return false;
        },

        handleTokenResult: function() {
            if (!Utils.state.resultToken) return;

            Utils.state.flags.tokenGenerated = true;
            Utils.state.flags.processing = false;

            const processingTime = Date.now() - Utils.state.startTime;
            Utils.log(`Token generated in ${Utils.formatDuration(processingTime)}: ${Utils.state.resultToken.substring(0, 8)}...`, 'success');

            // Record success
            Utils.trackEvent('token', 'generation_success', window.location.href);

            // Update UI to show completion
            Utils.updateStatus(`Token generated successfully! (${Utils.formatDuration(processingTime)})`, "success");

            // Update token display
            const tokenDisplay = document.getElementById('utt-token-display');
            if (tokenDisplay) {
                tokenDisplay.textContent = Utils.state.resultToken;
                tokenDisplay.style.display = 'block';
                tokenDisplay.classList.add('token-reveal');
            }

            // Update buttons
            const generateBtn = document.getElementById('utt-generate-btn');
            const copyBtn = document.getElementById('utt-copy-btn');
            const regenerateBtn = document.getElementById('utt-regenerate-btn');

            if (generateBtn) generateBtn.style.display = 'none';
            if (copyBtn) copyBtn.style.display = 'block';
            if (regenerateBtn) regenerateBtn.style.display = 'block';

            // Hide progress bar
            const progressContainer = document.getElementById('utt-progress-container');
            if (progressContainer) progressContainer.style.display = 'none';

            // NEW: Use safe clipboard copy method
            Utils.safeClipboardCopy(Utils.state.resultToken);

            // Save to history (which will trigger checkAndShowSuccessMessage)
            Utils.saveTokenToHistory(Utils.state.resultToken);
        }
    };

    // UI Module
    const UIManager = {
        setupUI: function() {
            if (Utils.state.flags.uiInjected) return;

            // Add styles
            this.injectStyles();

            // Create main panel
            this.createPanel();

            // Add event listeners
            this.addEventListeners();

            // NEW: Intercept the main page generate new token button
            this.interceptMainPageButton();

            Utils.state.flags.uiInjected = true;
            Utils.log("Enhanced UI setup completed", 'success');
        },

        injectStyles: function() {
            GM_addStyle(`
                /* Animations */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @keyframes slideInRight {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                @keyframes statusPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.01); }
                    100% { transform: scale(1); }
                }

                @keyframes blockPulse {
                    0% { background-color: rgba(245,158,11,0.1); }
                    50% { background-color: rgba(245,158,11,0.2); }
                    100% { background-color: rgba(245,158,11,0.1); }
                }

                @keyframes progressGlow {
                    0% { box-shadow: 0 0 5px rgba(79,70,229,0.3); }
                    50% { box-shadow: 0 0 8px rgba(79,70,229,0.6); }
                    100% { box-shadow: 0 0 5px rgba(79,70,229,0.3); }
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes shimmer {
                    0% { background-position: -100% 0; }
                    100% { background-position: 200% 0; }
                }

                .token-reveal {
                    animation: fadeIn 0.5s ease, shimmer 2s infinite linear;
                    background: linear-gradient(
                        90deg,
                        rgba(79,70,229,0.1),
                        rgba(59,130,246,0.2),
                        rgba(79,70,229,0.1)
                    );
                    background-size: 200% 100%;
                }

                /* Main Panel */
                .utt-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 320px;
                    background: ${CONFIG.THEME.BACKGROUND};
                    border: 1px solid rgba(79,70,229,0.3);
                    border-radius: 12px;
                    padding: 20px;
                    z-index: 9999;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2), 0 0 15px rgba(79,70,229,0.2);
                    font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    animation: fadeIn 0.5s ease;
                    max-height: 90vh;
                    overflow-y: auto;
                    color: ${CONFIG.THEME.TEXT};
                }

                .utt-panel.collapsed {
                    width: 60px;
                    height: 60px;
                    overflow: hidden;
                    padding: 0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    background: linear-gradient(135deg, ${CONFIG.THEME.PRIMARY}, ${CONFIG.THEME.SECONDARY});
                }

                .utt-panel.collapsed:hover {
                    transform: scale(1.05);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3), 0 0 10px rgba(79,70,229,0.4);
                }

                .utt-panel::-webkit-scrollbar {
                    width: 6px;
                }

                .utt-panel::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }

                .utt-panel::-webkit-scrollbar-thumb {
                    background: ${CONFIG.THEME.SECONDARY};
                    border-radius: 10px;
                }

                .utt-panel::-webkit-scrollbar-thumb:hover {
                    background: ${CONFIG.THEME.PRIMARY};
                }

                /* Panel Header */
                .utt-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }

                .utt-panel-title {
                    font-weight: 600;
                    color: ${CONFIG.THEME.PRIMARY};
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    letter-spacing: 0.5px;
                }

                .utt-panel-version {
                    font-size: 11px;
                    color: rgba(255,255,255,0.5);
                    margin-left: 8px;
                    background: rgba(79,70,229,0.2);
                    padding: 2px 6px;
                    border-radius: 10px;
                }

                .utt-panel-controls {
                    display: flex;
                    gap: 5px;
                }

                .utt-control-btn {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: ${CONFIG.THEME.TEXT};
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s ease;
                }

                .utt-control-btn:hover {
                    background: rgba(255,255,255,0.2);
                    transform: scale(1.05);
                }

                /* Status Indicators */
                .utt-status {
                    padding: 12px 16px;
                    margin: 10px 0;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }

                .utt-status.success {
                    background: rgba(16,185,129,0.1);
                    border-left: 3px solid ${CONFIG.THEME.SUCCESS};
                    color: ${CONFIG.THEME.SUCCESS};
                }

                .utt-status.error {
                    background: rgba(239,68,68,0.1);
                    border-left: 3px solid ${CONFIG.THEME.ERROR};
                    color: ${CONFIG.THEME.ERROR};
                }

                .utt-status.warning {
                    background: rgba(245,158,11,0.1);
                    border-left: 3px solid ${CONFIG.THEME.WARNING};
                    color: ${CONFIG.THEME.WARNING};
                }

                .utt-status.info {
                    background: rgba(59,130,246,0.1);
                    border-left: 3px solid ${CONFIG.THEME.INFO};
                    color: ${CONFIG.THEME.INFO};
                }

                /* Buttons */
                .utt-btn {
                    background: linear-gradient(135deg, ${CONFIG.THEME.PRIMARY}, ${CONFIG.THEME.SECONDARY});
                    border: none;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 8px 0;
                    width: 100%;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    position: relative;
                    overflow: hidden;
                    letter-spacing: 0.5px;
                }

                .utt-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(0,0,0,0.2), 0 0 5px rgba(79,70,229,0.3);
                }

                .utt-btn:active {
                    transform: translateY(0);
                }

                .utt-btn:disabled {
                    background: linear-gradient(135deg, #4a4a6a, #3a3a5a);
                    cursor: not-allowed;
                    transform: none;
                    opacity: 0.7;
                }

                .utt-btn::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255,255,255,0.1),
                        transparent
                    );
                    transform: translateX(-100%);
                }

                .utt-btn:hover::after {
                    animation: shimmer 1.5s infinite;
                }

                #utt-regenerate-btn {
                    background: linear-gradient(135deg, #F59E0B, #F97316);
                    display: none;
                }

                #utt-copy-btn {
                    background: linear-gradient(135deg, #3B82F6, #60A5FA);
                    display: none;
                }

                /* Token Display */
                #utt-token-display {
                    word-break: break-all;
                    padding: 16px;
                    background: rgba(15,23,42,0.8);
                    border-radius: 8px;
                    margin: 15px 0;
                    font-family: 'Fira Code', 'Consolas', monospace;
                    color: ${CONFIG.THEME.SUCCESS};
                    border: 1px solid rgba(79,70,229,0.3);
                    display: none;
                    position: relative;
                    transition: all 0.3s ease;
                    font-size: 14px;
                    letter-spacing: 0.5px;
                }

                #utt-token-display:hover {
                    border-color: rgba(79,70,229,0.6);
                    box-shadow: 0 0 8px rgba(79,70,229,0.2);
                }

                /* Success Message */
                .utt-completed {
                    color: ${CONFIG.THEME.SUCCESS};
                    font-weight: 600;
                    text-align: center;
                    margin: 15px 0;
                    padding: 12px;
                    background: rgba(16,185,129,0.1);
                    border-radius: 8px;
                    border: 1px solid rgba(16,185,129,0.3);
                    animation: fadeIn 0.5s ease;
                    letter-spacing: 0.5px;
                }

                /* Ad Blocker Status */
                .utt-adblock-status {
                    background: rgba(245,158,11,0.1);
                    border-left: 3px solid ${CONFIG.THEME.WARNING};
                    color: ${CONFIG.THEME.WARNING};
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    margin: 15px 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                /* Toggles */
                .utt-toggle {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: ${CONFIG.THEME.TEXT};
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .utt-toggle.active {
                    background: ${CONFIG.THEME.PRIMARY};
                    color: white;
                    border-color: ${CONFIG.THEME.PRIMARY};
                }

                /* URL Info */
                .utt-url-info {
                    background: rgba(15,23,42,0.6);
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.6);
                    margin: 10px 0;
                    word-break: break-all;
                }

                /* Progress Bar */
                .utt-progress-container {
                    height: 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 15px 0;
                }

                .utt-progress-bar {
                    height: 100%;
                    width: 0%;
                    background: linear-gradient(90deg, ${CONFIG.THEME.PRIMARY}, ${CONFIG.THEME.SECONDARY});
                    border-radius: 4px;
                    transition: width 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .utt-progress-bar::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255,255,255,0.2),
                        transparent
                    );
                    animation: shimmer 2s infinite;
                }

                /* Tabs Navigation */
                .utt-tabs {
                    display: flex;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    margin: 20px 0 15px;
                    gap: 2px;
                }

                .utt-tab {
                    padding: 10px 15px;
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.6);
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.3s ease;
                    border-bottom: 2px solid transparent;
                    flex: 1;
                    text-align: center;
                }

                .utt-tab.active {
                    color: ${CONFIG.THEME.PRIMARY};
                    border-bottom: 2px solid ${CONFIG.THEME.PRIMARY};
                    background: rgba(79,70,229,0.05);
                }

                .utt-tab:hover:not(.active) {
                    color: ${CONFIG.THEME.SECONDARY};
                    background: rgba(255,255,255,0.03);
                }

                /* Tab Content */
                .utt-tab-content {
                    display: none;
                    padding: 10px 0;
                    animation: fadeIn 0.3s ease;
                }

                .utt-tab-content.active {
                    display: block;
                }

                /* History Items */
                .utt-history-empty {
                    text-align: center;
                    color: rgba(255,255,255,0.5);
                    padding: 25px 0;
                    font-size: 13px;
                    font-style: italic;
                }

                .utt-history-item {
                    background: rgba(15,23,42,0.5);
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    font-size: 13px;
                    border-left: 3px solid ${CONFIG.THEME.SECONDARY};
                    animation: slideIn 0.3s ease;
                    transition: all 0.2s ease;
                }

                .utt-history-item:hover {
                    background: rgba(15,23,42,0.7);
                    transform: translateY(-2px);
                    box-shadow: 0 3px 8px rgba(0,0,0,0.1);
                }

                .utt-history-token {
                    color: ${CONFIG.THEME.PRIMARY};
                    font-family: 'Fira Code', monospace;
                    margin-bottom: 8px;
                    word-break: break-all;
                }

                .utt-history-date {
                    color: rgba(255,255,255,0.5);
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                }

                .utt-history-date::before {
                    content: '🕒';
                    margin-right: 5px;
                    font-size: 10px;
                }

                .utt-history-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }

                .utt-history-actions button {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: ${CONFIG.THEME.TEXT};
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex: 1;
                }

                .utt-history-actions button:hover {
                    background: rgba(255,255,255,0.15);
                    transform: translateY(-1px);
                }

                .utt-history-copy {
                    border-left: 2px solid ${CONFIG.THEME.SECONDARY} !important;
                }

                .utt-history-copy:hover {
                    background: rgba(59,130,246,0.15) !important;
                }

                .utt-history-delete {
                    border-left: 2px solid ${CONFIG.THEME.ERROR} !important;
                }

                .utt-history-delete:hover {
                    background: rgba(239,68,68,0.15) !important;
                }

                /* Settings */
                .utt-settings-group {
                    margin-bottom: 20px;
                }

                .utt-settings-title {
                    font-size: 13px;
                    color: ${CONFIG.THEME.SECONDARY};
                    margin-bottom: 8px;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                }

                .utt-setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    border-radius: 8px;
                    margin-bottom: 6px;
                    background: rgba(15,23,42,0.4);
                    transition: all 0.2s ease;
                }

                .utt-setting-item:hover {
                    background: rgba(15,23,42,0.6);
                }

                .utt-setting-label {
                    font-size: 13px;
                    color: ${CONFIG.THEME.TEXT};
                }

                /* Logs */
                .utt-log-item {
                    font-size: 12px;
                    padding: 8px 10px;
                    border-radius: 6px;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    background: rgba(15,23,42,0.4);
                }

                .utt-log-time {
                    color: rgba(255,255,255,0.5);
                    margin-right: 8px;
                    font-size: 10px;
                    white-space: nowrap;
                }

                .utt-log-info {
                    color: ${CONFIG.THEME.INFO};
                }

                .utt-log-success {
                    color: ${CONFIG.THEME.SUCCESS};
                }

                .utt-log-warning {
                    color: ${CONFIG.THEME.WARNING};
                }

                .utt-log-error {
                    color: ${CONFIG.THEME.ERROR};
                }

                /* Misc */
                .utt-icon {
                    margin-right: 8px;
                }

                .utt-loader {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(79,70,229,0.3);
                    border-radius: 50%;
                    border-top-color: ${CONFIG.THEME.PRIMARY};
                    animation: spin 1s linear infinite;
                    margin-right: 8px;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .utt-panel {
                        width: 300px;
                        top: 10px;
                        right: 10px;
                        padding: 15px;
                    }

                    .utt-btn {
                        padding: 10px 14px;
                        font-size: 13px;
                    }

                    .utt-status {
                        padding: 10px;
                        font-size: 12px;
                    }
                }

                @media (max-width: 400px) {
                    .utt-panel {
                        width: calc(100% - 40px);
                        right: 10px;
                        left: 10px;
                    }
                }
            `);
        },

        createPanel: function() {
            const panel = document.createElement('div');
            panel.className = 'utt-panel';
            panel.id = 'utt-panel';

            panel.innerHTML = `
                <div class="utt-panel-header">
                    <div class="utt-panel-title">
                        <span class="utt-icon">✨</span> Ultimate Token Toolkit
                        <span class="utt-panel-version">${Utils.version}</span>
                    </div>
                    <div class="utt-panel-controls">
                        <button class="utt-control-btn" id="utt-toggle-panel" title="Collapse panel">−</button>
                    </div>
                </div>

                <div class="utt-url-info">
                    📍 ${window.location.pathname}
                </div>

                <div class="utt-adblock-status" id="utt-adblock-status">
                    🛡️ Blocked: ${Utils.state.blockedAds} ads
                    <button class="utt-toggle ${CONFIG.AD_BLOCK_ENABLED ? 'active' : ''}" id="utt-adblock-toggle">
                        ${CONFIG.AD_BLOCK_ENABLED ? 'ON' : 'OFF'}
                    </button>
                </div>

                <div class="utt-status info" id="utt-status">
                    Initializing system...
                </div>

                <div class="utt-progress-container" id="utt-progress-container">
                    <div class="utt-progress-bar" id="utt-progress-bar"></div>
                </div>

                <div id="utt-token-display"></div>

                <button id="utt-generate-btn" class="utt-btn">
                    <span class="utt-icon">⚡</span> GENERATE TOKEN
                </button>

                <button id="utt-copy-btn" class="utt-btn">
                    <span class="utt-icon">📋</span> COPY TOKEN
                </button>

                <button id="utt-regenerate-btn" class="utt-btn">
                    <span class="utt-icon">🔄</span> GENERATE NEW TOKEN
                </button>

                <div class="utt-tabs">
                    <button class="utt-tab active" data-tab="history">History</button>
                    <button class="utt-tab" data-tab="settings">Settings</button>
                    <button class="utt-tab" data-tab="logs">Logs</button>
                </div>

                <div class="utt-tab-content active" data-tab-content="history">
                    <div id="utt-token-history">
                        <div class="utt-history-empty">No token history</div>
                    </div>
                </div>

                <div class="utt-tab-content" data-tab-content="settings">
                    <div class="utt-settings-group">
                        <div class="utt-settings-title">General Settings</div>
                        <div class="utt-setting-item">
                            <div class="utt-setting-label">Auto Redirect</div>
                            <button class="utt-toggle ${CONFIG.ENABLE_REDIRECT ? 'active' : ''}" id="utt-redirect-toggle">
                                ${CONFIG.ENABLE_REDIRECT ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div class="utt-setting-item">
                            <div class="utt-setting-label">Save Token History</div>
                            <button class="utt-toggle ${CONFIG.SAVE_TOKEN_HISTORY ? 'active' : ''}" id="utt-history-toggle">
                                ${CONFIG.SAVE_TOKEN_HISTORY ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div class="utt-setting-item">
                            <div class="utt-setting-label">Show Notifications</div>
                            <button class="utt-toggle ${CONFIG.SHOW_NOTIFICATIONS ? 'active' : ''}" id="utt-notifications-toggle">
                                ${CONFIG.SHOW_NOTIFICATIONS ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="utt-tab-content" data-tab-content="logs">
                    <div id="utt-logs">
                        <div class="utt-log-item utt-log-info">
                            <div class="utt-log-time">${new Date().toLocaleTimeString()}</div>
                            System initialized
                        </div>
                    </div>
                </div>
            `;

            // For collapsed mode, add the icon-only view
            const iconContainer = document.createElement('div');
            iconContainer.innerHTML = '✨';
            iconContainer.style.fontSize = '24px';
            iconContainer.style.display = 'none';
            panel.appendChild(iconContainer);

            document.body.appendChild(panel);

            // Update token history UI
            Utils.updateTokenHistoryUI();

            // Update logs panel
            this.updateLogsPanel();
        },

        togglePanel: function() {
            const panel = document.getElementById('utt-panel');
            const toggleBtn = document.getElementById('utt-toggle-panel');
            const iconContainer = panel.querySelector('div:last-child');

            if (!Utils.state.flags.panelCollapsed) {
                // Collapse panel
                panel.classList.add('collapsed');
                iconContainer.style.display = 'block';
                toggleBtn.textContent = '+';
                toggleBtn.title = 'Expand panel';
            } else {
                // Expand panel
                panel.classList.remove('collapsed');
                iconContainer.style.display = 'none';
                toggleBtn.textContent = '−';
                toggleBtn.title = 'Collapse panel';
            }

            Utils.state.flags.panelCollapsed = !Utils.state.flags.panelCollapsed;
        },

        updateLogsPanel: function() {
            const logsContainer = document.getElementById('utt-logs');
            if (!logsContainer) return;

            let html = '';
            Utils.state.statusHistory.slice(0, 10).forEach(status => {
                const time = new Date(status.timestamp).toLocaleTimeString();
                html += `
                    <div class="utt-log-item utt-log-${status.type}">
                        <div class="utt-log-time">${time}</div>
                        ${status.message}
                    </div>
                `;
            });

            logsContainer.innerHTML = html;
        },

        // Intercept the main page Generate New Token button
        interceptMainPageButton: function() {
            if (window.location.href === "https://62.146.236.10/") {
                Utils.log("Setting up main page button interception", 'info');

                // Wait for DOM to be ready
                const checkButton = () => {
                    // Try different selectors that might match the Generate New Token button
                    const possibleSelectors = [
                        'a[href*="token"]',
                        'button:contains("Generate")',
                        'button:contains("Token")',
                        'a:contains("Generate")',
                        'a:contains("Token")',
                        '.btn',
                        '.button',
                        'input[type="button"]',
                        'input[type="submit"]'
                    ];

                    let foundButton = false;

                    for (const selector of possibleSelectors) {
                        try {
                            const elements = $(selector);

                            if (elements.length > 0) {
                                elements.each(function() {
                                    const el = $(this);
                                    const text = el.text().toLowerCase();

                                    // If this looks like a generate token button
                                    if (text.includes('generate') || text.includes('token') ||
                                        text.includes('new') || el.attr('href')?.includes('token')) {

                                        Utils.log(`Found potential main page button: ${text}`, 'success');

                                        // Override click event
                                        el.off('click').on('click', function(e) {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            Utils.log("Main page button clicked, starting generation flow", 'info');
                                            Utils.state.flags.mainPageTokenRequested = true;
                                            Utils.state.pendingMainPageRedirect = true;

                                            // Start the generation process
                                            TokenGenerator.generateToken();
                                            return false;
                                        });

                                        foundButton = true;
                                    }
                                });
                            }
                        } catch (err) {
                            // Some selectors might not be valid, ignore errors
                        }
                    }

                    if (!foundButton) {
                        // If no button found yet, try again in a moment
                        setTimeout(checkButton, 500);
                    } else {
                        Utils.log("Main page button successfully intercepted", 'success');
                    }
                };

                // Start checking for buttons
                setTimeout(checkButton, 1000);
            }
        },

        addEventListeners: function() {
            // Generate button
            document.getElementById('utt-generate-btn')?.addEventListener('click', () => {
                TokenGenerator.generateToken();
            });

            // Copy button
            document.getElementById('utt-copy-btn')?.addEventListener('click', () => {
                Utils.safeClipboardCopy(Utils.state.resultToken);
            });

            // Regenerate button
            document.getElementById('utt-regenerate-btn')?.addEventListener('click', () => {
                Utils.state.flags.tokenGenerated = false;
                Utils.state.flags.processing = false;
                Utils.state.flags.tokenCopied = false;
                Utils.state.flags.tokenSaved = false;
                Utils.state.resultToken = "";

                // Reset UI
                document.getElementById('utt-token-display').style.display = 'none';
                document.getElementById('utt-generate-btn').style.display = 'block';
                document.getElementById('utt-copy-btn').style.display = 'none';
                document.getElementById('utt-regenerate-btn').style.display = 'none';

                // Remove completion indicator if exists
                const completedDiv = document.querySelector('.utt-completed');
                if (completedDiv) completedDiv.remove();

                // Start new generation
                setTimeout(() => {
                    TokenGenerator.generateToken();
                }, 500);
            });

            // Ad blocker toggle
            document.getElementById('utt-adblock-toggle')?.addEventListener('click', (e) => {
                CONFIG.AD_BLOCK_ENABLED = !CONFIG.AD_BLOCK_ENABLED;
                e.target.textContent = CONFIG.AD_BLOCK_ENABLED ? 'ON' : 'OFF';
                e.target.className = `utt-toggle ${CONFIG.AD_BLOCK_ENABLED ? 'active' : ''}`;

                if (CONFIG.AD_BLOCK_ENABLED && !Utils.state.flags.adBlockerActive) {
                    AdBlocker.initialize();
                }

                // Save setting
                try {
                    GM_setValue('adBlockEnabled', CONFIG.AD_BLOCK_ENABLED);
                } catch (err) {}

                Utils.log(`Ad blocker ${CONFIG.AD_BLOCK_ENABLED ? 'enabled' : 'disabled'}`, 'info');
            });

            // Panel toggle
            document.getElementById('utt-toggle-panel')?.addEventListener('click', () => {
                this.togglePanel();
            });

            // Clicking the collapsed panel
            document.getElementById('utt-panel')?.addEventListener('click', (e) => {
                if (Utils.state.flags.panelCollapsed) {
                    this.togglePanel();
                }
            });

            // Tab navigation
            document.querySelectorAll('.utt-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    // Deactivate all tabs
                    document.querySelectorAll('.utt-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.utt-tab-content').forEach(c => c.classList.remove('active'));

                    // Activate clicked tab
                    tab.classList.add('active');
                    const tabName = tab.getAttribute('data-tab');
                    document.querySelector(`.utt-tab-content[data-tab-content="${tabName}"]`).classList.add('active');

                    // Update special content
                    if (tabName === 'logs') {
                        this.updateLogsPanel();
                    } else if (tabName === 'history') {
                        Utils.updateTokenHistoryUI();
                    }
                });
            });

            // Settings toggles
            document.getElementById('utt-redirect-toggle')?.addEventListener('click', (e) => {
                CONFIG.ENABLE_REDIRECT = !CONFIG.ENABLE_REDIRECT;
                e.target.textContent = CONFIG.ENABLE_REDIRECT ? 'ON' : 'OFF';
                e.target.className = `utt-toggle ${CONFIG.ENABLE_REDIRECT ? 'active' : ''}`;

                // Save setting
                try {
                    GM_setValue('enableRedirect', CONFIG.ENABLE_REDIRECT);
                } catch (err) {}

                Utils.log(`Auto redirect ${CONFIG.ENABLE_REDIRECT ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('utt-history-toggle')?.addEventListener('click', (e) => {
                CONFIG.SAVE_TOKEN_HISTORY = !CONFIG.SAVE_TOKEN_HISTORY;
                e.target.textContent = CONFIG.SAVE_TOKEN_HISTORY ? 'ON' : 'OFF';
                e.target.className = `utt-toggle ${CONFIG.SAVE_TOKEN_HISTORY ? 'active' : ''}`;

                // Save setting
                try {
                    GM_setValue('saveTokenHistory', CONFIG.SAVE_TOKEN_HISTORY);
                } catch (err) {}

                Utils.log(`Token history ${CONFIG.SAVE_TOKEN_HISTORY ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('utt-notifications-toggle')?.addEventListener('click', (e) => {
                CONFIG.SHOW_NOTIFICATIONS = !CONFIG.SHOW_NOTIFICATIONS;
                e.target.textContent = CONFIG.SHOW_NOTIFICATIONS ? 'ON' : 'OFF';
                e.target.className = `utt-toggle ${CONFIG.SHOW_NOTIFICATIONS ? 'active' : ''}`;

                // Save setting
                try {
                    GM_setValue('showNotifications', CONFIG.SHOW_NOTIFICATIONS);
                } catch (err) {}

                Utils.log(`Notifications ${CONFIG.SHOW_NOTIFICATIONS ? 'enabled' : 'disabled'}`, 'info');

                if (CONFIG.SHOW_NOTIFICATIONS) {
                    Utils.showNotification("Notifications Enabled", "You will now receive notifications for important events", 'info');
                }
            });
        },

        loadSavedSettings: function() {
            try {
                // Load saved settings if available
                CONFIG.AD_BLOCK_ENABLED = GM_getValue('adBlockEnabled', CONFIG.AD_BLOCK_ENABLED);
                CONFIG.ENABLE_REDIRECT = GM_getValue('enableRedirect', CONFIG.ENABLE_REDIRECT);
                CONFIG.SAVE_TOKEN_HISTORY = GM_getValue('saveTokenHistory', CONFIG.SAVE_TOKEN_HISTORY);
                CONFIG.SHOW_NOTIFICATIONS = GM_getValue('showNotifications', CONFIG.SHOW_NOTIFICATIONS);

                // Update UI to match loaded settings
                document.getElementById('utt-adblock-toggle').textContent = CONFIG.AD_BLOCK_ENABLED ? 'ON' : 'OFF';
                document.getElementById('utt-adblock-toggle').className = `utt-toggle ${CONFIG.AD_BLOCK_ENABLED ? 'active' : ''}`;

                document.getElementById('utt-redirect-toggle').textContent = CONFIG.ENABLE_REDIRECT ? 'ON' : 'OFF';
                document.getElementById('utt-redirect-toggle').className = `utt-toggle ${CONFIG.ENABLE_REDIRECT ? 'active' : ''}`;

                document.getElementById('utt-history-toggle').textContent = CONFIG.SAVE_TOKEN_HISTORY ? 'ON' : 'OFF';
                document.getElementById('utt-history-toggle').className = `utt-toggle ${CONFIG.SAVE_TOKEN_HISTORY ? 'active' : ''}`;

                document.getElementById('utt-notifications-toggle').textContent = CONFIG.SHOW_NOTIFICATIONS ? 'ON' : 'OFF';
                document.getElementById('utt-notifications-toggle').className = `utt-toggle ${CONFIG.SHOW_NOTIFICATIONS ? 'active' : ''}`;

                Utils.log('Loaded saved settings', 'info');
            } catch (err) {
                Utils.log('Failed to load settings: ' + err.message, 'error');
            }
        }
    };

    // Main Application
    const App = {
        initialize: function() {
            Utils.log(`Initializing Ultimate Token Toolkit Pro X v${Utils.version} on: ${window.location.href}`, 'info');
            Utils.trackEvent('app', 'initialize', window.location.href);

            // For /choose/ page, redirect immediately without UI setup
            if (window.location.href.includes('/choose/')) {
                Utils.log("On /choose/ page - redirecting immediately", 'info');
                RedirectHandler.handleRedirect();
                return;
            }

            // Initialize ad blocker first for better protection
            AdBlocker.initialize();

            // Set up UI
            UIManager.setupUI();

            // Load saved settings
            UIManager.loadSavedSettings();

            // Load token history
            try {
                Utils.state.tokenHistory = GM_getValue('tokenHistory', []);
            } catch (err) {
                Utils.log('Failed to load token history: ' + err.message, 'error');
            }

            // Process based on current page
            this.processCurrentPage();
        },

        processCurrentPage: function() {
            // Check for existing token first
            if (TokenGenerator.checkForExistingToken()) {
                TokenGenerator.handleTokenResult();
                return;
            }

            // Handle redirects based on current URL
            RedirectHandler.handleRedirect();

            // Welcome notification on main page
            if (window.location.href === "https://62.146.236.10/") {
                Utils.updateStatus("Ready - click Generate to start", "info");
                Utils.showNotification("UTT Pro X Ready", "Welcome! Click Generate to start token generation.", 'info');
            }
        }
    };

    // Start the app
    // Immediate execution for faster processing
    if (window.location.href.includes('/choose/')) {
        App.initialize();
    } else {
        // Initialize when page loads for other pages
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => App.initialize());
        } else {
            setTimeout(() => App.initialize(), CONFIG.INITIAL_DELAY);
        }
    }

    // Backup initialization for reliability
    setTimeout(() => {
        if (!Utils.state.flags.uiInjected) {
            Utils.log("Backup initialization triggered", 'warning');
            App.initialize();
        }
    }, 1000);
})();
