import worldSvg from '../assets/maps/world.svg?raw';
import usSvg from '../assets/maps/us.svg?raw';

// The map SVG as an inline-able string. `map`: 'world' | 'us'.
export function mapSvg(map) {
  return (map === 'world' ? worldSvg : usSvg)
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    // The source maps ship their own <style> blocks which override our palette
    // (seen as ugly state colors); strip them so global.css rules apply.
    .replace(/<style[\s\S]*?<\/style>/g, '');
}
