// ─── Navigation helpers ───────────────────────────────────────────────────────

function getParams() {
    return new URLSearchParams(window.location.search);
}

function buildBackLink(currentStep) {
    const service = localStorage.getItem("service");
    let targetStep = "";
    let params = [];

    if (currentStep === "step-2") {
        targetStep = "services.html";
        localStorage.removeItem("service");
        localStorage.removeItem("selectedDates");
    }
    if (currentStep === "step-3") {
        targetStep = "step-2.html";
        if (service) params.push(`service=${encodeURIComponent(service)}`);
        localStorage.removeItem("selectedDates");
    }
    if (params.length > 0) targetStep += "?" + params.join("&");
    return targetStep;
}

function chooseService(serviceName) {
    localStorage.setItem("service", serviceName);
    window.location.href = `step-2.html?service=${encodeURIComponent(serviceName)}`;
}

// ─── Step 2: Selection state ──────────────────────────────────────────────────

/**
 * Each entry: { isoKey: "2026-06-03", time: "10:00 - 11:00", label: "June 2026 3, Sunday" }
 * isoKey is the unique identifier — never reconstructed from display text.
 */
function getSelections() {
    try { return JSON.parse(localStorage.getItem("selectedDates")) || []; }
    catch (e) { return []; }
}

function saveSelections(sel) {
    localStorage.setItem("selectedDates", JSON.stringify(sel));
}

/**
 * Called by step2.js on slot click.
 * @param {string} timeSlot  e.g. "10:00 - 11:00"
 * @param {string} isoKey    e.g. "2026-06-03"  ← canonical unique key
 * @param {string} dayNum    e.g. "3"
 * @param {string} dayName   e.g. "Sunday"
 * @param {string} monthLabel e.g. "June 2026"
 */
function toggleDateSlot(timeSlot, isoKey, dayNum, dayName, monthLabel) {
    let selections = getSelections();
    const idx = selections.findIndex(s => s.isoKey === isoKey);

    if (idx !== -1 && selections[idx].time === timeSlot) {
        selections.splice(idx, 1);
    } else if (idx !== -1) {
        selections[idx].time = timeSlot;
    } else {
        // Store only isoKey + time — label is always rebuilt at render time
        selections.push({ isoKey, time: timeSlot });
    }

    saveSelections(selections);
    refreshTimeSlotUI();
    renderSummary(window._step2Config);
    updateContinueButton();
}

/**
 * Scoped entirely by isoKey — finds the exact panel using data-iso-key,
 * so "13:00-14:00 in June" and "13:00-14:00 in July" are completely isolated.
 */
function refreshTimeSlotUI() {
    const selections = getSelections();

    document.querySelectorAll(".date-picker-list a").forEach(a => a.classList.remove("selected-slot"));
    document.querySelectorAll(".date-picker-date").forEach(el => el.classList.remove("has-selection"));

    selections.forEach(sel => {
        // Find the time panel for this exact date
        const panel = document.querySelector(
            `.rd-material-tabs__container > div[data-iso-key="${sel.isoKey}"]`
        );
        if (!panel) return;

        // Highlight the matching time slot link inside this panel only
        panel.querySelectorAll(".date-picker-list a").forEach(a => {
            if (a.textContent.trim() === sel.time) {
                a.classList.add("selected-slot");
            }
        });

        // Add dot indicator to the matching date tab in the same widget
        const tabsWidget = panel.closest(".rd-material-tabs");
        if (!tabsWidget) return;
        tabsWidget.querySelectorAll(".date-picker-date[data-iso-key]").forEach(tab => {
            if (tab.dataset.isoKey === sel.isoKey) {
                tab.classList.add("has-selection");
            }
        });
    });
}

// ─── Summary panel + Continue button ─────────────────────────────────────────

function removeSelection(isoKey) {
    let selections = getSelections();
    selections = selections.filter(s => s.isoKey !== isoKey);
    saveSelections(selections);
    refreshTimeSlotUI();
    renderSummary(window._step2Config);
    updateContinueButton();
}

/**
 * Builds a localized date label from an ISO key (YYYY-MM-DD).
 * Month and day names come from step2.json for the current language.
 * Time is always kept in English (digits only, language-neutral).
 */
function buildLocalizedLabel(isoKey, step2Config) {
    const lang = document.documentElement.getAttribute('lang') || 'en';
    const date = new Date(isoKey + 'T12:00:00'); // noon avoids DST edge cases
    const months = (step2Config && step2Config.months && step2Config.months[lang])
        || (step2Config && step2Config.months && step2Config.months['en'])
        || [];
    const days = (step2Config && step2Config.days && step2Config.days[lang])
        || (step2Config && step2Config.days && step2Config.days['en'])
        || [];
    const monthName = months[date.getMonth()] || '';
    const dayName = days[date.getDay()] || '';
    const dayNum = date.getDate();
    const year = date.getFullYear();
    // return `${monthName} ${year} ${dayNum}, ${dayName}`;
    if (lang != 'en')
        return `${dayName} ${dayNum} ${monthName} ${year}`;

    return `${dayName} ${monthName} ${dayNum} ${year}`;
}

// Heading strings per language
var _summaryHeadings = {
    en: { one: 'appointment selected for', many: 'appointments selected for' },
    ar: { one: 'موعد محدد لخدمة', many: 'مواعيد محددة لخدمة' }
};

function renderSummary(step2Config) {
    const panel = document.getElementById("selection-summary");
    if (!panel) return;
    const selections = getSelections();

    if (selections.length === 0) {
        panel.style.display = "none";
        panel.innerHTML = "";
        return;
    }

    // If no config passed, try to use cached one
    if (!step2Config && window._step2Config) step2Config = window._step2Config;

    panel.style.display = "block";
    panel.innerHTML = "";

    const lang = document.documentElement.getAttribute('lang') || 'en';
    const service = getParams().get("service") || localStorage.getItem("service") || "";
    const h = _summaryHeadings[lang] || _summaryHeadings['en'];

    const heading = document.createElement("p");
    heading.textContent = selections.length === 1
        ? `1 ${h.one} ${service}`
        : `${selections.length} ${h.many} ${service}`;
    heading.style.cssText = "font-weight:600; margin:0 0 12px; color:#1a3a6b; font-size:13px; text-transform:uppercase; letter-spacing:.05em;";
    panel.appendChild(heading);

    const sorted = [...selections].sort((a, b) => a.isoKey.localeCompare(b.isoKey));
    sorted.forEach(sel => {
        const label = buildLocalizedLabel(sel.isoKey, step2Config);

        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #dde3f0; border-radius:6px; padding:10px 14px; margin-bottom:8px;";

        const text = document.createElement("span");
        text.style.cssText = "font-size:13px; color:#333;";
        // Date label in current language · time always in English (digits)
        text.innerHTML = `<strong>${label}</strong> &nbsp;·&nbsp; <span dir="ltr">${sel.time}</span>`;

        const del = document.createElement("button");
        del.innerHTML = "&#10005;";
        del.title = lang === 'ar' ? 'حذف' : 'Remove';
        del.style.cssText = "background:none; border:none; cursor:pointer; color:#999; font-size:16px; line-height:1; padding:0 0 0 12px; flex-shrink:0; transition:color .2s;";
        del.addEventListener("mouseenter", () => del.style.color = "#c0392b");
        del.addEventListener("mouseleave", () => del.style.color = "#999");
        del.addEventListener("click", () => removeSelection(sel.isoKey));

        row.appendChild(text);
        row.appendChild(del);
        panel.appendChild(row);
    });
}

function updateContinueButton() {
    const btn = document.getElementById("continue-btn");
    if (!btn) return;
    const count = getSelections().length;
    btn.disabled = count === 0;
    const label = btn.querySelector(".continue-count");
    if (label) label.textContent = count > 0 ? ` (${count})` : "";
}

function injectSummaryAndContinue() {
    const container = document.getElementById("date-picker-container");
    if (!container || document.getElementById("selection-summary")) return;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "margin-top: 30px; padding-bottom: 20px;";

    // Summary panel
    const summary = document.createElement("div");
    summary.id = "selection-summary";
    summary.style.cssText = [
        "display:none",
        "background:#f4f6fb",
        "border-radius:10px",
        "padding:18px 20px",
        "margin-bottom:16px",
        "text-align:left",
        "max-width:600px",
        "margin-left:auto",
        "margin-right:auto",
    ].join(";");

    // Continue button
    const btn = document.createElement("button");
    btn.id = "continue-btn";
    btn.className = "btn btn-sm btn-primary btn-circle";
    btn.disabled = true;
    btn.innerHTML = 'Continue<span class="continue-count"></span>';
    btn.style.cssText = "display:block; margin:0 auto;";

    btn.addEventListener("click", function () {
        if (getSelections().length === 0) return;
        const service = getParams().get("service") || localStorage.getItem("service");
        window.location.href = `step-3.html?service=${encodeURIComponent(service)}`;
    });

    wrapper.appendChild(summary);
    wrapper.appendChild(btn);
    container.after(wrapper);
}

/** Called by step2.js after render completes. Receives the loaded config. */
function onDatePickerReady(step2Config) {
    if (step2Config) window._step2Config = step2Config;
    injectSummaryAndContinue();
    refreshTimeSlotUI();
    renderSummary(window._step2Config);
    updateContinueButton();
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function populateBookingForm() {
    const params = getParams();
    const service = params.get("service") || localStorage.getItem("service");
    const selections = getSelections();
    const cfg = window._step2Config;

    const serviceBlock = document.querySelector(".box-contacts-block:nth-child(1) p");
    if (serviceBlock) serviceBlock.textContent = service || "Not selected";

    const dateBlock = document.querySelector(".box-contacts-block:nth-child(2) p");
    if (dateBlock) {
        const sorted = [...selections].sort((a, b) => a.isoKey.localeCompare(b.isoKey));
        if (sorted.length === 0) {
            dateBlock.textContent = "Not selected";
        } else if (sorted.length === 1) {
            const lbl = buildLocalizedLabel(sorted[0].isoKey, cfg);
            dateBlock.textContent = `${lbl} at ${sorted[0].time}`;
        } else {
            dateBlock.innerHTML = "";
            const ul = document.createElement("ul");
            ul.style.cssText = "list-style: none; padding: 0; margin: 0; text-align: left;";
            sorted.forEach(sel => {
                const li = document.createElement("li");
                const lbl = buildLocalizedLabel(sel.isoKey, cfg);
                li.textContent = `${lbl} at ${sel.time}`;
                ul.appendChild(li);
            });
            dateBlock.appendChild(ul);
        }
    }

    const serviceField = document.querySelector("input[name='service']");
    if (serviceField) serviceField.value = service || "";

    const dateField = document.querySelector("input[name='date']");
    if (dateField) {
        dateField.value = selections
            .sort((a, b) => a.isoKey.localeCompare(b.isoKey))
            .map(s => `${buildLocalizedLabel(s.isoKey, cfg)} at ${s.time}`)
            .join(" | ");
    }
}

function setupBookingValidation() {
    const nameInput = document.getElementById("contact-full-name");
    const phoneInput = document.getElementById("contact-phone");
    const bookButton = document.querySelector("button[type='submit']");
    const form = document.querySelector("form");
    if (!nameInput || !phoneInput || !bookButton || !form) return;

    function validateForm() {
        const nameValid = nameInput.value.trim().length > 0;
        const phoneValid = /^[0-9]+$/.test(phoneInput.value.trim()) && phoneInput.value.trim().length > 0;
        bookButton.disabled = !(nameValid && phoneValid);
    }

    nameInput.addEventListener("input", validateForm);
    phoneInput.addEventListener("input", validateForm);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        bookButton.disabled = true;
        bookButton.textContent = "Booking...";

        fetch(form.action, {
            method: form.method,
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        }).then(response => {
            if (response.ok) {
                alert("Thanks! We will contact you soon.");
                form.reset();
                localStorage.removeItem("selectedDates");
                localStorage.removeItem("service");
            } else {
                alert("Oops! Something went wrong.");
            }
            bookButton.textContent = "Book now";
            bookButton.disabled = false;
            window.location.href = "index.html";
        });
    });

    validateForm();
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    if (path.endsWith("index.html") || path === "/") {
        localStorage.removeItem("service");
        localStorage.removeItem("selectedDates");
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    if (path.endsWith("step-3.html") || path.endsWith("step-3")) {
        populateBookingForm();
        setupBookingValidation();
    }
});