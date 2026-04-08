# Medi-Quick: Essential Medicine Finder

Medi-Quick is a responsive web application that helps users explore medicine label data from the openFDA Drug Label API. The app allows users to search medicines, filter by category and health tags, sort results, save favorites, and review recent activity through an interactive dashboard.

## API Used

- API: [openFDA Drug Label API](https://open.fda.gov/apis/drug/)
- Endpoint: `https://api.fda.gov/drug/label.json?limit=50`
- Data used: brand name, generic name, indications and usage

## Features

- Fetches live medicine data using `fetch`
- Displays API data dynamically in responsive medicine cards
- Search by brand name, generic name, category, or indication text
- Filter by category and health tags
- Sort results by best match, alphabetical order, or category
- Favorite medicines with local storage persistence
- Recently viewed medicines and reusable search history
- Dark mode toggle with saved theme preference
- Loading skeletons, empty states, and fallback cached data

## JavaScript Concepts Used

- Array higher-order functions:
  - `.map()`
  - `.filter()`
  - `.sort()`
  - `.find()`
  - `.flatMap()`
  - `.reduce()`
  - `.some()`
- DOM manipulation
- Event handling
- Local storage
- Debouncing
- Async API integration with `fetch`

## Project Structure

- `index.html` - layout and UI structure
- `style.css` - styling, responsiveness, and dark mode
- `script.js` - API logic, rendering, search, filtering, sorting, and local storage features

## How to Run

1. Download or clone the project.
2. Open `index.html` in your browser.
3. For best results, run it with a simple local server.

## Milestone 3 Completion

This version completes Milestone 3 by implementing more than three required interactive features:

- Search
- Filtering
- Sorting
- Button interactions using favorites and show more
- Dark mode / light mode

All search, filter, and sort operations are implemented using array higher-order functions as required.
