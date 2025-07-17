/*
 * Sorozat figyelő 10 | https://sorfi.org
 * (c) 2009-2023 Bence VÁNKOS | https://resist.hu
 *
 * Script of option page of browser extension
 */

// Initialize options page with theme
function initTheme(isNightMode) {
    if (isNightMode) {
        document.querySelector("head").insertAdjacentHTML("afterbegin", `<link href="../css/sorfi-bootstrap-chrome-dark.css" rel="stylesheet">`);
    } else {
        document.querySelector("head").insertAdjacentHTML("afterbegin", `<link href="../css/sorfi-bootstrap-chrome.css" rel="stylesheet">`);
    }
}

// Load settings and initialize page
window.addEventListener('load', function() {
    // Get all settings from storage
    chrome.storage.local.get(["keypass", "night", "subtitleChecking"], function(result) {
        // Set API key field
        if (result.keypass) {
            options.nptKp.value = result.keypass;
        }

        // Set night mode checkbox
        if (result.night === true) {
            document.getElementById("nptNight").checked = true;
        }

        // Initialize theme based on setting
        initTheme(result.night === true);

        // Set subtitle checking checkbox
        if (result.subtitleChecking === true) {
            document.getElementById("nptSub").checked = true;
        }

        // Save API key setting
        options.nptKp.onchange = function() {
            chrome.storage.local.set({ keypass: options.nptKp.value }, function() {
                document.getElementById("console").innerText = "API kulcs automatikusan mentésre került.";
            });
        };

        // Save night mode setting
        options.nptNight.onchange = function() {
            chrome.storage.local.set({ night: options.nptNight.checked }, function() {
                document.getElementById("console").innerText = "Téma beállítás automatikusan mentésre került.";
            });
        };

        // Save subtitle checking setting
        options.nptSub.onchange = function() {
            chrome.storage.local.set({ subtitleChecking: options.nptSub.checked }, function() {
                document.getElementById("console").innerText = "Felirat értesítő beállítás automatikusan mentésre került.";
            });
        };
    });
});
