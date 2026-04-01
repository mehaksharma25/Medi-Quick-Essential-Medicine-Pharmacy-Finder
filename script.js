const API_BASE_URL = "https://api.fda.gov/drug/label.json?limit=50";
const CACHE_KEY = "mediQuickApiCache";
const CACHE_TTL = 1000 * 60 * 60 * 6;

const fallbackMedicines = [
  {
    openfda: { brand_name: ["Paracetamol"], generic_name: ["Acetaminophen"] },
    indications_and_usage: ["Used to relieve pain and reduce fever."]
  },
  {
    openfda: { brand_name: ["Amoxicillin"], generic_name: ["Amoxicillin"] },
    indications_and_usage: ["Antibiotic used to treat bacterial infections."]
  },
  {
    openfda: { brand_name: ["Cetirizine"], generic_name: ["Cetirizine Hydrochloride"] },
    indications_and_usage: ["Used for allergy symptoms such as sneezing and itching."]
  }
];

const state = {
  medicines: [],
  isLoading: true,
  isUsingCache: false,
  isUsingFallback: false,
};

const resultsGrid = document.querySelector("#resultsGrid");
const statusMessage = document.querySelector("#statusMessage");
const recordCount = document.querySelector("#recordCount");
const cardTemplate = document.querySelector("#medicineCardTemplate");

const getFieldValue = (value, fallback) => {
  if (Array.isArray(value)) {
    return value.length > 0 && value[0] ? value[0] : fallback;
  }

  return value || fallback;
};

const cleanText = (value, fallback = "") => {
  const normalizedValue = value === undefined || value === null ? fallback : value;
  return String(normalizedValue).replace(/\s+/g, " ").trim() || fallback;
};

const readCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    const isFresh = parsed?.timestamp && Date.now() - parsed.timestamp < CACHE_TTL;
    const hasData = Array.isArray(parsed?.data) && parsed.data.length > 0;
    return isFresh && hasData ? parsed.data : [];
  } catch (error) {
    return [];
  }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch (error) {
    // Ignore cache errors so the app remains usable.
  }
};

const getCategory = (text) => {
  const loweredText = cleanText(text).toLowerCase();

  if (loweredText.includes("pain") || loweredText.includes("fever")) {
    return "Pain Relief";
  }

  if (loweredText.includes("infection") || loweredText.includes("antibiotic")) {
    return "Antibiotic";
  }

  if (loweredText.includes("allergy") || loweredText.includes("itching")) {
    return "Allergy";
  }

  if (loweredText.includes("stomach") || loweredText.includes("acid")) {
    return "Digestive";
  }

  return "General";
};

const processData = (items) =>
  items
    .filter((item) => item && (item.openfda || item.indications_and_usage || item.purpose))
    .map((item) => {
      const openFda = item.openfda || {};
      const brandName = cleanText(getFieldValue(openFda.brand_name, "Unnamed Medicine"));
      const genericName = cleanText(getFieldValue(openFda.generic_name, "Generic name not listed"));
      const indication = cleanText(
        getFieldValue(item.indications_and_usage || item.purpose, "No indication information available.")
      );

      return {
        brandName,
        genericName,
        indication,
        category: getCategory(indication),
      };
    })
    .filter((medicine, index, array) =>
      array.findIndex(
        (entry) =>
          entry.brandName.toLowerCase() === medicine.brandName.toLowerCase() &&
          entry.genericName.toLowerCase() === medicine.genericName.toLowerCase()
      ) === index
    );

const createStateCard = (title, message, isError = false) => {
  const card = document.createElement("article");
  const heading = document.createElement("h3");
  const text = document.createElement("p");

  card.className = `state-card${isError ? " error" : ""}`;
  heading.textContent = title;
  text.textContent = message;
  card.append(heading, text);

  return card;
};

const createSkeletonCard = () => {
  const skeleton = document.createElement("article");
  skeleton.className = "skeleton-card";
  skeleton.innerHTML = `
    <div class="skeleton-pill"></div>
    <div class="skeleton-line title"></div>
    <div class="skeleton-line short"></div>
    <div class="skeleton-line long"></div>
  `;
  return skeleton;
};

const createMedicineCard = (medicine) => {
  const cardFragment = cardTemplate.content.cloneNode(true);
  cardFragment.querySelector(".category-badge").textContent = medicine.category;
  cardFragment.querySelector(".medicine-title").textContent = medicine.brandName;
  cardFragment.querySelector(".generic-name").textContent = `Generic: ${medicine.genericName}`;
  cardFragment.querySelector(".indication-text").textContent = medicine.indication;
  return cardFragment;
};

const renderSkeletons = () => {
  resultsGrid.innerHTML = "";
  resultsGrid.append(...[0, 1, 2, 3, 4, 5].map(() => createSkeletonCard()));
};

const renderResults = () => {
  resultsGrid.innerHTML = "";

  if (state.medicines.length === 0) {
    resultsGrid.append(
      createStateCard(
        "No results available",
        "The API did not return any usable medicine records."
      )
    );
    return;
  }

  resultsGrid.append(...state.medicines.map((medicine) => createMedicineCard(medicine)));
};

const updateStatus = () => {
  recordCount.textContent = String(state.medicines.length);

  if (state.isLoading) {
    statusMessage.textContent = "Loading medicine records from openFDA...";
  } else if (state.isUsingFallback) {
    statusMessage.textContent = "Live API unavailable. Showing fallback medicine records.";
  } else if (state.isUsingCache) {
    statusMessage.textContent = `Showing ${state.medicines.length} cached medicine records.`;
  } else {
    statusMessage.textContent = `Successfully loaded ${state.medicines.length} medicine records from openFDA.`;
  }
};

const fetchData = async () => {
  state.isLoading = true;
  updateStatus();
  renderSkeletons();

  try {
    const response = await fetch(API_BASE_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawResults = data?.results || [];

    writeCache(rawResults);
    state.medicines = processData(rawResults);
    state.isUsingCache = false;
    state.isUsingFallback = false;
    state.isLoading = false;

    renderResults();
    updateStatus();
  } catch (error) {
    const cachedResults = readCache();

    if (cachedResults.length > 0) {
      state.medicines = processData(cachedResults);
      state.isUsingCache = true;
      state.isUsingFallback = false;
      state.isLoading = false;
      renderResults();
      updateStatus();
      return;
    }

    state.medicines = processData(fallbackMedicines);
    state.isUsingCache = false;
    state.isUsingFallback = true;
    state.isLoading = false;

    if (state.medicines.length > 0) {
      renderResults();
    } else {
      resultsGrid.innerHTML = "";
      resultsGrid.append(
        createStateCard(
          "Unable to load medicine data",
          "Please check your internet connection and try again.",
          true
        )
      );
    }

    updateStatus();
  }
};

fetchData();
