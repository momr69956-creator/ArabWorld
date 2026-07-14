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
(Natural Earth, 1:50m) rendered with [D3](https://d3js.org/). The dataset's
Syrian border is adjusted at load time so that the Golan Heights are shown as
part of Syria, with the border following the Yarmouk River, the eastern shore
of the Sea of Galilee and the upper Jordan River.

## Running

The site is a single static page — open `index.html` through any web server,
e.g.:

```sh
python3 -m http.server
```

Audio clips live in `assets/audio/` (`01.mp3` … `20.mp3`).
