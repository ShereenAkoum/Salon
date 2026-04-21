document.addEventListener("DOMContentLoaded", () => {
  fetch("assets/data/categoryServices.json")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("services-container1");
      container.innerHTML = "";

      data.categories.forEach(category => {
        const wrapper = document.createElement("div");
        wrapper.className = "cell-xs-6 cell-md-3";

        const article = document.createElement("article");
        article.className = "card-service";

        // Image
        const img = document.createElement("img");
        img.className = "card-service-image";
        img.src = "assets/images/" + category.src;
        img.alt = category.name;
        img.width = category.width || 70;
        img.height = category.height || 62;

        // Title
        const title = document.createElement("p");
        title.className = "card-service-title";
        title.textContent = category.name;

        article.appendChild(img);
        article.appendChild(title);

        if (category.services.length === 1) {
          // Single service → show price + Book Now
          const service = category.services[0];

          const price = document.createElement("p");
          price.className = "card-service-price";
          price.innerHTML = `<small>${service.currency}</small>${service.price}.<small>00</small>`;

          const btn = document.createElement("a");
          btn.className = "btn btn-sm card-service-control";
          btn.href = "step-1.html";
          btn.textContent = "Book Now";
          btn.onclick = () => chooseService(service.name);

          article.appendChild(price);
          article.appendChild(btn);
        } else {
          // Multiple services → build list
          const ul = document.createElement("ul");
          ul.className = "card-service-list";

          category.services.forEach(service => {
            const li = document.createElement("li");
            li.innerHTML = `
              ${service.name}
              <a class="btn btn-xs card-service-price-list" href="step-1.html">
                Book ${service.currency}${service.price}
              </a>
            `;
            ul.appendChild(li);
          });

          article.appendChild(ul);
        }

        wrapper.appendChild(article);
        container.appendChild(wrapper);
      });
    })
    .catch(error => console.error("Error loading services:", error));
});
document.addEventListener("DOMContentLoaded", () => {
  fetch("assets/data/categoryServices.json")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("services-container");
      container.innerHTML = "";

      data.categories.forEach(category => {
        const wrapper = document.createElement("div");
        wrapper.className = "cell-xs-6 cell-md-3";

        const article = document.createElement("article");
        article.className = "card-service";

        // Image
        const img = document.createElement("img");
        img.className = "card-service-image";
        img.src = "assets/images/" + category.src;
        img.alt = category.name;
        img.width = category.width || 70;
        img.height = category.height || 62;

        // Title
        const title = document.createElement("p");
        title.className = "card-service-title";
        title.textContent = category.name;

        article.appendChild(img);
        article.appendChild(title);

        if (category.services.length === 1) {
          // Single service → price + Book Now
          const service = category.services[0];

          const price = document.createElement("p");
          price.className = "card-service-price";
          price.innerHTML = `<small>${service.currency}</small>${service.price}.<small>00</small>`;

          const btn = document.createElement("a");
          btn.className = "btn btn-sm card-service-control";
          btn.href = "javascript:void(0);";
          btn.textContent = "Book Now";
          btn.onclick = () => chooseService(service.name);

          article.appendChild(price);
          article.appendChild(btn);
        } else {
          // Multiple services → list
          const ul = document.createElement("ul");
          ul.className = "card-service-list";

          category.services.forEach(service => {
            const li = document.createElement("li");
            li.innerHTML = `
              ${service.name}
              <a class="btn btn-xs card-service-price-list" href="javascript:void(0);" onclick="chooseService('${service.name}')">
                Book ${service.currency}${service.price}
              </a>
            `;
            ul.appendChild(li);
          });

          article.appendChild(ul);
        }

        wrapper.appendChild(article);
        container.appendChild(wrapper);
      });
    })
    .catch(error => console.error("Error loading services:", error));
});

document.addEventListener("DOMContentLoaded", () => {
  fetch("assets/data/services.json")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("services2-container");
      container.innerHTML = "";

      data.services.forEach(service => {
        // Wrapper div
        const wrapper = document.createElement("div");
        wrapper.className = "cell-xs-6 cell-md-3";

        // Article
        const article = document.createElement("article");
        article.className = "card-service";

        // Image
        const img = document.createElement("img");
        img.className = "card-service-image";
        img.src = "assets/images/" + service.src;
        img.alt = service.title;
        img.width = service.width || 100;
        img.height = service.height || 120;

        // Title
        const title = document.createElement("p");
        title.className = "card-service-title";
        title.textContent = service.title;

        // Price
        const price = document.createElement("p");
        price.className = "card-service-price";
        price.innerHTML = `<small>${service.currency}</small>${service.price}.<small>00</small>`;

        // Book button
        const btn = document.createElement("a");
        btn.className = "btn btn-sm card-service-control";
        btn.href = "javascript:void(0);";
        btn.textContent = "Book Now";
        btn.onclick = () => chooseService(service.name);

        // Assemble
        article.appendChild(img);
        article.appendChild(title);
        article.appendChild(price);
        article.appendChild(btn);
        wrapper.appendChild(article);
        container.appendChild(wrapper);
      });
    })
    .catch(error => console.error("Error loading services:", error));
});
