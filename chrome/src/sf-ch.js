const baseUrl = "https://sorfi.org/";

// Initialize global variables
window.nightMode = false;

window.addEventListener('load', function() {
	// Display the footer link to the settings page
	document.getElementById("footer").insertAdjacentHTML('afterbegin', `<small class=""><a href="${chrome.runtime.getURL("src/sf-ch-opt.html")}" target="_blank">Beállítások</a></small>`);

	// Get settings and cached content from storage
	chrome.storage.local.get(["contentCache", "contentCacheTS", "night"], function(result) {
		// If the content cache is from the last hour, instantly display the content
		if (result.contentCache && result.contentCacheTS) {
			let oldestTS = Date.now() - 3600 * 1000;
			if (oldestTS < result.contentCacheTS) {
				document.getElementById("sfdata").insertAdjacentHTML("afterbegin", result.contentCache);
			}
		}

		// Set global night mode variable
		window.nightMode = result.night === true;

		// Apply theme based on night mode setting
		if (window.nightMode) {
			document.querySelector("head").insertAdjacentHTML("afterbegin", `<link href="../css/sorfi-bootstrap-chrome-dark.css" rel="stylesheet">`);
		} else {
			document.querySelector("head").insertAdjacentHTML("afterbegin", `<link href="../css/sorfi-bootstrap-chrome.css" rel="stylesheet">`);
		}
	});
});

// Downloaded/Watched button handler
function toggleButtonAction(element)
{
	let action = element.getAttribute("data-action");
	let episodeId = element.getAttribute("data-episode-id")
	let programmeId = element.getAttribute("data-programme-id");
	let newImageSrc = '';
	let needCounterUpdate = false;

	// Determine needed operation and if successful the image to set the button to
	if (action === "d" || action === "xd") {
		if (element.src.indexOf("xd") == -1) {
			action = "xd";
			newImageSrc = "../icons/xd.svg";
		} else {
			action = "d";
			newImageSrc = "../icons/d.svg";
		}
	} else if (action === "w") {
		needCounterUpdate = true;
		if (element.src.indexOf("xw") == -1) {
			action = "xw";
			newImageSrc = "../icons/xw.svg";
		} else {
			action = "w";
			newImageSrc = "../icons/w.svg";
		}
	}
	else {
		return;
	}

	// Get API key from storage
	chrome.storage.local.get(["keypass"], function(result) {
		if (!result.keypass) {
			console.error("API key not found");
			return;
		}

		// Send the request
		const req = new XMLHttpRequest();
		req.open("POST", `${baseUrl}api/mark/${action}/${programmeId}/${episodeId}/${result.keypass}`, true);
		req.onreadystatechange = function () {
			if (req.readyState !== 4 || req.status !== 200) {
				return;
			}

			element.setAttribute("src", newImageSrc);

			// Message the background script to update the episode counter
			if (needCounterUpdate)
				chrome.runtime.sendMessage({
					action: 'requestUpdateCount',
					counterAdjust: action === 'w' ? -1 : 1
				});
		};
		req.send();
	});
}

// Returns formatted HTML content for an episode
function renderEpisodeRow(episode)
{
	if (episode["markedAsWatched"]) {
		return;
	}

	let bgClass = "bg-light";
	// Get night mode setting from global variable set during page load
	if (window.nightMode === true) {
		bgClass = "bg-dark";
	}

	let mutedClass = '';
	let border = 'border border-success';
	let searchLinks = '';
	let subtitleButton = '';
	let downloadButton = '';
	let watchButton = '';
	if (episode['isAired']) {
		watchButton = `<img src="../icons/xw.svg" alt="W" title="Nincs megnézve" class="c-button ms-1 btn-sfw" data-programme-id="${episode["programmeId"]}" data-episode-id="${episode["id"]}" data-action="w">`;
		if (episode["markedAsDownloaded"] === 0 || episode["markedAsDownloaded"] === 1)
		downloadButton = `<img src="../icons/${episode['markedAsDownloaded'] ? 'd' : 'xd'}.svg" alt="D" title="${episode['markedAsDownloaded'] ? 'Letöltve' : 'Nincs letöltve'}" class="c-button ms-1 btn-sfw" data-programme-id="${episode["programmeId"]}" data-episode-id="${episode["id"]}" data-action="${episode['markedAsDownloaded'] ? 'xd' : 'd'}">`;

		if (typeof episode['customLinksHtml'] !== "undefined" && episode['customLinksHtml'] !== "") {
			searchLinks = episode['customLinksHtml'];
		}

		if (episode["hasEnglishSubtitle"]) {
			subtitleButton = '<img src="../icons/enSub.svg" alt="EnSub" title="Van angol felirat" class="ms-1 btn-sfw">';
		}

		if (episode["hasHungarianSubtitle"]) {
			subtitleButton = '<img src="../icons/hunSub.svg" alt="HunSub" title="Van magyar felirat" class="ms-1 btn-sfw">';
		}

		if (episode["hasHungarianSubtitle"] === 0 && episode["hasEnglishSubtitle"] === 0 && episode["isAired"]) {
			subtitleButton = '<img src="../icons/noSub.svg" alt="NoSub" title="Nincs magyar vagy angol felirat" class="ms-1 btn-sfw">';
		}
	} else {
		mutedClass = ' text-muted';
		border = '';
	}

	// Return full content
	return `<div class="row ${bgClass} ${mutedClass} ${border} rounded me-2 my-1" style="line-height: 1rem; margin-left: 2px;">
				<div class="col-2 text-center align-content-center py-2">
					<small class="text-right">${episode["airDateSimplified"]} <br> ${episode["airDayName"]} </small>
				</div>
				<div class="col-10 py-1">
					<span class="float-end py-1 text-end">${searchLinks} ${subtitleButton} ${downloadButton}  ${watchButton} </span>
					<a href="${baseUrl}sorozat/${episode['programmeName']}" target="_blank" class="fw-bold text-success ${mutedClass}">
						${episode['programmePrimaryTitle']} ${episode['seasonNumber']}×${episode['episodeNumber']}
					</a>
					<br><small class="text-muted">${episode['title']}</small>
				</div>
			</div>`;
}

// Series data response handler function
function processOverviewResponse(request)
{
	// Request handler function
	if (request.readyState !== 4) {
		return;
	}

	let sfdata = document.getElementById("sfdata");

	if (request.status !== 200)
	{
		sfdata.innerHTML = `<p class="text-danger text-small">Szinkronizálás...<br>Ha nem töltődik be az oldal, ellenőrizd a fiók adataid a Beállításokban!</p>`;
		return;
	}

	// Process JSON and fill HTML content
	const data = JSON.parse(request.responseText);
	sfdata.innerHTML = "";
	for (let i = 0; i < data.length; i++)
	{
		const row = renderEpisodeRow(data[i]);
		if (row) {
			sfdata.insertAdjacentHTML("beforeend", row);
		}
	}

	// Save the html content in the local cache for faster display next time
	const cacheData = {
		contentCache: sfdata.innerHTML,
		contentCacheTS: Date.now()
	};
	chrome.storage.local.set(cacheData);

	// Sign up for image click events on all buttons
	for (let img of document.querySelectorAll('.c-button')) {
		img.addEventListener('click', function () {
			toggleButtonAction(img);
		});
	}
}

// Main function upon opening the dropdown window
function requestOverviewData()
{
	// Get API key from storage
	chrome.storage.local.get(["keypass"], function(result) {
		if (!result.keypass) {
			let sfdata = document.getElementById("sfdata");
			sfdata.innerHTML = `<p class="text-danger text-small">API kulcs hiányzik. Kérlek, add meg a Beállításokban!</p>`;
			return;
		}

		const request = new XMLHttpRequest();
		request.open("GET", baseUrl + 'api/overview/' + result.keypass, true);
		request.onreadystatechange = function () {
			processOverviewResponse(request); 
		};
		request.send();
	});
}

requestOverviewData();
