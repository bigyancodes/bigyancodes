import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const username = process.env.GITHUB_USER || process.argv[2] || "bigyancodes";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(
  process.env.OUTPUT_PATH || resolve(scriptDirectory, "../assets/commit-catch.svg"),
);

const response = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
  headers: { "user-agent": "commit-catch-profile-generator" },
});

if (!response.ok) {
  throw new Error(`GitHub contribution request failed with ${response.status}`);
}

const html = await response.text();
const cellPattern = /<td\b([^>]*\bdata-date="[^"]+"[^>]*)><\/td>/g;
const cells = [];

for (const match of html.matchAll(cellPattern)) {
  const attributes = match[1];
  const date = attributes.match(/\bdata-date="([^"]+)"/)?.[1];
  const level = Number(attributes.match(/\bdata-level="(\d+)"/)?.[1] || 0);
  const followingMarkup = html.slice(
    (match.index || 0) + match[0].length,
    (match.index || 0) + match[0].length + 700,
  );
  const label = followingMarkup.match(/<tool-tip\b[^>]*>([^<]+)<\/tool-tip>/)?.[1] || "";
  const count = Number(label.match(/([\d,]+)\s+contribution/)?.[1]?.replaceAll(",", "") || 0);

  if (date) cells.push({ date, level, count });
}

if (cells.length === 0) {
  throw new Error("No contribution cells were found in GitHub's response");
}

cells.sort((a, b) => a.date.localeCompare(b.date));

const firstDate = new Date(`${cells[0].date}T00:00:00Z`);
firstDate.setUTCDate(firstDate.getUTCDate() - firstDate.getUTCDay());
const dayInMilliseconds = 86_400_000;

const contributionDays = cells.map((cell) => {
  const date = new Date(`${cell.date}T00:00:00Z`);
  const offset = Math.round((date - firstDate) / dayInMilliseconds);
  return { ...cell, week: Math.floor(offset / 7), weekday: date.getUTCDay() };
});

const width = 960;
const height = 300;
const gridX = 72;
const gridY = 144;
const cellSize = 10;
const gap = 4;
const step = cellSize + gap;
const colors = ["#102031", "#0E3A5D", "#115E78", "#0EA5A8", "#45E6CD"];
const totalContributions = contributionDays.reduce((sum, day) => sum + day.count, 0);
const mostActive = contributionDays.reduce(
  (best, day) => (day.count > best.count ? day : best),
  contributionDays[0],
);

const cellsMarkup = contributionDays
  .map((day) => {
    const x = gridX + day.week * step;
    const y = gridY + day.weekday * step;
    const begin = ((day.week * 0.08 + day.weekday * 0.03) % 5.2).toFixed(2);
    const pulse = day.level > 0
      ? `<animate attributeName="opacity" values="0.48;1;0.48" dur="5.2s" begin="${begin}s" repeatCount="indefinite" />`
      : "";
    return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${colors[day.level]}" opacity="${day.level > 0 ? "0.8" : "0.55"}">${pulse}</rect>`;
  })
  .join("\n    ");

const fishingPath = "M854 88 C908 112 900 158 846 179 C792 201 725 188 650 231";
const reverseFishingPath = "M650 231 C725 188 792 201 846 179 C900 158 908 112 854 88";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">${username}'s Commit Catch</title>
  <description id="description">An original animated fishing scene generated from ${totalContributions} GitHub contributions across the last year.</description>

  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070B14" />
      <stop offset="0.62" stop-color="#0A1930" />
      <stop offset="1" stop-color="#0B2940" />
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0C3652" stop-opacity="0.92" />
      <stop offset="1" stop-color="#07141F" stop-opacity="0.98" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#58A6FF" />
      <stop offset="1" stop-color="#2DD4BF" />
    </linearGradient>
    <linearGradient id="boat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F0F6FC" />
      <stop offset="1" stop-color="#8B949E" />
    </linearGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <pattern id="stars" width="64" height="42" patternUnits="userSpaceOnUse">
      <circle cx="9" cy="11" r="0.8" fill="#F0F6FC" opacity="0.32" />
      <circle cx="46" cy="30" r="0.6" fill="#58A6FF" opacity="0.35" />
    </pattern>
  </defs>

  <rect width="${width}" height="${height}" rx="22" fill="url(#sky)" />
  <rect width="${width}" height="118" rx="22" fill="url(#stars)" />

  <g font-family="Segoe UI, Inter, Arial, sans-serif">
    <text x="38" y="42" fill="#F0F6FC" font-size="20" font-weight="800" letter-spacing="3.2">COMMIT CATCH</text>
    <text x="38" y="61" fill="#58A6FF" font-family="Consolas, monospace" font-size="10.5" letter-spacing="1.2">// AN ORIGINAL GITHUB ACTIVITY STORY</text>
    <text x="922" y="42" fill="#F0F6FC" font-size="24" font-weight="800" text-anchor="end">${totalContributions}</text>
    <text x="922" y="60" fill="#8B949E" font-family="Consolas, monospace" font-size="10" text-anchor="end" letter-spacing="1">CONTRIBUTIONS LANDED</text>
  </g>

  <circle cx="603" cy="54" r="20" fill="#58A6FF" opacity="0.11" filter="url(#glow)">
    <animate attributeName="opacity" values="0.07;0.16;0.07" dur="5s" repeatCount="indefinite" />
  </circle>

  <path d="M0 104 Q70 94 140 104 T280 104 T420 104 T560 104 T700 104 T840 104 T980 104 V300 H0 Z" fill="url(#water)" />
  <path d="M-80 108 Q-30 99 20 108 T120 108 T220 108 T320 108 T420 108 T520 108 T620 108 T720 108 T820 108 T920 108 T1020 108" fill="none" stroke="#58A6FF" stroke-width="2" opacity="0.42">
    <animateTransform attributeName="transform" type="translate" values="0 0;100 0" dur="7s" repeatCount="indefinite" />
  </path>
  <path d="M-120 119 Q-75 112 -30 119 T60 119 T150 119 T240 119 T330 119 T420 119 T510 119 T600 119 T690 119 T780 119 T870 119 T960 119 T1050 119" fill="none" stroke="#2DD4BF" stroke-width="1.4" opacity="0.25">
    <animateTransform attributeName="transform" type="translate" values="100 0;0 0" dur="9s" repeatCount="indefinite" />
  </path>

  <g opacity="0.82">
    ${cellsMarkup}
  </g>

  <g>
    <animateTransform attributeName="transform" type="translate" values="0 0;0 3;0 0" dur="3.6s" repeatCount="indefinite" />
    <path d="M731 92 H862 L838 113 H758 Q742 106 731 92 Z" fill="url(#boat)" />
    <path d="M745 99 H850" stroke="#0D1117" stroke-width="3" opacity="0.75" />
    <path d="M758 113 Q798 122 838 113" fill="none" stroke="#2DD4BF" stroke-width="2" opacity="0.6" />

    <circle cx="794" cy="61" r="8" fill="#F0F6FC" />
    <path d="M790 69 L785 89 M791 72 L811 80 M786 88 L773 96 M786 88 L801 96" fill="none" stroke="#F0F6FC" stroke-width="4" stroke-linecap="round" />
    <path d="M786 54 Q795 47 803 55" fill="#58A6FF" />

    <g>
      <animateTransform attributeName="transform" type="rotate" values="0 811 80;-7 811 80;0 811 80" keyTimes="0;0.46;1" dur="10s" repeatCount="indefinite" />
      <path d="M810 80 Q833 63 854 88" fill="none" stroke="#C9D1D9" stroke-width="3" stroke-linecap="round" />
      <circle cx="810" cy="80" r="3" fill="#2DD4BF" />
    </g>
  </g>

  <path d="${fishingPath}" fill="none" stroke="url(#accent)" stroke-width="1.7" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" filter="url(#glow)">
    <animate attributeName="stroke-dashoffset" values="1;0;0;1" keyTimes="0;0.45;0.64;1" dur="10s" repeatCount="indefinite" />
    <animate attributeName="opacity" values="0.25;0.9;0.9;0.2" keyTimes="0;0.45;0.64;1" dur="10s" repeatCount="indefinite" />
  </path>

  <g filter="url(#glow)">
    <circle r="3.3" fill="#F0F6FC" />
    <path d="M0 3 Q1 12 8 9" fill="none" stroke="#F0F6FC" stroke-width="1.7" stroke-linecap="round" />
    <animateMotion dur="10s" repeatCount="indefinite" path="${fishingPath}" keyPoints="0;1;1;0" keyTimes="0;0.45;0.64;1" calcMode="linear" />
  </g>

  <g opacity="0">
    <rect x="-6" y="-6" width="12" height="12" rx="3" fill="#45E6CD" stroke="#F0F6FC" stroke-width="1.5" filter="url(#glow)" />
    <animateMotion dur="10s" repeatCount="indefinite" path="${reverseFishingPath}" keyPoints="0;0;1;1" keyTimes="0;0.55;0.9;1" calcMode="linear" />
    <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.53;0.57;0.91;1" dur="10s" repeatCount="indefinite" />
  </g>

  <g fill="url(#accent)" opacity="0.72" transform="translate(-90 0)">
    <path d="M0 218 C19 202 45 202 63 218 C45 234 19 234 0 218 Z" />
    <path d="M2 218 L-17 204 V232 Z" />
    <circle cx="48" cy="214" r="2.5" fill="#07141F" />
    <path d="M23 211 L16 218 L23 225 M36 211 L43 218 L36 225" fill="none" stroke="#07141F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    <animateTransform attributeName="transform" type="translate" values="-90 0;1040 0" dur="16s" repeatCount="indefinite" />
  </g>

  <g fill="#58A6FF" opacity="0.42">
    <circle cx="580" cy="247" r="2"><animate attributeName="cy" values="247;129" dur="5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;0.7;0" dur="5s" repeatCount="indefinite" /></circle>
    <circle cx="600" cy="266" r="3"><animate attributeName="cy" values="266;126" dur="6.2s" begin="1s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;0.55;0" dur="6.2s" begin="1s" repeatCount="indefinite" /></circle>
    <circle cx="623" cy="238" r="1.6"><animate attributeName="cy" values="238;132" dur="4.4s" begin="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;0.8;0" dur="4.4s" begin="2s" repeatCount="indefinite" /></circle>
  </g>

  <path d="M38 273 H922" stroke="#2A4A60" stroke-width="1" opacity="0.7" />
  <text x="38" y="289" fill="#8B949E" font-family="Consolas, monospace" font-size="9.5">BEST CATCH: ${mostActive.count} CONTRIBUTION${mostActive.count === 1 ? "" : "S"} · ${mostActive.date}</text>
  <text x="922" y="289" fill="#2DD4BF" font-family="Consolas, monospace" font-size="9.5" text-anchor="end" letter-spacing="1">CAST → CODE → CATCH → SHIP</text>
</svg>
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, svg, "utf8");
console.log(`Generated ${outputPath} from ${cells.length} contribution days`);

