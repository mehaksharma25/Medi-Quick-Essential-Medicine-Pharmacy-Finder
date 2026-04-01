// Core API configuration
const API_BASE_URL = "https://api.fda.gov/drug/label.json";
const PAGE_LIMIT = 100;
const PAGE_BATCHES = 25;
const SAVED_KEY = "mediQuickSaved";
const RECENT_KEY = "mediQuickRecent";
const CACHE_KEY = "mediQuickApiCache";
const HISTORY_KEY = "mediQuickSearchHistory";
const THEME_KEY = "mediQuickTheme";
const CACHE_TTL = 1000 * 60 * 60 * 6;
const MAX_RECENT = 6;
const MAX_HISTORY = 8;

// Graceful fallback data used when the API is unavailable
const fallbackMedicines = [
  {
    openfda: { brand_name: ["Paracetamol"], generic_name: ["Acetaminophen"] },
    indications_and_usage: ["Used to relieve pain and reduce fever."]
  },
  {
    openfda: { brand_name: ["Amoxicillin"], generic_name: ["Amoxicillin"] },
    indications_and_usage: ["Antibiotic used to treat bacterial infection."]
  },
  {
    openfda: { brand_name: ["Cetirizine"], generic_name: ["Cetirizine Hydrochloride"] },
    indications_and_usage: ["Used for allergy symptoms such as sneezing and itching."]
  },
  {
    openfda: { brand_name: ["Omeprazole"], generic_name: ["Omeprazole"] },
    indications_and_usage: ["Used for acidity, stomach irritation, and ulcer-related symptoms."]
  }
];

// Shared application state
const state = {
  medicines: [],
  visibleMedicines: [],
  searchTerm: "",
  usageTerm: "",
  selectedCategory: "All",
  selectedKeyword: "All",
  sortBy: "relevance",
  savedIds: [],
  recentIds: [],
  searchHistory: [],
  isUsingFallback: false,
  isUsingCache: false,
  isDarkMode: false,
};

// Category groups for friendly healthcare filtering
const categoryMatchers = [
  { name: "Pain Relief", keywords: ["pain", "migraine", "inflammation", "headache"] },
  { name: "Fever", keywords: ["fever", "temperature", "febrile"] },
  { name: "Antibiotic", keywords: ["infection", "bacterial", "antibiotic", "antibacterial"] },
  { name: "Allergy", keywords: ["allergy", "allergic", "itching", "rhinitis", "histamine"] },
  { name: "Respiratory", keywords: ["cough", "asthma", "respiratory", "breathing", "bronch"] },
  { name: "Digestive", keywords: ["stomach", "acid", "digest", "nausea", "constipation", "ulcer"] },
  { name: "Cardiovascular", keywords: ["heart", "blood pressure", "cardiac", "hypertension", "cholesterol"] },
  { name: "Diabetes", keywords: ["diabetes", "glucose", "insulin", "blood sugar"] },
];

// Usage keyword tags that power the quick chip filters
const keywordMatchers = [
  "pain",
  "fever",
  "infection",
  "allergy",
  "cough",
  "asthma",
  "stomach",
  "acid",
  "heart",
  "blood pressure",
];
// Search relevance keeps the most helpful results first
const getRelevanceScore = (medicine) => {
  const searchValue = state.searchTerm.toLowerCase();
  const usageValue = state.usageTerm.toLowerCase();

  const brandStarts = medicine.brandName.toLowerCase().startsWith(searchValue) ? 4 : 0;
  const genericStarts = medicine.genericName.toLowerCase().startsWith(searchValue) ? 3 : 0;
  const brandIncludes = medicine.brandName.toLowerCase().includes(searchValue) ? 2 : 0;
  const genericIncludes = medicine.genericName.toLowerCase().includes(searchValue) ? 1 : 0;
  const indicationIncludes = medicine.indication.toLowerCase().includes(searchValue) ? 1 : 0;
  const usageIncludes = usageValue && medicine.indication.toLowerCase().includes(usageValue) ? 2 : 0;

  return brandStarts + genericStarts + brandIncludes + genericIncludes + indicationIncludes + usageIncludes;
};
