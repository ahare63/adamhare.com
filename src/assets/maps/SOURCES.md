# Map sources

## world.svg
- Source: https://github.com/flekschas/simple-world-map (world-map.svg), derived from
  https://commons.wikimedia.org/wiki/File:World_map_-_low_resolution.svg
- Author: Al MacDonald (original), Fritz Lekschas (ISO id editing)
- License: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Attribution required; the map file
  (and adaptations of it) must stay under the same license.
- Modifications: added two marker circles, `id="va"` (Vatican City) and `id="li"` (Liechtenstein), because the
  source map has no regions for these microstates. Positions are approximate. Region ids are lowercase ISO 3166-1
  alpha-2 (United Kingdom is `gb`).

## us.svg
- Source: https://commons.wikimedia.org/wiki/File:Blank_US_Map_(states_only).svg
  (https://upload.wikimedia.org/wikipedia/commons/1/1a/Blank_US_Map_%28states_only%29.svg)
- Author: Heitordp (derived from Blank USA, w territories.svg)
- License: CC0 1.0 (public domain dedication)
- Modifications: added `id="xx"` (lowercase USPS code, includes `dc`) to each state path; the original only had
  `class="xx"`.
