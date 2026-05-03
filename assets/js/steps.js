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
    const label = `${monthLabel} ${dayNum}, ${dayName}`;
    let selections = getSelections();
    const idx = selections.findIndex(s => s.isoKey === isoKey);

    if (idx !== -1 && selections[idx].time === timeSlot) {
        // Same slot clicked again → deselect
        selections.splice(idx, 1);
    } else if (idx !== -1) {
        // Different slot on same date → replace
        selections[idx].time  = timeSlot;
        selections[idx].label = label;
    } else {
        // New date
        selections.push({ isoKey, time: timeSlot, label });
    }

    saveSelections(selections);
    refreshTimeSlotUI();
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

// ─── Continue button ──────────────────────────────────────────────────────────

function updateContinueButton() {
    const btn = document.getElementById("continue-btn");
    if (!btn) return;
    const count = getSelections().length;
    btn.disabled = count === 0;
    const label = btn.querySelector(".continue-count");
    if (label) label.textContent = count > 0 ? ` (${count})` : "";
}

function injectContinueButton() {
    const container = document.getElementById("date-picker-container");
    if (!container || document.getElementById("continue-btn")) return;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "margin-top: 30px; text-align: center; padding-bottom: 20px;";

    const btn = document.createElement("button");
    btn.id        = "continue-btn";
    btn.className = "btn btn-sm btn-primary btn-circle";
    btn.disabled  = true;
    btn.innerHTML = 'Continue<span class="continue-count"></span>';

    btn.addEventListener("click", function () {
        if (getSelections().length === 0) return;
        const service = getParams().get("service") || localStorage.getItem("service");
        window.location.href = `step-3.html?service=${encodeURIComponent(service)}`;
    });

    wrapper.appendChild(btn);
    container.after(wrapper);
}

/** Called by step2.js after render completes. */
function onDatePickerReady() {
    injectContinueButton();
    refreshTimeSlotUI();
    updateContinueButton();
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function populateBookingForm() {
    const params     = getParams();
    const service    = params.get("service") || localStorage.getItem("service");
    const selections = getSelections();

    const serviceBlock = document.querySelector(".box-contacts-block:nth-child(1) p");
    if (serviceBlock) serviceBlock.textContent = service || "Not selected";

    const dateBlock = document.querySelector(".box-contacts-block:nth-child(2) p");
    if (dateBlock) {
        if (selections.length === 0) {
            dateBlock.textContent = "Not selected";
        } else if (selections.length === 1) {
            dateBlock.textContent = `${selections[0].label} at ${selections[0].time}`;
        } else {
            dateBlock.innerHTML = "";
            const ul = document.createElement("ul");
            ul.style.cssText = "list-style: none; padding: 0; margin: 0; text-align: left;";
            selections.forEach(sel => {
                const li = document.createElement("li");
                li.textContent = `${sel.label} at ${sel.time}`;
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
            .map(s => `${s.label} at ${s.time}`)
            .join(" | ");
    }
}

function setupBookingValidation() {
    const nameInput  = document.getElementById("contact-full-name");
    const phoneInput = document.getElementById("contact-phone");
    const bookButton = document.querySelector("button[type='submit']");
    const form       = document.querySelector("form");
    if (!nameInput || !phoneInput || !bookButton || !form) return;

    function validateForm() {
        const nameValid  = nameInput.value.trim().length > 0;
        const phoneValid = /^[0-9]+$/.test(phoneInput.value.trim()) && phoneInput.value.trim().length > 0;
        bookButton.disabled = !(nameValid && phoneValid);
    }

    nameInput.addEventListener("input", validateForm);
    phoneInput.addEventListener("input", validateForm);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        bookButton.disabled    = true;
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
            bookButton.disabled    = false;
            window.location.href   = "index.html";
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