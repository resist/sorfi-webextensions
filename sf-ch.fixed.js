const baseUrl = "https://sorfi.org/";

// Initialize global variables
window.nightMode = false;

window.addEventListener('load', function() {
	addFooterLink();

	// Get settings and cached content from storage
	chrome.storage.local.get(["overviewCache", "overviewCacheTS", "night"], function(result) {
		// Set global night mode variable
		window.nightMode = result.night === true;
		applyTheme(window.nightMode);

		// If the cache is from the last hour, instantly display it
		if (Array.isArray(result.overviewCache) && typeof result.overviewCacheTS === "number") {
			const oldestTS = Date.now() - 3600 * 1000;
			if (oldestTS < result.overviewCacheTS) {
				renderOverviewData(result.overviewCache);
			}
		}
	});
});

function addFooterLink() {
	const footer = document.getElementById("footer");
	if (!footer) return;

	const small = document.createElement("small");
	const a = document.createElement("a");
	a.href = chrome.runtime.getURL("src/sf-ch-opt.html");
	a.target = "_blank";
	a.rel = "noopener noreferrer";
	a.textContent = "Beállítások";
	small.appendChild(a);

	footer.prepend(small);
}

function applyTheme(isNightMode) {
	const head = document.querySelector("head");
	if (!head) return;

	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = isNightMode ? "../css/sorfi-bootstrap-chrome-dark.css" : "../css/sorfi-bootstrap-chrome.css";
	head.prepend(link);
}

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

	// Send request to background script to handle the action
	chrome.runtime.sendMessage(
		{ action: action, episodeId: episodeId, programmeId: programmeId },
		function(response)
		{
			if (response && response.success)
			{
				element.src = newImageSrc;
				if (needCounterUpdate) {
					chrome.runtime.sendMessage({ action: "c" });
					requestOverviewData(); // Refresh list
				}
			} else {
				console.error("Action failed", response);
			}
		}
	);
}

function appendSanitizedLinks(container, html) {
	// Accept only <a> elements; discard everything else.
	if (!html || typeof html !== "string") return;

	const template = document.createElement("template");
	template.innerHTML = html;

	const anchors = template.content.querySelectorAll("a");
	for (const a of anchors) {
		const href = a.getAttribute("href") || "";
		if (!/^https?:\/\//i.test(href) && !href.startsWith(baseUrl)) {
			continue;
		}
		const safeA = document.createElement("a");
		safeA.href = href;
		safeA.target = "_blank";
		safeA.rel = "noopener noreferrer";
		safeA.className = a.className || "";
		safeA.textContent = (a.textContent || "").trim() || "link";
		container.appendChild(safeA);
		container.appendChild(document.createTextNode(" "));
	}
}

// Returns DOM node for an episode
function renderEpisodeRow(episode)
{
	if (episode["markedAsWatched"]) {
		return null;
	}

	const bgClass = window.nightMode === true ? "bg-dark" : "bg-light";
	let mutedClass = "";
	let border = "border border-success";

	const isAired = !!episode["isAired"];

	if (!isAired) {
		mutedClass = " text-muted";
		border = "";
	}

	const row = document.createElement("div");
	row.className = `row ${bgClass}${mutedClass} ${border} rounded me-2 my-1`;
	row.style.lineHeight = "1rem";
	row.style.marginLeft = "2px";

	const colLeft = document.createElement("div");
	colLeft.className = "col-2 text-center align-content-center py-2";
	const smallLeft = document.createElement("small");
	smallLeft.className = "text-right";
	smallLeft.textContent = `${episode["airDateSimplified"] || ""} `;
	smallLeft.appendChild(document.createElement("br"));
	smallLeft.appendChild(document.createTextNode(episode["airDayName"] || ""));
	colLeft.appendChild(smallLeft);

	const colRight = document.createElement("div");
	colRight.className = "col-10 py-1";

	const actions = document.createElement("span");
	actions.className = "float-end py-1 text-end";

	// Custom links (sanitized)
	if (isAired && typeof episode["customLinksHtml"] !== "undefined" && episode["customLinksHtml"] !== "") {
		appendSanitizedLinks(actions, episode["customLinksHtml"]);
	}

	// Subtitle indicators
	if (isAired) {
		let subIcon = null;
		if (episode["hasHungarianSubtitle"]) subIcon = "../icons/hunSub.svg";
		else if (episode["hasEnglishSubtitle"]) subIcon = "../icons/enSub.svg";
		else subIcon = "../icons/noSub.svg";

		const img = document.createElement("img");
		img.src = subIcon;
		img.alt = "Sub";
		img.className = "ms-1 btn-sfw";
		actions.appendChild(img);

		// Download button
		if (episode["markedAsDownloaded"] === 0 || episode["markedAsDownloaded"] === 1) {
			const downloaded = !!episode["markedAsDownloaded"];
			const dImg = document.createElement("img");
			dImg.src = `../icons/${downloaded ? "d" : "xd"}.svg`;
			dImg.alt = "D";
			dImg.title = downloaded ? "Letöltve" : "Nincs letöltve";
			dImg.className = "c-button ms-1 btn-sfw";
			dImg.dataset.programmeId = episode["programmeId"];
			dImg.dataset.episodeId = episode["id"];
			dImg.dataset.action = downloaded ? "xd" : "d";
			actions.appendChild(dImg);
		}

		// Watch button
		const wImg = document.createElement("img");
		wImg.src = "../icons/xw.svg";
		wImg.alt = "W";
		wImg.title = "Nincs megnézve";
		wImg.className = "c-button ms-1 btn-sfw";
		wImg.dataset.programmeId = episode["programmeId"];
		wImg.dataset.episodeId = episode["id"];
		wImg.dataset.action = "w";
		actions.appendChild(wImg);
	}

	const titleLink = document.createElement("a");
	titleLink.href = `${baseUrl}sorozat/${episode["programmeName"]}`;
	titleLink.target = "_blank";
	titleLink.rel = "noopener noreferrer";
	titleLink.className = `fw-bold text-success${mutedClass}`;
	titleLink.textContent = `${episode["programmePrimaryTitle"] || ""} ${episode["seasonNumber"] || ""}×${episode["episodeNumber"] || ""}`;

	const smallTitle = document.createElement("small");
	smallTitle.className = "text-muted";
	smallTitle.textContent = episode["title"] || "";

	colRight.appendChild(actions);
	colRight.appendChild(titleLink);
	colRight.appendChild(document.createElement("br"));
	colRight.appendChild(smallTitle);

	row.appendChild(colLeft);
	row.appendChild(colRight);

	return row;
}

function renderOverviewData(data) {
	const sfdata = document.getElementById("sfdata");
	if (!sfdata) return;

	sfdata.textContent = "";
	for (let i = 0; i < data.length; i++) {
		const row = renderEpisodeRow(data[i]);
		if (row) {
			sfdata.appendChild(row);
		}
	}

	// Sign up for click events on all buttons
	for (let img of document.querySelectorAll('.c-button')) {
		img.addEventListener('click', function () {
			toggleButtonAction(img);
		});
	}
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
		if (sfdata) {
			sfdata.textContent = "Szinkronizálás... Ha nem töltődik be az oldal, ellenőrizd a fiók adataid a Beállításokban!";
		}
		return;
	}

	// Process JSON and fill content
	const data = JSON.parse(request.responseText);
	renderOverviewData(data);

	// Save the data in the local cache for faster display next time
	chrome.storage.local.set({
		overviewCache: data,
		overviewCacheTS: Date.now()
	});
}

// Main function upon opening the dropdown window
function requestOverviewData()
{
	// Get API key from storage
	chrome.storage.local.get(["keypass"], function(result) {
		if (!result.keypass) {
			let sfdata = document.getElementById("sfdata");
			if (sfdata) {
				sfdata.textContent = "API kulcs hiányzik. Kérlek, add meg a Beállításokban!";
			}
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

// Request data after opening the popup
requestOverviewData();
