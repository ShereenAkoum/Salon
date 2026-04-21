function getParams() {
    return new URLSearchParams(window.location.search);
}
function buildBackLink(currentStep) {
    const service = localStorage.getItem("service");
    const date = localStorage.getItem("date");

    let targetStep = "";
    let params = [];

    if (currentStep === "step-2") {
        // Going back to step-1: only keep service
        targetStep = "services.html";
        
        // Clear date
        localStorage.removeItem("service");
        localStorage.removeItem("date");
    }

    if (currentStep === "step-3") {
        // Going back to step-2: keep service 
        targetStep = "step-2.html";
        if (service) params.push(`service=${encodeURIComponent(service)}`);
        // Clear date
        localStorage.removeItem("date");
    }

    // Build final URL
    if (params.length > 0) {
        targetStep += "?" + params.join("&");
    }

    return targetStep;
}
// Step 1
function chooseService(serviceName) {
    localStorage.setItem("service", serviceName);
    window.location.href = `step-2.html?service=${encodeURIComponent(serviceName)}`;
}

// Step 2
function chooseDate(dateValue) {
    localStorage.setItem("date", dateValue);
    const params = getParams();
    const service = params.get("service") || localStorage.getItem("service");
    window.location.href = `step-3.html?service=${encodeURIComponent(service)}&date=${encodeURIComponent(dateValue)}`;
}

// Step 3
function populateBookingForm() {
    const params = getParams();
    const service = params.get("service") || localStorage.getItem("service");
    const date = params.get("date") || localStorage.getItem("date");

    const serviceBlock = document.querySelector(".box-contacts-block:nth-child(1) p");
    const dateBlock = document.querySelector(".box-contacts-block:nth-child(2) p");

    if (serviceBlock) serviceBlock.textContent = service || "Not selected";
    if (dateBlock) dateBlock.textContent = date || "Not selected";

    const serviceField = document.querySelector("input[name='service']");
    const dateField = document.querySelector("input[name='date']");

    if (serviceField) serviceField.value = service || "";
    if (dateField) dateField.value = date || "";
}

// Validation for Step 4 booking form
function setupBookingValidation() {
    const nameInput = document.getElementById("contact-full-name");
    const phoneInput = document.getElementById("contact-phone");
    const bookButton = document.querySelector("button[type='submit']");
    const form = document.querySelector("form");

    if (!nameInput || !phoneInput || !bookButton || !form) return;

    function validateForm() {
        const nameValid = nameInput.value.trim().length > 0;
        const phoneValid = phoneInput.value.trim().length > 0 && /^[0-9]+$/.test(phoneInput.value.trim());
        bookButton.disabled = !(nameValid && phoneValid);
    }

    nameInput.addEventListener("input", validateForm);
    phoneInput.addEventListener("input", validateForm);

    // Intercept submit
    form.addEventListener("submit", function (e) {
        e.preventDefault(); // stop default redirect
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
                validateForm();
            } else {
                alert("Oops! Something went wrong.");
            }
            bookButton.textContent = "Book now";
            bookButton.disabled = false;
            // Redirect back to index.html after alert is closed
            window.location.href = "index.html";
        });
    });

    validateForm();
}
// Unified DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    // Reset on index.html
    if (path.endsWith("index.html") || path === "/") {
        localStorage.removeItem("service");
        localStorage.removeItem("date");
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Step 3: bind time slot clicks
    if (path.endsWith("step-2.html") || path.endsWith("step-2")) {
        const timeLinks = document.querySelectorAll(".date-picker-list a:not(.disabled)");
        timeLinks.forEach(link => {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                const timeSlot = this.textContent.trim();
                const activeTab = document.querySelector(".rd-material-tab.rd-material-tab-active");
                const dayNumber = activeTab.querySelector(".date-picker-date-number").textContent.trim();
                const dayName = activeTab.querySelector(".date-picker-date-text").textContent.trim();
                const month = document.querySelector("h3").textContent.trim();
                const fullDateTime = `${month} ${dayNumber}, ${dayName} ${timeSlot}`;
                chooseDate(fullDateTime);
            });
        });
    }

    // Step 4: populate booking form + validation
    if (path.endsWith("step-3.html") || path.endsWith("step-3")) {
        populateBookingForm();
        setupBookingValidation();
    }
});