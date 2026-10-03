#!/usr/bin/env node
// Builds assets/map/world.js — the compact map data used by index.html.
//
// Source: world-atlas countries-50m (Natural Earth 1:50m). The build
//   1. drops land far outside the area the map can show,
//   2. moves the Golan Heights into Syria (border along the Yarmouk River,
//      the Sea of Galilee's eastern shore and the upper Jordan River),
//   3. simplifies coastlines and borders, keeping full detail around the
//      Arab world and simplifying more the farther away a line is,
//   4. writes the result as a script so the page also works from file://.
//
// Usage (from the repository root):
//   npm install --no-save world-atlas@2 topojson-client@3 topojson-server@3 topojson-simplify@3
//   node tools/build-map.js

const fs = require("fs");
const path = require("path");
const topojson = {
  ...require("topojson-client"),
  ...require("topojson-server"),
  ...require("topojson-simplify"),
};

const OUT = path.join(__dirname, "..", "assets", "map", "world.js");

// Land outside this lon/lat box can never be panned into view.
const KEEP = { x0: -110, y0: -58, x1: 160, y1: 84 };
// Full detail inside this box (the Arab world and its neighbours).
const CORE = { x0: -20, y0: -5, x1: 65, y1: 44 };
// Minimum Visvalingam triangle area (degrees²) kept inside CORE; the
// threshold grows with distance from CORE so far-away coasts are coarser.
const MIN_AREA = 2e-4;
const FALLOFF_DEG = 4;

const world = require("world-atlas/countries-50m.json");
const features = topojson.feature(world, world.objects.countries).features;

// ── 1. Drop polygons that are entirely outside KEEP ─────────────────────────
function ringBox(ring) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
const overlaps = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;

const kept = [];
for (const f of features) {
  if (f.id === "010") continue; // Antarctica
  const g = f.geometry;
  if (!g) continue;
  const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates)
    .filter(poly => overlaps(ringBox(poly[0]), KEEP));
  if (!polys.length) continue;
  kept.push({
    type: "Feature",
    id: f.id,
    properties: {},
    geometry: polys.length === 1
      ? { type: "Polygon", coordinates: polys[0] }
      : { type: "MultiPolygon", coordinates: polys },
  });
}

// ── 2. Golan Heights → Syria ────────────────────────────────────────────────
// Vertices shared with Jordan and Lebanon are copied from the source rings so
// the rebuilt topology keeps the borders as shared arcs.
const GOLAN_WEST = [ // south → north
  [35.585, 32.690], [35.596, 32.723], [35.622, 32.748], [35.641, 32.780],
  [35.648, 32.820], [35.643, 32.860], [35.630, 32.888],                 // Sea of Galilee, east shore
  [35.633, 32.930], [35.625, 32.980], [35.617, 33.030], [35.613, 33.080],
  [35.622, 33.130], [35.637, 33.180], [35.650, 33.225],                 // upper Jordan River valley
];
function fixGolan(list) {
  const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-3 && Math.abs(p[1] - q[1]) < 1e-3;
  const idx = (ring, pt) => ring.findIndex(p => near(p, pt));
  const syria = list.find(f => f.id === "760");
  const israel = list.find(f => f.id === "376");
  const sRing = syria.geometry.coordinates[0];
  const iRing = israel.geometry.coordinates[0];
  const sA = idx(sRing, [35.7862, 32.7347]); // Yarmouk, tripoint with Jordan
  const sB = idx(sRing, [35.8690, 33.4326]); // Mt Hermon, tripoint with Lebanon
  const iA = idx(iRing, [35.7862, 32.7347]);
  const iC = idx(iRing, [35.5738, 32.6410]); // Yarmouk–Jordan confluence
  const iD = idx(iRing, [35.6278, 33.2746]); // Ghajar, tripoint with Lebanon
  const iB = idx(iRing, [35.8690, 33.4326]);
  if ([sA, sB, iA, iC, iD].some(i => i < 0) || !(sA < sB && iA < iC && iC < iD)) {
    throw new Error("Golan fix: source geometry changed, update the anchor points");
  }
  const yarmouk = iRing.slice(iA + 1, iC + 1);                   // shared with Jordan
  const hermon = iRing.slice(iD, iB > iD ? iB : iRing.length - 1); // shared with Lebanon
  sRing.splice(sA + 1, sB - sA - 1, ...yarmouk, ...GOLAN_WEST, ...hermon);
  const israelKeep = iRing.slice(iC, iD + 1);
  israel.geometry.coordinates[0] = [...israelKeep, ...[...GOLAN_WEST].reverse(), israelKeep[0]];
}
fixGolan(kept);

// ── 3. Topology + distance-weighted simplification ──────────────────────────
let topo = topojson.topology({ countries: { type: "FeatureCollection", features: kept } }, 1e5);
topo = topojson.presimplify(topo);
const falloff = ([x, y]) => {
  const dx = Math.max(0, CORE.x0 - x, x - CORE.x1);
  const dy = Math.max(0, CORE.y0 - y, y - CORE.y1);
  return 1 + (Math.hypot(dx, dy) / FALLOFF_DEG) ** 2;
};
for (const arc of topo.arcs) {
  for (const p of arc) if (isFinite(p[2])) p[2] /= falloff(p);
}
topo = topojson.simplify(topo, MIN_AREA);
// Drop islands too small to see, with the same distance falloff.
const pre = topo;
topo = topojson.filter(topo, (ring, interior) => {
  const coords = topojson.feature(pre, { type: "Polygon", arcs: [ring] }).geometry.coordinates[0];
  return topojson.planarRingArea(coords) >= MIN_AREA * 4 * falloff(coords[0]) || interior;
});
topo.arcs = topo.arcs.map(arc => arc.map(([x, y]) => [x, y]));
topo = topojson.quantize(topo, 1e5);
delete topo.bbox;

// ── 4. Write ────────────────────────────────────────────────────────────────
const vertices = topo.arcs.reduce((n, a) => n + a.length, 0);
const json = JSON.stringify(topo);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT,
  "/* Map data generated by tools/build-map.js from world-atlas (Natural Earth, public domain). */\n" +
  "window.WORLD_TOPO=" + json + ";\n");
console.log(`countries: ${kept.length}, arc vertices: ${vertices}, size: ${(json.length / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), OUT)}`);
