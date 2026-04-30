document.addEventListener("DOMContentLoaded", function () {
    fetch("assets/data/faq.json")
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll(".faq-title").forEach(el => {
                el.textContent = data.title;
            });
            document.getElementById("faq-description").textContent = data.description;

            const faqList = document.getElementById("faq-list");
            data.faq.forEach(item => {
                const dt = document.createElement("dt");
                dt.textContent = item.question;

                const dd = document.createElement("dd");
                dd.textContent = item.answer;

                faqList.appendChild(dt);
                faqList.appendChild(dd);
            });
        })
        .catch(error => console.error("Error loading FAQ:", error));
});
