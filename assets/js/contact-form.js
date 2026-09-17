document.addEventListener("DOMContentLoaded", function () {
    setupContactValidation();
});

function setupContactValidation() {
    const nameInput = document.getElementById("contact-full-name");
    const phoneInput = document.getElementById("contact-phone");
    const emailInput = document.getElementById("contact-email");
    const messageInput = document.getElementById("contact-message");
    const form = document.getElementById("contact-form");
    const submitButton = form ? form.querySelector("button[type='submit']") : null;

    if (!nameInput || !phoneInput || !messageInput || !form || !submitButton) return;

    const FORMSPREE_ENDPOINT = "https://formspree.io/f/xaeynyqp";
    let messageError = document.getElementById("contact-message-error");

    if (!messageError) {
        messageError = document.createElement("div");
        messageError.id = "contact-message-error";
        messageError.className = "jas-contact-field-error";
        messageError.setAttribute("role", "alert");
        messageError.hidden = true;
        messageInput.insertAdjacentElement("afterend", messageError);
    }

    function setMessageError(show) {
        messageError.textContent = show ? "This field is required." : "";
        messageError.hidden = !show;
        messageInput.setAttribute("aria-invalid", show ? "true" : "false");
    }

    function isValidPhone(value) {
        return value.length > 0 && /^[0-9+\s()\-]+$/.test(value);
    }

    function getValidationState() {
        const nameValid = nameInput.value.trim().length > 0;
        const phoneValid = isValidPhone(phoneInput.value.trim());
        const messageValid = messageInput.value.trim().length > 0;
        return { nameValid, phoneValid, messageValid, valid: nameValid && phoneValid && messageValid };
    }

    function validateForm(showErrors) {
        const state = getValidationState();
        submitButton.disabled = !state.valid;
        submitButton.style.cursor = state.valid ? "pointer" : "not-allowed";
        setMessageError(showErrors && !state.messageValid);
        return state.valid;
    }

    [nameInput, phoneInput, messageInput].forEach(function (input) {
        input.addEventListener("input", function () {
            validateForm(false);
            if (messageInput.value.trim()) setMessageError(false);
        });
    });

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        // Validate before doing anything. This prevents a second click on an
        // emptied form from ever reaching Formspree or the CRM.
        if (!validateForm(true)) {
            if (!messageInput.value.trim()) messageInput.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.style.cursor = "wait";
        const originalLabel = submitButton.textContent.trim();
        submitButton.textContent = "SENDING...";

        const payload = new FormData(form);
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const email = emailInput ? emailInput.value.trim() : "";
        const message = messageInput.value.trim();
        payload.set("name", name);
        payload.set("phone", phone);
        payload.set("message", message);
        if (emailInput) payload.set("email", email);
        payload.set("_subject", "JAS Premium website contact request");

        let crmSaved = false;
        let crmError = null;

        try {
            // Submit to Formspree using a native POST into a hidden iframe.
            form.action = FORMSPREE_ENDPOINT;
            form.method = "POST";
            form.target = "contact-formspree-frame";
            form.dataset.formspreeSubmission = "true";
            HTMLFormElement.prototype.submit.call(form);

            // Store the enquiry in the CRM. RLS failures are handled as a
            // non-blocking CRM issue so they never surface as a browser error.
            if (window.salonSupabase) {
                const row = {
                    name: name,
                    phone: phone,
                    status: "new"
                };
                if (email) row.email = email;
                if (message) row.message = message;

                const crmResult = await window.salonSupabase.from("contact_messages").insert(row);
                if (crmResult.error) {
                    crmError = crmResult.error;
                    console.warn("Contact request sent, but the CRM record could not be saved:", crmResult.error.message);
                } else {
                    crmSaved = true;
                }
            } else {
                crmError = new Error("CRM unavailable");
            }

            form.reset();
            setMessageError(false);
            validateForm(false);

            if (crmSaved) {
                alert("Thanks! We will contact you soon.");
            } else {
                console.warn("Formspree submission was sent, but the CRM record could not be saved:", crmError);
                alert("Thanks! Your request was sent. We will contact you soon.");
            }
        } catch (error) {
            console.error("Could not submit contact request:", error);
            alert("Oops! Something went wrong. Please try again.");
            validateForm(false);
        } finally {
            form.target = "";
            form.dataset.formspreeSubmission = "";
            submitButton.textContent = originalLabel;
            // Keep the button disabled after reset until the required fields
            // are filled again.
            validateForm(false);
        }
    });

    validateForm(false);
}
