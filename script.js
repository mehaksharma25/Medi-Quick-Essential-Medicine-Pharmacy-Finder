(function () {
  const API_BASE_URL = "https://api.fda.gov/drug/label.json";
  const API_LIMIT = 50;
  const REQUEST_TIMEOUT_MS = 10000;
  const THEME_STORAGE_KEY = "medi-quick-theme";
  const BOOKMARK_STORAGE_KEY = "medi-quick-bookmarks";

  const CATEGORY_RULES = [
    {
      id: "pain-relief",
      label: "Pain Relief",
      symptoms: ["headache", "fever", "body pain", "inflammation", "arthritis"],
      matcher(text) {
        return /pain|fever|headache|inflammation|analgesic|arthritis/.test(text);
      }
    },
    {
      id: "antibiotics",
      label: "Antibiotics",
      symptoms: ["infection", "sore throat", "skin infection", "bacterial illness"],
      matcher(text) {
        return /bacterial|antibiotic|infection|antimicrobial|sore throat/.test(text);
      }
    },
    {
      id: "diabetes",
      label: "Diabetes",
      symptoms: ["high blood sugar", "fatigue", "frequent urination", "thirst"],
      matcher(text) {
        return /diabetes|insulin|blood sugar|glucose|hyperglycemia|thirst/.test(text);
      }
    },
    {
      id: "heart-health",
      label: "Heart Health",
      symptoms: ["high blood pressure", "cholesterol", "chest discomfort", "cardiac care"],
      matcher(text) {
        return /blood pressure|hypertension|heart|cardiac|cholesterol|angina/.test(text);
      }
    },
    {
      id: "respiratory",
      label: "Respiratory",
      symptoms: ["cough", "allergy", "breathing issue", "asthma", "cold"],
      matcher(text) {
        return /asthma|breathing|respiratory|cough|allergy|cold|wheeze/.test(text);
      }
    },
    {
      id: "digestive-health",
      label: "Digestive Health",
      symptoms: ["stomach pain", "nausea", "acidity", "indigestion", "reflux"],
      matcher(text) {
        return /nausea|stomach|digestive|acid|indigestion|reflux|ulcer/.test(text);
      }
    },
    {
      id: "general",
      label: "General",
      symptoms: ["general wellness"],
      matcher() {
        return true;
      }
    }
  ];

  const state = {
    allMedicines: [],
    visibleMedicines: [],
    isLoading: false,
    errorMessage: "",
    validationMessage: "",
    searchQuery: "",
    selectedCategory: "all",
    usageQuery: "",
    symptomQuery: "",
    symptomCategory: "all",
    categoryOptions: [{ value: "all", label: "All categories" }],
    activeCategoryLabel: "All categories",
    bookmarkedIds: getStoredBookmarks(),
    showBookmarkedOnly: false,
    selectedMedicineId: "",
    selectedMedicine: null,
    similarMedicines: [],
    symptomMatches: []
  };

  function getStoredBookmarks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveBookmarks() {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(state.bookmarkedIds));
  }

  function getInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    state.currentTheme = theme;
  }

  function createShell() {
    return `
      <div class="page-shell">
        <header class="hero">
          <div class="hero__content">
            <p class="hero__eyebrow">Trusted healthcare discovery</p>
            <h1>Medi-Quick</h1>
            <p class="hero__copy">
              Search essential medicines, explore uses and precautions, save important options,
              and use symptom-based guidance to discover the right category faster.
            </p>
            <div class="hero__chips">
              <span class="hero-chip">Verified openFDA data</span>
              <span class="hero-chip">Responsive care-focused design</span>
              <span class="hero-chip">Quick filters and safe reading</span>
            </div>
          </div>
          <div class="hero__panel">
            <button
              id="theme-toggle"
              class="button button--theme"
              type="button"
              aria-label="Switch to dark mode"
            >
              Dark mode
            </button>
            <p>Verified source</p>
            <strong>openFDA drug label API</strong>
            <span class="hero__trust-copy">
              Read uses, dosage guidance, side effects, and precautions in one place.
            </span>
          </div>
        </header>

        <main class="layout">
          <aside class="sidebar">
            <section class="panel panel--controls" aria-labelledby="controls-title">
              <div class="panel__header">
                <h2 id="controls-title">Advanced Search</h2>
                <p>Search by medicine, usage, category, or saved items.</p>
              </div>

              <form id="search-form" class="search-form" novalidate>
                <label class="field">
                  <span class="field__label">Medicine or keyword</span>
                  <input id="search-input" type="search" placeholder="Paracetamol, insulin, cough relief" autocomplete="off" />
                </label>

                <label class="field">
                  <span class="field__label">Usage or condition</span>
                  <input id="usage-input" type="search" placeholder="Pain, infection, blood pressure" autocomplete="off" />
                </label>

                <label class="field">
                  <span class="field__label">Category</span>
                  <select id="category-select"></select>
                </label>

                <label class="toggle-row">
                  <input id="bookmarked-only" type="checkbox" />
                  <span>Show only saved medicines</span>
                </label>

                <button class="button button--primary" type="submit">Apply Filters</button>
              </form>

              <p id="validation-message" class="validation-message" aria-live="polite"></p>
            </section>

            <section class="panel panel--symptoms" aria-labelledby="symptom-title">
              <div class="panel__header">
                <h2 id="symptom-title">Symptom Checker</h2>
                <p>Enter symptoms to surface helpful medicine categories.</p>
              </div>

              <label class="field">
                <span class="field__label">Symptoms</span>
                <input id="symptom-input" type="search" placeholder="Headache, cough, stomach pain" autocomplete="off" />
              </label>

              <div id="symptom-suggestions" class="suggestions" aria-live="polite"></div>

              <div class="checker-note">
                <p>This checker suggests categories for exploration only and is not a diagnosis tool.</p>
                <button id="clear-symptom-filter" class="button button--ghost" type="button">Clear Symptom Filter</button>
              </div>
            </section>
          </aside>

          <section class="content">
            <div id="stats" class="stats" aria-live="polite"></div>
            <div id="status-message" aria-live="polite"></div>

            <section class="panel panel--results" aria-labelledby="results-title">
              <div class="panel__header panel__header--split">
                <div>
                  <p class="panel__eyebrow">Medicine Explorer</p>
                  <h2 id="results-title">Healthcare-focused results</h2>
                  <p>Review clean medicine cards, save useful options, and open deeper details.</p>
                </div>
                <button id="refresh-button" class="button button--secondary" type="button">Refresh Data</button>
              </div>

              <div id="results" class="results-grid" aria-live="polite"></div>
            </section>
          </section>
        </main>

        <div id="modal-root"></div>
      </div>
    `;
  }

  function getCategoryLabel(categoryId) {
    const match = CATEGORY_RULES.find(function (item) {
      return item.id === categoryId;
    });
    return match ? match.label : "General";
  }

  function dedupeArray(items) {
    return Array.from(new Set(items));
  }

  function getFirstValue(value) {
    if (Array.isArray(value)) {
      return value.find(Boolean) || "";
    }
    return value || "";
  }

  function normalizeText(value, fallback) {
    const firstValue = getFirstValue(value);
    return typeof firstValue === "string" && firstValue.trim() ? firstValue.trim() : fallback;
  }

  function truncate(value, maxLength) {
    return value.length > maxLength ? value.slice(0, maxLength).trim() + "..." : value;
  }

  function getCategoryFromText(searchText) {
    const match = CATEGORY_RULES.find(function (rule) {
      return rule.matcher(searchText);
    });
    return match ? match.id : "general";
  }

  function normalizeMedicineRecord(record, index) {
    const openFda = record.openfda || {};
    const brandName = getFirstValue(openFda.brand_name) || "Unnamed medicine";
    const genericName = getFirstValue(openFda.generic_name) || brandName;
    const manufacturer = getFirstValue(openFda.manufacturer_name) || "Not provided";
    const indication = truncate(getFirstValue(record.indications_and_usage) || "Indications not available.", 220);
    const purpose = truncate(getFirstValue(record.purpose) || "Purpose not provided.", 140);
    const dosage = truncate(normalizeText(record.dosage_and_administration, "Dosage information not available."), 260);
    const sideEffects = truncate(
      normalizeText(record.adverse_reactions, normalizeText(record.stop_use, "Side effects information not available.")),
      260
    );
    const precautions = truncate(normalizeText(record.warnings, "Precaution details not available."), 260);

    const baseMedicine = {
      id: genericName.toLowerCase().replace(/\s+/g, "-") + "-" + index,
      brandName: brandName,
      genericName: genericName,
      manufacturer: manufacturer,
      indication: indication,
      purpose: purpose,
      dosage: dosage,
      sideEffects: sideEffects,
      precautions: precautions
    };

    const searchText = [
      baseMedicine.brandName,
      baseMedicine.genericName,
      baseMedicine.manufacturer,
      baseMedicine.indication,
      baseMedicine.purpose,
      baseMedicine.dosage,
      baseMedicine.sideEffects,
      baseMedicine.precautions
    ].join(" ").toLowerCase();

    const category = getCategoryFromText(searchText);

    return {
      id: baseMedicine.id,
      brandName: baseMedicine.brandName,
      genericName: baseMedicine.genericName,
      manufacturer: baseMedicine.manufacturer,
      indication: baseMedicine.indication,
      purpose: baseMedicine.purpose,
      dosage: baseMedicine.dosage,
      sideEffects: baseMedicine.sideEffects,
      precautions: baseMedicine.precautions,
      searchText: searchText,
      category: category,
      categoryLabel: getCategoryLabel(category)
    };
  }

  function getCategoryOptions() {
    const categoryIds = dedupeArray(
      state.allMedicines.map(function (medicine) {
        return medicine.category;
      })
    );

    return ["all"].concat(categoryIds).map(function (categoryId) {
      return {
        value: categoryId,
        label: categoryId === "all" ? "All categories" : getCategoryLabel(categoryId)
      };
    });
  }

  function getSymptomMatches() {
    const normalizedQuery = state.symptomQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return CATEGORY_RULES.filter(function (category) {
      return category.symptoms.some(function (symptom) {
        return symptom.toLowerCase().includes(normalizedQuery);
      });
    }).slice(0, 4);
  }

  function getSimilarMedicines(selectedMedicine) {
    if (!selectedMedicine) {
      return [];
    }

    return state.allMedicines
      .filter(function (medicine) {
        return medicine.id !== selectedMedicine.id;
      })
      .filter(function (medicine) {
        return (
          medicine.category === selectedMedicine.category ||
          medicine.manufacturer === selectedMedicine.manufacturer
        );
      })
      .sort(function (left, right) {
        return left.genericName.localeCompare(right.genericName);
      })
      .slice(0, 3);
  }

  function getFilteredMedicines() {
    const normalizedSearch = state.searchQuery.trim().toLowerCase();
    const normalizedUsage = state.usageQuery.trim().toLowerCase();

    return state.allMedicines
      .filter(function (medicine) {
        return state.selectedCategory === "all" || medicine.category === state.selectedCategory;
      })
      .filter(function (medicine) {
        return state.symptomCategory === "all" || medicine.category === state.symptomCategory;
      })
      .filter(function (medicine) {
        return !normalizedSearch || medicine.searchText.includes(normalizedSearch);
      })
      .filter(function (medicine) {
        return (
          !normalizedUsage ||
          medicine.indication.toLowerCase().includes(normalizedUsage) ||
          medicine.purpose.toLowerCase().includes(normalizedUsage)
        );
      })
      .filter(function (medicine) {
        return !state.showBookmarkedOnly || state.bookmarkedIds.includes(medicine.id);
      })
      .sort(function (left, right) {
        return left.genericName.localeCompare(right.genericName);
      });
  }

  function syncState() {
    state.categoryOptions = getCategoryOptions();
    state.activeCategoryLabel =
      state.categoryOptions.find(function (option) {
        return option.value === state.selectedCategory;
      })?.label || "All categories";
    state.visibleMedicines = getFilteredMedicines();
    state.selectedMedicine =
      state.allMedicines.find(function (medicine) {
        return medicine.id === state.selectedMedicineId;
      }) || null;
    state.similarMedicines = getSimilarMedicines(state.selectedMedicine);
    state.symptomMatches = getSymptomMatches();
  }

  function validateSearchQuery(value) {
    const normalizedValue = value.trim();

    if (normalizedValue.length > 80) {
      return {
        isValid: false,
        message: "Search terms must be 80 characters or fewer.",
        value: normalizedValue
      };
    }

    return {
      isValid: true,
      message: "",
      value: normalizedValue
    };
  }

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (typeof textContent === "string") {
      element.textContent = textContent;
    }
    return element;
  }

  function createSummaryCard(label, value) {
    const card = createElement("article", "stats__card");
    card.append(
      createElement("p", "stats__label", label),
      createElement("strong", "stats__value", String(value))
    );
    return card;
  }

  function createStatusMessage() {
    if (state.isLoading) {
      return createElement("div", "feedback feedback--info", "Loading verified medicine guidance from openFDA...");
    }

    if (state.errorMessage) {
      return createElement("div", "feedback feedback--error", state.errorMessage);
    }

    if (!state.visibleMedicines.length) {
      return createElement("div", "feedback feedback--info", "No medicines match the current filters.");
    }

    return null;
  }

  function createSkeletonCard() {
    const card = createElement("article", "skeleton-card");
    ["lg", "sm", "sm", "xl"].forEach(function (size) {
      const line = createElement("div", "skeleton-card__line skeleton-card__line--" + size);
      card.append(line);
    });
    return card;
  }

  function createEmptyState() {
    const card = createElement("article", "empty-state");
    card.append(
      createElement(
        "h3",
        "",
        state.showBookmarkedOnly ? "No saved medicines yet." : "No medicines matched your search."
      ),
      createElement(
        "p",
        "",
        state.showBookmarkedOnly
          ? "Save a medicine to keep it handy for later review."
          : "Try adjusting the keyword, usage filter, symptom focus, or category selection."
      )
    );
    return card;
  }

  function createMedicineCard(medicine) {
    const card = createElement("article", "medicine-card");
    const header = createElement("div", "medicine-card__header");
    const titleGroup = createElement("div", "medicine-card__title-group");
    const saveButton = createElement(
      "button",
      "icon-button" + (state.bookmarkedIds.includes(medicine.id) ? " icon-button--active" : ""),
      state.bookmarkedIds.includes(medicine.id) ? "Saved" : "Save"
    );
    saveButton.type = "button";
    saveButton.dataset.action = "bookmark";
    saveButton.dataset.id = medicine.id;

    const badge = createElement("span", "badge", medicine.categoryLabel);
    titleGroup.append(
      createElement("p", "medicine-card__eyebrow", "Medicine profile"),
      createElement("h3", "medicine-card__title", medicine.brandName),
      createElement("p", "medicine-card__subtitle", medicine.genericName),
      badge
    );
    header.append(titleGroup, saveButton);

    const body = createElement("div", "medicine-card__body");
    body.append(
      createMetaItem("Primary use", medicine.purpose),
      createMetaItem("Manufacturer", medicine.manufacturer),
      createMetaItem("Dosage", medicine.dosage),
      createElement("p", "medicine-card__description", medicine.indication)
    );

    const actions = createElement("div", "medicine-card__actions");
    const detailsButton = createElement("button", "button button--primary", "View details");
    detailsButton.type = "button";
    detailsButton.dataset.action = "details";
    detailsButton.dataset.id = medicine.id;
    const similarButton = createElement("button", "button button--secondary", "Find similar");
    similarButton.type = "button";
    similarButton.dataset.action = "details";
    similarButton.dataset.id = medicine.id;
    actions.append(detailsButton, similarButton);

    card.append(header, body, actions);
    return card;
  }

  function createMetaItem(label, value) {
    const item = createElement("div", "medicine-card__meta-item");
    item.append(
      createElement("span", "medicine-card__meta-label", label),
      createElement("strong", "medicine-card__meta-value", value)
    );
    return item;
  }

  function createModal() {
    if (!state.selectedMedicine) {
      return null;
    }

    const overlay = createElement("div", "modal-overlay");
    overlay.dataset.action = "close-overlay";

    const modal = createElement("div", "modal");
    const header = createElement("div", "modal__header");
    const heading = createElement("div", "modal__heading");
    const closeButton = createElement("button", "icon-button", "Close");
    closeButton.type = "button";
    closeButton.dataset.action = "close-modal";

    heading.append(
      createElement("p", "modal__eyebrow", state.selectedMedicine.categoryLabel),
      createElement("h2", "", state.selectedMedicine.brandName),
      createElement(
        "p",
        "modal__subtitle",
        state.selectedMedicine.genericName + " by " + state.selectedMedicine.manufacturer
      )
    );
    header.append(heading, closeButton);

    const body = createElement("div", "modal__body");
    body.append(
      createInfoCard("Uses", state.selectedMedicine.indication),
      createInfoCard("Dosage guidance", state.selectedMedicine.dosage),
      createInfoCard("Possible side effects", state.selectedMedicine.sideEffects),
      createInfoCard("Precautions", state.selectedMedicine.precautions)
    );

    const actions = createElement("div", "modal__actions");
    const bookmarkButton = createElement(
      "button",
      "button " + (state.bookmarkedIds.includes(state.selectedMedicine.id) ? "button--secondary" : "button--primary"),
      state.bookmarkedIds.includes(state.selectedMedicine.id) ? "Saved to bookmarks" : "Save medicine"
    );
    bookmarkButton.type = "button";
    bookmarkButton.dataset.action = "bookmark";
    bookmarkButton.dataset.id = state.selectedMedicine.id;
    actions.append(
      bookmarkButton,
      createElement(
        "p",
        "modal__note",
        "Always confirm dosage, contraindications, and professional guidance before use."
      )
    );

    modal.append(header, body, actions);

    if (state.similarMedicines.length) {
      const similarSection = createElement("section", "modal__similar");
      similarSection.append(createElement("h3", "", "Similar medicines"));
      state.similarMedicines.forEach(function (medicine) {
        const button = createElement(
          "button",
          "similar-pill",
          medicine.brandName + " · " + medicine.categoryLabel
        );
        button.type = "button";
        button.dataset.action = "details";
        button.dataset.id = medicine.id;
        similarSection.append(button);
      });
      modal.append(similarSection);
    }

    overlay.append(modal);
    return overlay;
  }

  function createInfoCard(label, text) {
    const card = createElement("article", "modal__info-card");
    card.append(
      createElement("p", "modal__info-label", label),
      createElement("p", "modal__info-text", text)
    );
    return card;
  }

  function renderSuggestions(container) {
    container.replaceChildren();

    if (!state.symptomMatches.length) {
      if (state.symptomQuery.trim()) {
        container.append(
          createElement(
            "p",
            "checker-empty",
            "No direct symptom match found. Try simpler terms like fever or cough."
          )
        );
      }
      return;
    }

    state.symptomMatches.forEach(function (match) {
      const button = createElement(
        "button",
        "suggestion-pill" + (state.symptomCategory === match.id ? " suggestion-pill--active" : ""),
        match.label + " · " + match.symptoms[0]
      );
      button.type = "button";
      button.dataset.action = "apply-symptom-category";
      button.dataset.id = match.id;
      container.append(button);
    });
  }

  async function fetchMedicineLabels() {
    const controller = new AbortController();
    const timeoutId = setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const url = new URL(API_BASE_URL);
      url.searchParams.set("limit", String(API_LIMIT));

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("The medicine service is unavailable. Please try again.");
      }

      const payload = await response.json();
      const results = Array.isArray(payload.results) ? payload.results : [];
      return results.map(normalizeMedicineRecord);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("The request took too long to complete. Please refresh and try again.");
      }

      throw error instanceof Error
        ? error
        : new Error("Unexpected error while loading medicine labels.");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function renderApp() {
    const nextThemeLabel = state.currentTheme === "dark" ? "Light mode" : "Dark mode";
    const symptomCategoryLabel =
      state.symptomCategory === "all" ? "All symptoms" : getCategoryLabel(state.symptomCategory);

    elements.categorySelect.replaceChildren();
    state.categoryOptions.forEach(function (option) {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      elements.categorySelect.append(optionElement);
    });

    elements.categorySelect.value = state.selectedCategory;
    elements.bookmarkedOnly.checked = state.showBookmarkedOnly;
    elements.searchInput.value = state.searchQuery;
    elements.usageInput.value = state.usageQuery;
    elements.symptomInput.value = state.symptomQuery;
    elements.validationMessage.textContent = state.validationMessage;
    elements.themeToggle.textContent = nextThemeLabel;
    elements.themeToggle.setAttribute("aria-label", "Switch to " + nextThemeLabel.toLowerCase());

    elements.searchInput.disabled = state.isLoading;
    elements.usageInput.disabled = state.isLoading;
    elements.symptomInput.disabled = state.isLoading;
    elements.categorySelect.disabled = state.isLoading;
    elements.refreshButton.disabled = state.isLoading;

    elements.stats.replaceChildren(
      createSummaryCard("Total medicines", state.allMedicines.length),
      createSummaryCard("Visible results", state.visibleMedicines.length),
      createSummaryCard("Active category", state.activeCategoryLabel),
      createSummaryCard("Saved medicines", state.bookmarkedIds.length),
      createSummaryCard("Symptom focus", symptomCategoryLabel)
    );

    elements.statusMessage.replaceChildren();
    const statusMessage = createStatusMessage();
    if (statusMessage) {
      elements.statusMessage.append(statusMessage);
    }

    renderSuggestions(elements.symptomSuggestions);

    elements.results.replaceChildren();
    if (state.isLoading) {
      for (let index = 0; index < 6; index += 1) {
        elements.results.append(createSkeletonCard());
      }
    } else if (!state.visibleMedicines.length) {
      elements.results.append(createEmptyState());
    } else {
      state.visibleMedicines.forEach(function (medicine) {
        elements.results.append(createMedicineCard(medicine));
      });
    }

    elements.modalRoot.replaceChildren();
    const modal = createModal();
    if (modal) {
      elements.modalRoot.append(modal);
    }
  }

  function setSearchQuery(value) {
    const validation = validateSearchQuery(value);
    state.validationMessage = validation.message;

    if (validation.isValid) {
      state.searchQuery = validation.value;
    }

    syncState();
    renderApp();
  }

  async function loadMedicines() {
    state.isLoading = true;
    state.errorMessage = "";
    syncState();
    renderApp();

    try {
      state.allMedicines = await fetchMedicineLabels();
      syncState();
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to load medicine labels right now.";
      syncState();
    } finally {
      state.isLoading = false;
      renderApp();
    }
  }

  function handleResultsClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) {
      return;
    }

    if (target.dataset.action === "bookmark" && target.dataset.id) {
      toggleBookmark(target.dataset.id);
    }

    if (target.dataset.action === "details" && target.dataset.id) {
      state.selectedMedicineId = target.dataset.id;
      syncState();
      renderApp();
    }
  }

  function handleModalClick(event) {
    const target = event.target.closest("[data-action]");

    if (!target) {
      if (event.target.classList.contains("modal-overlay")) {
        state.selectedMedicineId = "";
        syncState();
        renderApp();
      }
      return;
    }

    if (target.dataset.action === "close-modal") {
      state.selectedMedicineId = "";
      syncState();
      renderApp();
    }

    if (target.dataset.action === "bookmark" && target.dataset.id) {
      toggleBookmark(target.dataset.id);
    }

    if (target.dataset.action === "details" && target.dataset.id) {
      state.selectedMedicineId = target.dataset.id;
      syncState();
      renderApp();
    }
  }

  function toggleBookmark(medicineId) {
    if (state.bookmarkedIds.includes(medicineId)) {
      state.bookmarkedIds = state.bookmarkedIds.filter(function (id) {
        return id !== medicineId;
      });
    } else {
      state.bookmarkedIds = state.bookmarkedIds.concat(medicineId);
    }

    saveBookmarks();
    syncState();
    renderApp();
  }

  const appRoot = document.querySelector("#app");
  appRoot.innerHTML = createShell();

  const elements = {
    bookmarkedOnly: document.querySelector("#bookmarked-only"),
    categorySelect: document.querySelector("#category-select"),
    clearSymptomFilter: document.querySelector("#clear-symptom-filter"),
    modalRoot: document.querySelector("#modal-root"),
    refreshButton: document.querySelector("#refresh-button"),
    results: document.querySelector("#results"),
    searchForm: document.querySelector("#search-form"),
    searchInput: document.querySelector("#search-input"),
    stats: document.querySelector("#stats"),
    statusMessage: document.querySelector("#status-message"),
    symptomInput: document.querySelector("#symptom-input"),
    symptomSuggestions: document.querySelector("#symptom-suggestions"),
    themeToggle: document.querySelector("#theme-toggle"),
    usageInput: document.querySelector("#usage-input"),
    validationMessage: document.querySelector("#validation-message")
  };

  state.currentTheme = getInitialTheme();
  applyTheme(state.currentTheme);
  syncState();
  renderApp();

  elements.searchInput.addEventListener("input", function (event) {
    setSearchQuery(event.target.value || "");
  });

  elements.usageInput.addEventListener("input", function (event) {
    state.usageQuery = event.target.value || "";
    syncState();
    renderApp();
  });

  elements.symptomInput.addEventListener("input", function (event) {
    state.symptomQuery = event.target.value || "";
    syncState();
    renderApp();
  });

  elements.categorySelect.addEventListener("change", function (event) {
    state.selectedCategory = event.target.value;
    syncState();
    renderApp();
  });

  elements.bookmarkedOnly.addEventListener("change", function (event) {
    state.showBookmarkedOnly = Boolean(event.target.checked);
    syncState();
    renderApp();
  });

  elements.clearSymptomFilter.addEventListener("click", function () {
    state.symptomQuery = "";
    state.symptomCategory = "all";
    syncState();
    renderApp();
  });

  elements.searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    setSearchQuery(elements.searchInput.value || "");
  });

  elements.refreshButton.addEventListener("click", loadMedicines);

  elements.themeToggle.addEventListener("click", function () {
    applyTheme(state.currentTheme === "dark" ? "light" : "dark");
    renderApp();
  });

  elements.results.addEventListener("click", handleResultsClick);
  elements.modalRoot.addEventListener("click", handleModalClick);

  elements.symptomSuggestions.addEventListener("click", function (event) {
    const target = event.target.closest("[data-action='apply-symptom-category']");
    if (!target || !target.dataset.id) {
      return;
    }

    state.symptomCategory = target.dataset.id;
    syncState();
    renderApp();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.selectedMedicineId) {
      state.selectedMedicineId = "";
      syncState();
      renderApp();
    }
  });

  loadMedicines();
})();
