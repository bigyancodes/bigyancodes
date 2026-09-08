import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const username = process.env.GITHUB_USER || process.argv[2] || "bigyancodes";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(
  process.env.OUTPUT_PATH || resolve(scriptDirectory, "../assets/commit-odyssey.svg"),
);

const response = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
  headers: { "user-agent": "commit-odyssey-profile-generator" },
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

const totalContributions = contributionDays.reduce((sum, day) => sum + day.count, 0);
const activeDays = contributionDays.filter((day) => day.count > 0).length;
const mostActive = contributionDays.reduce(
  (best, day) => (day.count > best.count ? day : best),
  contributionDays[0],
);

let longestStreak = 0;
let runningStreak = 0;
for (const day of contributionDays) {
  runningStreak = day.count > 0 ? runningStreak + 1 : 0;
  longestStreak = Math.max(longestStreak, runningStreak);
}

const palette = ["#13223A", "#173D5D", "#1D6A80", "#23B5A8", "#7CF7D4"];
const gridX = 56;
const gridY = 212;
const stepX = 16;
const stepY = 13;

const constellation = contributionDays
  .map((day) => {
    const x = gridX + day.week * stepX;
    const y = gridY + day.weekday * stepY;
    const delay = ((day.week * 0.07 + day.weekday * 0.11) % 4.8).toFixed(2);
    const glow = day.level > 2 ? ' filter="url(#nodeGlow)"' : "";
    const pulse = day.level > 0
      ? `<animate attributeName="opacity" values="0.55;1;0.55" dur="4.8s" begin="${delay}s" repeatCount="indefinite" />`
      : "";
    return `<rect x="${x}" y="${y}" width="8" height="8" rx="2" transform="rotate(45 ${x + 4} ${y + 4})" fill="${palette[day.level]}" opacity="${day.level > 0 ? "0.88" : "0.32"}"${glow}>${pulse}</rect>`;
  })
  .join("\n    ");

const flightPath = "M54 184 C170 78 294 86 374 168 S574 292 696 174 S834 70 914 128";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="340" viewBox="0 0 960 340" role="img" aria-labelledby="title description">
  <title id="title">${username}'s Commit Odyssey</title>
  <description id="description">An original animated space journey generated from ${totalContributions} GitHub contributions across the last year.</description>

  <defs>
    <linearGradient id="space" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050816" />
      <stop offset="0.52" stop-color="#0A1630" />
      <stop offset="1" stop-color="#071D27" />
    </linearGradient>
    <radialGradient id="planet" cx="38%" cy="30%" r="72%">
      <stop offset="0" stop-color="#90F7E8" />
      <stop offset="0.34" stop-color="#22C1B5" />
      <stop offset="0.72" stop-color="#12607A" />
      <stop offset="1" stop-color="#0A1D35" />
    </radialGradient>
    <linearGradient id="flight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#60A5FA" />
      <stop offset="0.48" stop-color="#A78BFA" />
      <stop offset="1" stop-color="#5EEAD4" />
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.11" />
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.025" />
    </linearGradient>
    <pattern id="stars" width="74" height="52" patternUnits="userSpaceOnUse">
      <circle cx="9" cy="12" r="0.8" fill="#FFFFFF" opacity="0.58" />
      <circle cx="46" cy="34" r="0.55" fill="#93C5FD" opacity="0.55" />
      <circle cx="66" cy="8" r="0.45" fill="#5EEAD4" opacity="0.45" />
    </pattern>
    <filter id="nodeGlow" x="-150%" y="-150%" width="400%" height="400%">
      <feGaussianBlur stdDeviation="2.7" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <clipPath id="frameClip"><rect width="960" height="340" rx="24" /></clipPath>
  </defs>

  <g clip-path="url(#frameClip)">
    <rect width="960" height="340" fill="url(#space)" />
    <rect width="960" height="340" fill="url(#stars)" opacity="0.72" />

    <ellipse cx="400" cy="82" rx="300" ry="110" fill="#4F46E5" opacity="0.075" filter="url(#softGlow)">
      <animate attributeName="opacity" values="0.04;0.11;0.04" dur="8s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="780" cy="242" rx="245" ry="100" fill="#14B8A6" opacity="0.07" filter="url(#softGlow)">
      <animate attributeName="opacity" values="0.09;0.035;0.09" dur="9s" repeatCount="indefinite" />
    </ellipse>

    <g font-family="Segoe UI, Inter, Arial, sans-serif">
      <text x="38" y="43" fill="#F8FAFC" font-size="21" font-weight="800" letter-spacing="3.4">COMMIT ODYSSEY</text>
      <text x="38" y="63" fill="#67E8F9" font-family="Consolas, monospace" font-size="10.5" letter-spacing="1.35">REAL ACTIVITY · ONE YEAR · ONE JOURNEY</text>
      <rect x="753" y="25" width="169" height="48" rx="12" fill="url(#glass)" stroke="#67E8F9" stroke-opacity="0.22" />
      <text x="774" y="49" fill="#F8FAFC" font-size="22" font-weight="800">${totalContributions}</text>
      <text x="774" y="64" fill="#94A3B8" font-family="Consolas, monospace" font-size="9.2" letter-spacing="1">COMMITS IN ORBIT</text>
      <circle cx="901" cy="49" r="5" fill="#5EEAD4" filter="url(#nodeGlow)">
        <animate attributeName="r" values="4;6.5;4" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </g>

    <g transform="translate(650 92)">
      <circle cx="0" cy="0" r="34" fill="url(#planet)" filter="url(#softGlow)" />
      <ellipse cx="0" cy="0" rx="51" ry="13" fill="none" stroke="#A78BFA" stroke-width="1.5" opacity="0.55" transform="rotate(-12)" />
      <circle cx="-27" cy="-14" r="2.8" fill="#F8FAFC">
        <animateTransform attributeName="transform" type="rotate" from="0 27 14" to="360 27 14" dur="6s" repeatCount="indefinite" />
      </circle>
    </g>

    <path d="${flightPath}" fill="none" stroke="#1E3A5F" stroke-width="8" opacity="0.48" />
    <path d="${flightPath}" fill="none" stroke="url(#flight)" stroke-width="2.2" stroke-linecap="round" pathLength="1" stroke-dasharray="0.12 0.035" filter="url(#nodeGlow)">
      <animate attributeName="stroke-dashoffset" values="1;0" dur="12s" repeatCount="indefinite" />
    </path>

    <g filter="url(#nodeGlow)">
      <path d="M-11 -5 L8 0 L-11 5 L-6 0 Z" fill="#F8FAFC" />
      <circle cx="-2" cy="0" r="2.2" fill="#60A5FA" />
      <path d="M-11 -2 L-22 0 L-11 2" fill="#5EEAD4">
        <animate attributeName="d" values="M-11 -2 L-18 0 L-11 2;M-11 -3 L-27 0 L-11 3;M-11 -2 L-18 0 L-11 2" dur="0.8s" repeatCount="indefinite" />
      </path>
      <animateMotion dur="12s" repeatCount="indefinite" path="${flightPath}" rotate="auto" />
    </g>

    <g opacity="0.9">
      ${constellation}
    </g>

    <rect x="48" y="203" width="864" height="102" rx="15" fill="none" stroke="#93C5FD" stroke-opacity="0.1" />
    <rect x="48" y="202" width="70" height="104" fill="url(#flight)" opacity="0.075">
      <animate attributeName="x" values="48;842;48" dur="9s" keyTimes="0;0.88;1" repeatCount="indefinite" />
    </rect>

    <g font-family="Consolas, monospace">
      <rect x="38" y="90" width="151" height="65" rx="12" fill="url(#glass)" stroke="#60A5FA" stroke-opacity="0.18" />
      <text x="55" y="112" fill="#64748B" font-size="9" letter-spacing="1.2">ACTIVE DAYS</text>
      <text x="55" y="141" fill="#F8FAFC" font-family="Segoe UI, Arial" font-size="24" font-weight="800">${activeDays}</text>

      <rect x="204" y="90" width="151" height="65" rx="12" fill="url(#glass)" stroke="#A78BFA" stroke-opacity="0.18" />
      <text x="221" y="112" fill="#64748B" font-size="9" letter-spacing="1.2">LONGEST STREAK</text>
      <text x="221" y="141" fill="#F8FAFC" font-family="Segoe UI, Arial" font-size="24" font-weight="800">${longestStreak}<tspan fill="#94A3B8" font-size="10"> DAYS</tspan></text>

      <rect x="370" y="90" width="182" height="65" rx="12" fill="url(#glass)" stroke="#5EEAD4" stroke-opacity="0.18" />
      <text x="387" y="112" fill="#64748B" font-size="9" letter-spacing="1.2">BEST MISSION DAY</text>
      <text x="387" y="141" fill="#F8FAFC" font-family="Segoe UI, Arial" font-size="21" font-weight="800">${mostActive.count}<tspan fill="#94A3B8" font-size="10"> CONTRIBUTIONS</tspan></text>

      <text x="56" y="326" fill="#64748B" font-size="9.5">${mostActive.date} · PEAK SIGNAL</text>
      <text x="904" y="326" fill="#5EEAD4" font-size="9.5" text-anchor="end" letter-spacing="1">EXPLORE → BUILD → COMMIT → LAUNCH</text>
    </g>
  </g>

  <rect x="0.75" y="0.75" width="958.5" height="338.5" rx="23.25" fill="none" stroke="#67E8F9" stroke-opacity="0.18" stroke-width="1.5" />
</svg>
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, svg, "utf8");
console.log(`Generated ${outputPath} from ${cells.length} contribution days`);
