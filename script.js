const API_URL = "https://api.fda.gov/drug/label.json?limit=50";

const state = {
  medicines: [],
  filteredMedicines: [],
  selectedCategory: "all",
  searchTerm: "",
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  categorySelect: document.querySelector("#categorySelect"),
  totalCount: document.querySelector("#totalCount"),
  visibleCount: document.querySelector("#visibleCount"),
  categoryCount: document.querySelector("#categoryCount"),
  statusBanner: document.querySelector("#statusBanner"),
  medicineGrid: document.querySelector("#medicineGrid"),
  cardTemplate: document.querySelector("#medicineCardTemplate"),
};

const getFirstValue = (value, fallback = "Not available") =>
  Array.isArray(value) && value.length > 0 && value[0].trim()
    ? value[0].trim()
    : fallback;

const trimText = (text, maxLength = 220) =>
  text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;

const categorizeMedicine = (record) => {
  const genericName = getFirstValue(record.openfda?.generic_name, "").toLowerCase();
  const productType = getFirstValue(record.openfda?.product_type, "").toLowerCase();
  const route = getFirstValue(record.route, "").toLowerCase();
  const indications = getFirstValue(record.indications_and_usage, "").toLowerCase();

  const categoryChecks = [
    {
      name: "Pain Relief",
      match: ["pain", "fever", "inflammation"].some((term) =>
        `${genericName} ${indications}`.includes(term)
      ),
    },
    {
      name: "Diabetes Care",
      match: ["diabetes", "insulin", "glucose"].some((term) =>
        `${genericName} ${indications}`.includes(term)
      ),
    },
    {
      name: "Heart Health",
      match: ["blood pressure", "cholesterol", "cardiac", "heart"].some((term) =>
        indications.includes(term)
      ),
    },
    {
      name: "Allergy & Cold",
      match: ["allergy", "cold", "cough", "sinus"].some((term) =>
        indications.includes(term)
      ),
    },
    {
      name: "Dermatology",
      match: ["skin", "topical", "rash", "eczema"].some((term) =>
        `${route} ${indications}`.includes(term)
      ),
    },
  ];

  return (
    categoryChecks.find((category) => category.match)?.name ||
    (productType ? productType.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "General Use")
  );
};

const normalizeMedicine = (record) => ({
  id: record.id || crypto.randomUUID(),
  brandName: getFirstValue(record.openfda?.brand_name, "Unnamed medicine"),
  genericName: getFirstValue(record.openfda?.generic_name),
  indications: trimText(getFirstValue(record.indications_and_usage)),
  category: categorizeMedicine(record),
});

const setStatus = (message, stateName = "default") => {
  elements.statusBanner.textContent = message;
  elements.statusBanner.dataset.state = stateName;
};

const updateStats = () => {
  const uniqueCategories = [...new Set(state.medicines.map((item) => item.category))];

  elements.totalCount.textContent = state.medicines.length;
  elements.visibleCount.textContent = state.filteredMedicines.length;
  elements.categoryCount.textContent = uniqueCategories.length;
};

const populateCategories = () => {
  const options = [...new Set(state.medicines.map((item) => item.category))]
    .sort((first, second) => first.localeCompare(second))
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  elements.categorySelect.innerHTML = `<option value="all">All categories</option>${options}`;
};

const renderMedicines = () => {
  elements.medicineGrid.innerHTML = "";

  if (state.filteredMedicines.length === 0) {
    setStatus("No medicines match your current search and category filters.", "error");
    return;
  }

  const cards = state.filteredMedicines.map((medicine) => {
    const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);

    card.querySelector(".medicine-title").textContent = medicine.brandName;
    card.querySelector(".category-chip").textContent = medicine.category;
    card.querySelector(".generic-name").textContent = medicine.genericName;
    card.querySelector(".indications").textContent = medicine.indications;

    return card;
  });

  elements.medicineGrid.append(...cards);
  setStatus(
    `Showing ${state.filteredMedicines.length} medicine records from the live openFDA feed.`,
    "success"
  );
};

const applyFilters = () => {
  const searchValue = state.searchTerm.toLowerCase();

  state.filteredMedicines = state.medicines
    .filter((medicine) =>
      state.selectedCategory === "all" ? true : medicine.category === state.selectedCategory
    )
    .filter((medicine) =>
      [medicine.brandName, medicine.genericName, medicine.indications]
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    )
    .sort((first, second) => first.brandName.localeCompare(second.brandName));

  updateStats();
  renderMedicines();
};

const fetchMedicines = async () => {
  setStatus("Loading medicine data from the openFDA API...", "default");

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    state.medicines = (data.results || [])
      .map(normalizeMedicine)
      .filter(
        (medicine) =>
          medicine.brandName !== "Unnamed medicine" || medicine.genericName !== "Not available"
      );

    populateCategories();
    applyFilters();
  } catch (error) {
    elements.medicineGrid.innerHTML = "";
    updateStats();
    setStatus(
      "Unable to load live medicine data right now. Please check your connection and try again.",
      "error"
    );
    console.error("Failed to fetch medicine data:", error);
  }
};

elements.searchInput.addEventListener("input", (event) => {
  state.searchTerm = event.target.value.trim();
  applyFilters();
});

elements.categorySelect.addEventListener("change", (event) => {
  state.selectedCategory = event.target.value;
  applyFilters();
});

fetchMedicines();
