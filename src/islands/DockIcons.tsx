// Chrome and Slack paths are from simple-icons (CC0); Slack left the set after v9, so this is the v9 path.
const CHROME = [
  "M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0z",
  "M1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29z",
  "M15.273 7.636a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364z",
];

const SLACK: [string, string][] = [
  [
    "#e01e5a",
    "M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z",
  ],
  [
    "#36c5f0",
    "M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z",
  ],
  [
    "#2eb67d",
    "M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z",
  ],
  [
    "#ecb22e",
    "M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z",
  ],
];

export function FinderIcon(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="finder-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5fcdfc" />
          <stop offset="1" stop-color="#1a86ef" />
        </linearGradient>
        <linearGradient id="finder-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f7fafd" />
          <stop offset="1" stop-color="#d6e3ef" />
        </linearGradient>
        <clipPath id="finder-clip">
          <rect x="5" y="5" width="90" height="90" rx="21" />
        </clipPath>
      </defs>
      <g clip-path="url(#finder-clip)">
        <rect x="5" y="5" width="90" height="90" fill="url(#finder-l)" />
        <path d="M55 5 C52 22 50 34 44 54 L53 57 C51 70 50 82 51 95 H95 V5 Z" fill="url(#finder-r)" />
      </g>
      <g stroke="#17293b" stroke-width="4.5" stroke-linecap="round" fill="none">
        <path d="M33 30 V42" />
        <path d="M70 30 V42" />
        <path d="M25 67 Q50 84 76 66" stroke-width="3.5" />
      </g>
    </svg>
  );
}

export function ChromeIcon(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="-2.4 -2.4 28.8 28.8" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path d={CHROME[0]} fill="#ea4335" />
      <path d={CHROME[1]} fill="#34a853" />
      <path d={CHROME[2]} fill="#fbbc04" />
      <circle cx="12" cy="12" r="4.364" fill="#1a73e8" />
    </svg>
  );
}

export function SlackIcon(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="5" y="5" width="90" height="90" rx="21" fill="#fff" />
      <g transform="translate(26 26) scale(2)">
        {SLACK.map(([fill, d]) => (
          <path d={d} fill={fill} />
        ))}
      </g>
    </svg>
  );
}
