const baseUrl = "https://sorfi.org/";
const COUNTER_ALARM_NAME = "updateCounterAlarm";
const SUBTITLE_ALARM_NAME = "checkSubtitleAlarm";
const ALARM_PERIOD_MINUTES = 10;

let lastAvailableCount = 0;
let ID2 = 0;
let refTime = Math.round((new Date()).getTime() / 1000);

// Initialize storage if needed
chrome.storage.local.get(["isInitialized"], function(result) {
    if (!result.isInitialized) {
        chrome.storage.local.set({
            keypass: "0",
            isInitialized: true
        });
    }
});

// Update Counter
async function updateCounter(hint = 0) {
    chrome.action.setBadgeBackgroundColor({ color: "#e3423e" }); // Windows red

    try {
        // Get keypass from storage
        const result = await chrome.storage.local.get(["keypass"]);
        const keypass = result.keypass || "0";

        if (hint) {
            chrome.action.setBadgeText({ text: (lastAvailableCount + hint).toString() });
        }

        // Fetch data from API
        const response = await fetch(baseUrl + 'api/overview/' + keypass);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Process JSON and get unwatched and released count
        let availableCount = 0;
        for (let i = 0, len = data.length; i < len; i++) {
            if (data[i]["isAired"] && !data[i]["markedAsWatched"]) {
                ++availableCount;
            }
        }

        lastAvailableCount = availableCount;
        if (availableCount > 0) {
            chrome.action.setBadgeText({ text: availableCount.toString() });
        } else {
            chrome.action.setBadgeText({ text: "" });
        }
    } catch (error) {
        console.error("Error updating counter:", error);
    }
}

// Handle messages from other parts of the extension
function handleMessage(request, sender, sendResponse) {
    if (request.action === "requestUpdateCount") {
        updateCounter(request.counterAdjust);
    }
    return true; // Indicates async response
}

// Show notification for new subtitle
function showNotification(subtitle) {
    ID2++;

    const opts = {
        type: "basic",
        title: "Új sorozat felirat",
        message: `${subtitle["programmePrimaryTitle"]} ${subtitle["episodeSeason"]}×${subtitle["episodeNumber"]}`,
        iconUrl: "assets/sorfi_icon128.png",
        buttons: [{title: "Sorozat figyelő megnyitása"}],
        requireInteraction: true
    };

    chrome.notifications.create("id" + ID2, opts, function() {
        console.log("Új felirat ablak: " + ID2);
    });
}

// Handle notification button click
function notificationBtnClick(notID, iBtn) {
    chrome.tabs.create({ 'url': baseUrl });
}

// Check for new subtitles
async function checkSubtitle() {
    try {
        // Get settings from storage
        const result = await chrome.storage.local.get(["keypass", "subtitleChecking"]);
        const keypass = result.keypass;
        const subtitleChecking = result.subtitleChecking;

        if (!subtitleChecking || !keypass || keypass === "0") {
            return;
        }

        // Get timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Prepare form data
        const formData = new URLSearchParams();
        formData.append("referenceZone", timeZone);

        // Fetch data from API
        const response = await fetch(
            `${baseUrl}api/subtitle/alert/${refTime}/${keypass}`, 
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const text = await response.text();

        if (text.length >= 1) {
            const subs = JSON.parse(text);
            for (let i = 0, len = subs.length; i < len; i++) {
                showNotification(subs[i]);
            }
        }

        refTime = Math.round((new Date()).getTime() / 1000);
    } catch (error) {
        console.error("Error checking subtitles:", error);
    }
}

// Set up alarms for periodic tasks
function setupAlarms() {
    // Create alarm for updating counter
    chrome.alarms.create(COUNTER_ALARM_NAME, {
        periodInMinutes: ALARM_PERIOD_MINUTES
    });

    // Create alarm for checking subtitles
    chrome.alarms.create(SUBTITLE_ALARM_NAME, {
        periodInMinutes: ALARM_PERIOD_MINUTES
    });
}

// Handle alarm events
function handleAlarm(alarm) {
    if (alarm.name === COUNTER_ALARM_NAME) {
        updateCounter();
    } else if (alarm.name === SUBTITLE_ALARM_NAME) {
        checkSubtitle();
    }
}

// Event listeners
chrome.runtime.onMessage.addListener(handleMessage);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.notifications.onButtonClicked.addListener(notificationBtnClick);

// Initialize on install or update
chrome.runtime.onInstalled.addListener(() => {
    setupAlarms();
    updateCounter();
    checkSubtitle();
});

// Initialize when service worker starts
setupAlarms();
updateCounter();
checkSubtitle();
