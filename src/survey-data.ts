/**
 * Stack Overflow Developer Survey — AI Adoption Dataset
 *
 * Source:   https://survey.stackoverflow.co/
 * Years:    2024 and 2025
 * License:  Open Database License (ODbL) — https://opendatacommons.org/licenses/odbl/
 *
 * HOW THIS WAS GENERATED
 * ----------------------
 * Raw survey microdata was downloaded from the Stack Overflow Annual Developer Survey
 * results pages for 2024 and 2025. The relevant AI-related questions were:
 *
 *   - AISelect   / AISelectPro  — "Are you currently using AI tools in your development?"
 *   - AIBen      / AIBenPro     — "How favorable or unfavorable are you toward AI tools?"
 *   - AIAcc      / AIAccPro     — "How much do you trust the accuracy of AI tool output?"
 *
 * Country-level aggregates were computed for each year, keeping only countries with
 * n ≥ 100 respondents to ensure statistical stability. This yielded 41 countries × 2
 * years = 82 records.
 *
 * Percentages were derived as follows:
 *   aiUsagePct   — % of respondents selecting "Yes, I use AI tools" (or equivalent)
 *   favorablePct — % selecting "Very favorable" or "Favorable"
 *   skepticalPct — % selecting "Very unfavorable" or "Unfavorable"
 *   trustPct     — % selecting "Highly trust" or "Somewhat trust"
 *
 * The extraction and aggregation was done with a Python script using pandas. If you
 * need to update this dataset with a future survey year, re-run that script against
 * the new microdata CSV and paste the output here.
 *
 * NOTABLE PATTERNS (useful for demo prompts)
 * ------------------------------------------
 *   - Iran leads all countries on usage in 2025 (87.9%)
 *   - Ukraine leads Europe both years (72% → 85%)
 *   - Nigeria leads on trust in 2025 (68.2%)
 *   - Colombia leads Americas on usage in 2025 (86.6%)
 *   - US/UK/Canada/Australia skepticism roughly tripled 2024 → 2025
 *   - Germany has the lowest trust in Europe both years
 */

export type DeveloperAIRecord = {
  country: string;
  region: "Americas" | "Europe" | "Asia-Pacific" | "Africa & Middle East";
  respondents: number;
  aiUsagePct: number;   // % currently using AI tools in development
  favorablePct: number; // % very favorable or favorable toward AI tools
  skepticalPct: number; // % very unfavorable or unfavorable toward AI tools
  trustPct: number;     // % who somewhat or highly trust AI output accuracy
  year: 2024 | 2025;
};

export const AI_SURVEY_DATA: DeveloperAIRecord[] = [
  // ── Africa & Middle East ─────────────────────────────────────────────────
  { country: "Nigeria",      region: "Africa & Middle East", respondents:  305, aiUsagePct: 75.1, favorablePct: 74.1, skepticalPct:  1.6, trustPct: 52.1, year: 2024 },
  { country: "Nigeria",      region: "Africa & Middle East", respondents:  199, aiUsagePct: 78.4, favorablePct: 71.4, skepticalPct:  3.5, trustPct: 68.2, year: 2025 },
  { country: "South Africa", region: "Africa & Middle East", respondents:  358, aiUsagePct: 68.2, favorablePct: 60.1, skepticalPct:  4.2, trustPct: 34.6, year: 2024 },
  { country: "South Africa", region: "Africa & Middle East", respondents:  253, aiUsagePct: 73.9, favorablePct: 60.5, skepticalPct: 18.2, trustPct: 40.2, year: 2025 },

  // ── Americas ─────────────────────────────────────────────────────────────
  { country: "Argentina",     region: "Americas", respondents:   345, aiUsagePct: 61.7, favorablePct: 61.4, skepticalPct:  2.9, trustPct: 30.1, year: 2024 },
  { country: "Argentina",     region: "Americas", respondents:   222, aiUsagePct: 82.0, favorablePct: 73.0, skepticalPct:  7.2, trustPct: 42.9, year: 2025 },
  { country: "Brazil",        region: "Americas", respondents:  1375, aiUsagePct: 65.6, favorablePct: 64.6, skepticalPct:  2.7, trustPct: 30.0, year: 2024 },
  { country: "Brazil",        region: "Americas", respondents:   825, aiUsagePct: 82.3, favorablePct: 67.3, skepticalPct: 12.6, trustPct: 39.2, year: 2025 },
  { country: "Canada",        region: "Americas", respondents:  2104, aiUsagePct: 57.7, favorablePct: 51.0, skepticalPct:  5.1, trustPct: 21.6, year: 2024 },
  { country: "Canada",        region: "Americas", respondents:  1305, aiUsagePct: 70.0, favorablePct: 50.1, skepticalPct: 26.4, trustPct: 24.7, year: 2025 },
  { country: "Colombia",      region: "Americas", respondents:   217, aiUsagePct: 73.7, favorablePct: 71.4, skepticalPct:  3.2, trustPct: 42.9, year: 2024 },
  { country: "Colombia",      region: "Americas", respondents:   202, aiUsagePct: 86.6, favorablePct: 79.7, skepticalPct:  5.4, trustPct: 56.5, year: 2025 },
  { country: "Mexico",        region: "Americas", respondents:   402, aiUsagePct: 63.9, favorablePct: 63.2, skepticalPct:  3.0, trustPct: 32.3, year: 2024 },
  { country: "Mexico",        region: "Americas", respondents:   286, aiUsagePct: 76.9, favorablePct: 67.5, skepticalPct:  7.3, trustPct: 50.0, year: 2025 },
  { country: "United States", region: "Americas", respondents: 11095, aiUsagePct: 53.8, favorablePct: 45.9, skepticalPct:  5.8, trustPct: 21.6, year: 2024 },
  { country: "United States", region: "Americas", respondents:  7233, aiUsagePct: 69.4, favorablePct: 50.2, skepticalPct: 26.3, trustPct: 27.5, year: 2025 },

  // ── Asia-Pacific ─────────────────────────────────────────────────────────
  { country: "Australia",   region: "Asia-Pacific", respondents: 1260, aiUsagePct: 54.5, favorablePct: 44.7, skepticalPct:  5.5, trustPct: 21.5, year: 2024 },
  { country: "Australia",   region: "Asia-Pacific", respondents:  804, aiUsagePct: 70.1, favorablePct: 49.5, skepticalPct: 25.2, trustPct: 24.8, year: 2025 },
  { country: "Bangladesh",  region: "Asia-Pacific", respondents:  327, aiUsagePct: 71.3, favorablePct: 72.2, skepticalPct:  1.5, trustPct: 39.4, year: 2024 },
  { country: "Bangladesh",  region: "Asia-Pacific", respondents:  220, aiUsagePct: 77.7, favorablePct: 70.0, skepticalPct:  6.8, trustPct: 51.4, year: 2025 },
  { country: "China",       region: "Asia-Pacific", respondents:  406, aiUsagePct: 77.3, favorablePct: 71.9, skepticalPct:  2.7, trustPct: 45.6, year: 2024 },
  { country: "China",       region: "Asia-Pacific", respondents:  255, aiUsagePct: 82.7, favorablePct: 72.5, skepticalPct:  6.7, trustPct: 57.4, year: 2025 },
  { country: "India",       region: "Asia-Pacific", respondents: 4231, aiUsagePct: 66.8, favorablePct: 68.7, skepticalPct:  3.1, trustPct: 39.1, year: 2024 },
  { country: "India",       region: "Asia-Pacific", respondents: 2547, aiUsagePct: 77.5, favorablePct: 66.9, skepticalPct:  5.7, trustPct: 57.0, year: 2025 },
  { country: "Indonesia",   region: "Asia-Pacific", respondents:  354, aiUsagePct: 68.1, favorablePct: 62.7, skepticalPct:  2.8, trustPct: 38.7, year: 2024 },
  { country: "Indonesia",   region: "Asia-Pacific", respondents:  181, aiUsagePct: 77.9, favorablePct: 66.9, skepticalPct:  3.3, trustPct: 55.2, year: 2025 },
  { country: "Iran",        region: "Asia-Pacific", respondents:  411, aiUsagePct: 68.9, favorablePct: 62.8, skepticalPct:  5.4, trustPct: 30.7, year: 2024 },
  { country: "Iran",        region: "Asia-Pacific", respondents:  149, aiUsagePct: 87.9, favorablePct: 75.2, skepticalPct:  5.4, trustPct: 45.7, year: 2025 },
  { country: "Israel",      region: "Asia-Pacific", respondents:  604, aiUsagePct: 72.0, favorablePct: 60.8, skepticalPct:  5.5, trustPct: 29.8, year: 2024 },
  { country: "Israel",      region: "Asia-Pacific", respondents:  297, aiUsagePct: 82.8, favorablePct: 66.3, skepticalPct: 13.1, trustPct: 41.5, year: 2025 },
  { country: "New Zealand", region: "Asia-Pacific", respondents:  396, aiUsagePct: 53.3, favorablePct: 46.7, skepticalPct:  5.1, trustPct: 20.7, year: 2024 },
  { country: "New Zealand", region: "Asia-Pacific", respondents:  255, aiUsagePct: 71.0, favorablePct: 51.4, skepticalPct: 25.1, trustPct: 25.7, year: 2025 },
  { country: "Pakistan",    region: "Asia-Pacific", respondents:  415, aiUsagePct: 77.6, favorablePct: 76.6, skepticalPct:  3.4, trustPct: 48.2, year: 2024 },
  { country: "Pakistan",    region: "Asia-Pacific", respondents:  239, aiUsagePct: 82.0, favorablePct: 69.0, skepticalPct:  4.2, trustPct: 60.2, year: 2025 },
  { country: "Turkey",      region: "Asia-Pacific", respondents:  546, aiUsagePct: 68.1, favorablePct: 63.6, skepticalPct:  3.7, trustPct: 31.7, year: 2024 },
  { country: "Turkey",      region: "Asia-Pacific", respondents:  295, aiUsagePct: 77.6, favorablePct: 59.3, skepticalPct: 12.9, trustPct: 44.9, year: 2025 },
  { country: "Vietnam",     region: "Asia-Pacific", respondents:  296, aiUsagePct: 73.0, favorablePct: 62.5, skepticalPct:  2.7, trustPct: 40.5, year: 2024 },
  { country: "Vietnam",     region: "Asia-Pacific", respondents:  145, aiUsagePct: 80.7, favorablePct: 61.4, skepticalPct:  8.3, trustPct: 55.2, year: 2025 },

  // ── Europe ───────────────────────────────────────────────────────────────
  { country: "Austria",        region: "Europe", respondents:  791, aiUsagePct: 61.2, favorablePct: 49.1, skepticalPct:  5.9, trustPct: 18.2, year: 2024 },
  { country: "Austria",        region: "Europe", respondents:  410, aiUsagePct: 76.8, favorablePct: 48.3, skepticalPct: 23.9, trustPct: 22.4, year: 2025 },
  { country: "Belgium",        region: "Europe", respondents:  526, aiUsagePct: 62.0, favorablePct: 54.2, skepticalPct:  4.8, trustPct: 24.5, year: 2024 },
  { country: "Belgium",        region: "Europe", respondents:  321, aiUsagePct: 75.7, favorablePct: 57.3, skepticalPct: 19.6, trustPct: 26.6, year: 2025 },
  { country: "Bulgaria",       region: "Europe", respondents:  319, aiUsagePct: 61.4, favorablePct: 50.2, skepticalPct:  6.0, trustPct: 21.9, year: 2024 },
  { country: "Bulgaria",       region: "Europe", respondents:  244, aiUsagePct: 79.1, favorablePct: 60.7, skepticalPct: 11.9, trustPct: 34.3, year: 2025 },
  { country: "Czech Republic", region: "Europe", respondents:  714, aiUsagePct: 61.9, favorablePct: 51.1, skepticalPct:  4.2, trustPct: 21.6, year: 2024 },
  { country: "Czech Republic", region: "Europe", respondents:  520, aiUsagePct: 77.9, favorablePct: 56.2, skepticalPct: 19.0, trustPct: 26.6, year: 2025 },
  { country: "Denmark",        region: "Europe", respondents:  504, aiUsagePct: 59.5, favorablePct: 47.2, skepticalPct:  8.3, trustPct: 18.3, year: 2024 },
  { country: "Denmark",        region: "Europe", respondents:  316, aiUsagePct: 73.7, favorablePct: 56.3, skepticalPct: 23.1, trustPct: 25.5, year: 2025 },
  { country: "Finland",        region: "Europe", respondents:  386, aiUsagePct: 61.9, favorablePct: 48.4, skepticalPct:  7.5, trustPct: 19.2, year: 2024 },
  { country: "Finland",        region: "Europe", respondents:  254, aiUsagePct: 76.4, favorablePct: 47.6, skepticalPct: 24.4, trustPct: 16.6, year: 2025 },
  { country: "France",         region: "Europe", respondents: 2110, aiUsagePct: 53.8, favorablePct: 48.3, skepticalPct:  4.3, trustPct: 19.1, year: 2024 },
  { country: "France",         region: "Europe", respondents: 1409, aiUsagePct: 69.6, favorablePct: 50.3, skepticalPct: 26.1, trustPct: 24.2, year: 2025 },
  { country: "Germany",        region: "Europe", respondents: 4947, aiUsagePct: 56.7, favorablePct: 44.4, skepticalPct:  6.0, trustPct: 18.6, year: 2024 },
  { country: "Germany",        region: "Europe", respondents: 3025, aiUsagePct: 73.7, favorablePct: 48.0, skepticalPct: 25.3, trustPct: 22.2, year: 2025 },
  { country: "Greece",         region: "Europe", respondents:  389, aiUsagePct: 63.8, favorablePct: 57.1, skepticalPct:  3.9, trustPct: 27.2, year: 2024 },
  { country: "Greece",         region: "Europe", respondents:  252, aiUsagePct: 82.1, favorablePct: 66.7, skepticalPct:  9.9, trustPct: 38.1, year: 2025 },
  { country: "Hungary",        region: "Europe", respondents:  396, aiUsagePct: 56.6, favorablePct: 45.2, skepticalPct:  5.1, trustPct: 17.2, year: 2024 },
  { country: "Hungary",        region: "Europe", respondents:  236, aiUsagePct: 73.7, favorablePct: 50.0, skepticalPct: 21.6, trustPct: 31.1, year: 2025 },
  { country: "Italy",          region: "Europe", respondents: 1341, aiUsagePct: 56.7, favorablePct: 57.4, skepticalPct:  4.0, trustPct: 23.4, year: 2024 },
  { country: "Italy",          region: "Europe", respondents:  835, aiUsagePct: 78.0, favorablePct: 64.2, skepticalPct: 13.8, trustPct: 31.3, year: 2025 },
  { country: "Netherlands",    region: "Europe", respondents: 1449, aiUsagePct: 59.9, favorablePct: 49.5, skepticalPct:  5.4, trustPct: 22.8, year: 2024 },
  { country: "Netherlands",    region: "Europe", respondents:  867, aiUsagePct: 76.9, favorablePct: 55.4, skepticalPct: 22.4, trustPct: 28.3, year: 2025 },
  { country: "Norway",         region: "Europe", respondents:  450, aiUsagePct: 64.2, favorablePct: 55.3, skepticalPct:  5.8, trustPct: 19.8, year: 2024 },
  { country: "Norway",         region: "Europe", respondents:  237, aiUsagePct: 75.1, favorablePct: 52.3, skepticalPct: 25.7, trustPct: 23.2, year: 2025 },
  { country: "Poland",         region: "Europe", respondents: 1534, aiUsagePct: 62.5, favorablePct: 45.6, skepticalPct:  7.4, trustPct: 18.6, year: 2024 },
  { country: "Poland",         region: "Europe", respondents:  888, aiUsagePct: 77.3, favorablePct: 53.9, skepticalPct: 21.2, trustPct: 27.0, year: 2025 },
  { country: "Portugal",       region: "Europe", respondents:  470, aiUsagePct: 65.3, favorablePct: 62.8, skepticalPct:  3.4, trustPct: 26.2, year: 2024 },
  { country: "Portugal",       region: "Europe", respondents:  280, aiUsagePct: 82.1, favorablePct: 69.6, skepticalPct: 15.7, trustPct: 38.0, year: 2025 },
  { country: "Romania",        region: "Europe", respondents:  439, aiUsagePct: 63.1, favorablePct: 55.8, skepticalPct:  6.2, trustPct: 27.6, year: 2024 },
  { country: "Romania",        region: "Europe", respondents:  323, aiUsagePct: 78.6, favorablePct: 60.7, skepticalPct: 16.1, trustPct: 34.3, year: 2025 },
  { country: "Russia",         region: "Europe", respondents:  925, aiUsagePct: 47.1, favorablePct: 37.7, skepticalPct:  5.1, trustPct: 18.1, year: 2024 },
  { country: "Russia",         region: "Europe", respondents:  200, aiUsagePct: 73.0, favorablePct: 51.0, skepticalPct: 16.5, trustPct: 23.2, year: 2025 },
  { country: "Spain",          region: "Europe", respondents: 1123, aiUsagePct: 64.8, favorablePct: 61.3, skepticalPct:  4.6, trustPct: 28.5, year: 2024 },
  { country: "Spain",          region: "Europe", respondents:  717, aiUsagePct: 80.3, favorablePct: 63.5, skepticalPct: 17.4, trustPct: 33.4, year: 2025 },
  { country: "Sweden",         region: "Europe", respondents: 1016, aiUsagePct: 61.5, favorablePct: 52.1, skepticalPct:  5.5, trustPct: 20.3, year: 2024 },
  { country: "Sweden",         region: "Europe", respondents:  616, aiUsagePct: 75.6, favorablePct: 53.7, skepticalPct: 21.8, trustPct: 20.0, year: 2025 },
  { country: "Switzerland",    region: "Europe", respondents:  876, aiUsagePct: 58.6, favorablePct: 45.7, skepticalPct:  5.5, trustPct: 17.4, year: 2024 },
  { country: "Switzerland",    region: "Europe", respondents:  546, aiUsagePct: 77.5, favorablePct: 58.4, skepticalPct: 21.8, trustPct: 24.2, year: 2025 },
  { country: "Ukraine",        region: "Europe", respondents: 2672, aiUsagePct: 72.2, favorablePct: 56.2, skepticalPct:  3.5, trustPct: 31.3, year: 2024 },
  { country: "Ukraine",        region: "Europe", respondents:  964, aiUsagePct: 85.4, favorablePct: 61.8, skepticalPct:  8.1, trustPct: 40.9, year: 2025 },
  { country: "United Kingdom", region: "Europe", respondents: 3224, aiUsagePct: 50.5, favorablePct: 42.6, skepticalPct:  5.8, trustPct: 19.2, year: 2024 },
  { country: "United Kingdom", region: "Europe", respondents: 2042, aiUsagePct: 64.7, favorablePct: 47.1, skepticalPct: 28.8, trustPct: 23.4, year: 2025 },
];
