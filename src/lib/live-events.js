import { parseDatedTab } from './sheet-tab.js';

// Live Events tab CSV -> [{name, type, date, venue, city, country, link}], newest first.
export function parseLiveEvents(text, { cells } = {}) {
  return parseDatedTab(text, { tab: 'Live Events', columns: ['Name', 'Type', 'Date', 'Venue', 'City', 'Country'], cells });
}
