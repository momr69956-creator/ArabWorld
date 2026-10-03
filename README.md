# ArabWorld — Interactive Atlas

An interactive map of the Arab world for language learners. Click any of the
20 countries to hear its name and capital city in Arabic.

## Features

- **Interactive map** — pan, zoom (buttons, mouse wheel, touch), and click any
  country to select it and play its audio.
- **Country drawer** — a browsable list of all countries with flags and
  capitals; selecting an entry zooms the map to that country.
- **Now Playing card** — shows the country's flag, English and Arabic names,
  and its capital in English and Arabic, with play/pause controls.
- **Transliteration toggle** — the *abc Transliteration* switch in the header
  shows Latin transliterations of every Arabic name (country and capital) for
  students who cannot read Arabic script yet. The preference is remembered
  between visits.
- **Keyboard navigation** — arrow keys move between countries, space
  plays/pauses, `+`/`-` zoom, `Esc` closes the card / resets the view.
- **Audio remap tool** — a hidden editor (activated via the tweaks protocol)
  for reassigning audio files to countries.

## Map data

Country shapes come from [world-atlas](https://github.com/topojson/world-atlas)
(Natural Earth, 1:50m) rendered with [D3](https://d3js.org/). They are
pre-processed by `tools/build-map.js` into `assets/map/world.js`, which:

- shows the Golan Heights as part of Syria, with the border following the
  Yarmouk River, the eastern shore of the Sea of Galilee and the upper Jordan
  River;
- keeps full detail around the Arab world and simplifies coastlines and
  borders the farther away they are, and drops land that can never be shown
  (about 85 KB compressed instead of 224 KB).

To rebuild it after changing the script:

```sh
npm install --no-save world-atlas@2 topojson-client@3 topojson-server@3 topojson-simplify@3
node tools/build-map.js
```

## Performance

The map is tuned to stay smooth on phones:

- dragging and pinching move the already-drawn map on the GPU and redraw it
  once the gesture ends, instead of redrawing every frame;
- animations redraw only the visible part of the map, and on touch devices
  skip the thin grey borders while moving;
- everything (D3, TopoJSON, map data) is served from this site, so no
  third-party CDN is needed and the page also works when opened as a file.

## Running

The site is a single static page — open `index.html` directly, or through any
web server, e.g.:

```sh
python3 -m http.server
```

Audio clips live in `assets/audio/` (`01.mp3` … `20.mp3`). Third-party
libraries are in `assets/vendor/` with their licences.
