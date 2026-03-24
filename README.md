# Medi-Quick — Essential Medicine Finder

Search, filter, and explore real medication data powered by the U.S. FDA.

Medi-Quick is a web application that helps users quickly look up real medications, understand their uses, and explore drug information using live data from the OpenFDA API. No account needed, no installation required.

---

## Problem Statement

People often need quick, reliable information about medications — what a drug is used for, who manufactures it, what its generic name is, or what category it falls under. Right now, that information is spread across complex medical websites full of jargon and ads. There is no simple, clean tool that lets everyday users search, filter, and sort real drug data in one place without needing a login or technical knowledge.

Medi-Quick solves this by pulling official FDA data into a clean, easy-to-use browser interface.

---

## How It Works

1. Type any drug name (brand or generic) into the search bar — for example, ibuprofen, aspirin, or amoxicillin.
2. The app fetches real drug records from the OpenFDA database.
3. Results appear as medicine cards showing the brand name, generic name, manufacturer, route of administration, and product type.
4. Use the filter and sort controls to narrow down results.
5. Save favourite medications to a personal list stored in localStorage.

---

## Features

### Core Features

All search, filter, and sort operations use JavaScript Array Higher-Order Functions. No for or while loops are used anywhere.

| Feature | HOF Used | Description |
|---|---|---|
| Keyword Search | Array.filter() | Filter fetched results by brand name or generic name |
| Filter by Route | Array.filter() | Show only oral, topical, injectable, or ophthalmic drugs |
| Filter by Product Type | Array.filter() | Show OTC or prescription drugs only |
| Sort Alphabetically | Array.sort() | Sort results A to Z or Z to A by brand name |
| Sort by Manufacturer | Array.sort() | Sort results by manufacturer name |
| Render Cards | Array.map() | Map each drug object from the API to a visual card |
| Favourites Count | Array.reduce() | Count total saved medications |
| Favourites Filter | Array.filter() | Show only bookmarked medications |

### UI and UX Features

- Dark mode and light mode toggle with preference saved in localStorage
- Fully responsive layout that works on mobile, tablet, and desktop
- Loading indicator shown while data is being fetched
- Error handling for failed requests or empty results
- localStorage persistence for favourites and theme preference

### Bonus Features (Stretch Goals)

- Debouncing on the search bar to avoid unnecessary API calls on every keystroke
- Pagination to handle large result sets cleanly
- Infinite scroll as an alternative to pagination
- PWA support with a service worker and manifest file for offline access

---

## API Used

OpenFDA Drug Label API

| Property | Details |
|---|---|
| API Name | OpenFDA Drug Label API |
| Provider | U.S. Food and Drug Administration |
| Base URL | https://api.fda.gov/drug/label.json |
| Authentication | No API key required for basic usage |
| Rate Limit | 1000 requests per day (unauthenticated), 120 per minute |
| Documentation | https://open.fda.gov/apis/drug/label/ |

This API was chosen because it is completely free, requires no sign-up, returns clean structured data, and works directly with the browser fetch method. It covers millions of real drug records and the data comes from an official U.S. government source, which makes it reliable and appropriate for a portfolio project.

Example API call:

```
https://api.fda.gov/drug/label.json?search=openfda.brand_name:ibuprofen&limit=20
```

Sample response fields used in this project:

```json
{
  "openfda": {
    "brand_name": ["Advil"],
    "generic_name": ["IBUPROFEN"],
    "manufacturer_name": ["Pfizer Consumer Healthcare"],
    "route": ["ORAL"],
    "product_type": ["HUMAN OTC DRUG"]
  },
  "purpose": ["Pain reliever/fever reducer"]
}
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and semantic markup |
| CSS3 | Responsive layout using Flexbox and CSS Grid |
| Vanilla JavaScript (ES6+) | DOM manipulation, fetch API calls, HOFs, localStorage |
| OpenFDA API | Source of all medication data |
| localStorage | Browser-side persistence for favourites and theme |

No frameworks, no build tools, no npm required. Pure HTML, CSS, and JavaScript.

---

## Project Structure

```
medi-quick/
├── index.html        # App shell, search bar, filter controls, card grid
├── style.css         # All styles including dark mode and responsive layout
├── app.js            # Entry point, event listeners, render logic
├── api.js            # All OpenFDA fetch calls
├── search.js         # Search, filter, and sort functions using HOFs
├── favourites.js     # Add, remove, and persist favourites
├── storage.js        # localStorage utility functions
└── README.md         # Project documentation
```

---

## Getting Started

### Prerequisites

- Any modern browser (Chrome, Firefox, Edge, or Safari)
- No API key required
- No npm, no build step, no installation needed

### Setup

1. Clone the repository

```bash
git clone https://github.com/mehaksharma25/medi-quick-app.git
cd medi-quick-app
```

2. Open the project in VS Code, then right-click index.html and select "Open with Live Server". The app will open at http://127.0.0.1:5500 in your browser.

   Alternatively, you can just open index.html directly in a browser, though Live Server is recommended for best results.

3. Type any drug name into the search bar and press Enter. No configuration needed.

### Optional: API Key for Higher Rate Limits

If you need more than 1000 requests per day, you can register for a free key at https://open.fda.gov/apis/authentication/ and add it to api.js:

```js
const API_KEY = 'your_key_here';
const BASE_URL = `https://api.fda.gov/drug/label.json${API_KEY ? `?api_key=${API_KEY}&` : '?'}`;
```

---

## Milestone Plan

### Milestone 1 — Planning and Setup (Due: 23rd March)
- [x] Finalised project idea and problem statement
- [x] Selected and documented the OpenFDA API
- [x] Created GitHub repository
- [x] Defined full feature set with HOF mapping
- [x] Planned project file structure
- [x] Written complete README

### Milestone 2 — API Integration (Due: 1st April)
- [ ] Build fetchDrugs(query) in api.js using fetch
- [ ] Dynamically render drug cards to the DOM
- [ ] Show loading spinner during fetch
- [ ] Handle error states gracefully
- [ ] Ensure responsive layout across all screen sizes

### Milestone 3 — Core Features (Due: 8th April)
- [ ] Keyword search using Array.filter()
- [ ] Filter by route using Array.filter()
- [ ] Filter by product type using Array.filter()
- [ ] Sort alphabetically using Array.sort()
- [ ] Sort by manufacturer using Array.sort()
- [ ] Render cards using Array.map()
- [ ] Favourites count using Array.reduce()
- [ ] Favourites toggle and filter using Array.filter()
- [ ] Dark mode toggle with localStorage persistence
- [ ] Debouncing on search input

### Milestone 4 — Deployment and Documentation (Due: 10th April)
- [ ] Refactor and clean the codebase
- [ ] Ensure all error handling is complete
- [ ] Deploy to GitHub Pages or Vercel
- [ ] Add live demo link to this README
- [ ] Final README update with screenshots

---

## Best Practices Followed

- All searching, filtering, and sorting uses Array HOFs only. No for or while loops.
- Code is split into separate files by responsibility: api.js, search.js, favourites.js, storage.js.
- Functions have clear, descriptive names like filterByRoute(), sortAlphabetically(), and renderDrugCard().
- All fetch calls are wrapped in try/catch with user-facing error messages.
- No logic is repeated. Shared utilities are written once and reused.
- All content is fetched live from the API. Nothing is hardcoded.

---

## Deployment

Will be deployed on GitHub Pages after Milestone 4. Live link will be added here once available.

---

## Screenshots

To be added after Milestone 2.

---

## Author

[Mehak Sharma](https://github.com/mehaksharma25)

Built as part of a JavaScript and API Integration academic project.

---

Medi-Quick — Real drug data. Clean interface. No clutter.
