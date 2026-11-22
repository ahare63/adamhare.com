import { parseDatedTab } from './sheet-tab.js';

// Museums tab CSV -> [{name, date, city, country, link}], newest first.
export function parseMuseums(text, { cells } = {}) {
  return parseDatedTab(text, { tab: 'Museums', columns: ['Name', 'Date', 'City', 'Country'], cells });
}
