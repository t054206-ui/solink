/**
 * Reports' opening image: the system's record drawn as a technical sheet,
 * two more sheets stacked behind it.
 *
 * The drawing shows only what the records hold: a plan of the array with as
 * many modules as the system record lists (none drawn when the count is not
 * recorded), and a title block with the system's name and the page's own
 * counts of reports and complete months. No scale, no measurement, no figure
 * that is not already on the page.
 */
export function RecordSheet({ systemName, panelCount, reportCount, monthCount }: { systemName: string; panelCount: number | null; reportCount: number; monthCount: number }) {
  const n = panelCount ?? 0;
  const cols = n <= 8 ? Math.max(n, 1) : n <= 20 ? Math.ceil(n / 2) : Math.ceil(n / Math.ceil(n / 10));
  const rows = n === 0 ? 0 : Math.ceil(n / cols);
  // Plan area on the sheet, in viewBox units.
  const area = { x: 40, y: 62, w: 250, h: 150 };
  const cell = Math.min((area.w - 20) / cols, (area.h - 20) / Math.max(rows, 1) / 1.6);
  const pw = cell * 0.92, ph = cell * 1.5;
  const gridW = cols * cell, gridH = rows * cell * 1.62;
  const ox = area.x + (area.w - gridW) / 2, oy = area.y + (area.h - gridH) / 2;

  return (
    <svg viewBox="0 0 420 300" className="h-auto w-full" role="img" aria-label={`A drawing sheet for ${systemName}: a plan of ${panelCount ?? "an unrecorded number of"} panels and a title block listing ${reportCount} reports over ${monthCount} complete months.`}>
      {/* Stacked sheets behind. */}
      <rect x="44" y="30" width="340" height="250" rx="3" fill="var(--bg-inset)" stroke="var(--border)" transform="rotate(-3 214 155)" />
      <rect x="40" y="26" width="340" height="250" rx="3" fill="var(--bg-inset)" stroke="var(--border)" transform="rotate(2 210 151)" />
      <g filter="drop-shadow(0 6px 10px rgba(14,17,22,0.12))">
        <rect x="30" y="20" width="360" height="260" rx="3" fill="var(--bg-elevated)" stroke="var(--border-strong)" />
      </g>
      {/* Sheet frame and the plan's border. */}
      <rect x="38" y="28" width="344" height="244" fill="none" stroke="var(--border)" />
      <text x="46" y="46" fontSize="9" letterSpacing="1.4" fontFamily="var(--font-mono-jet), ui-monospace, monospace" fill="var(--fg-muted)">PLAN · ARRAY AS RECORDED</text>
      <rect x={area.x} y={area.y} width={area.w} height={area.h} fill="none" stroke="var(--border-strong)" strokeDasharray="4 3" />
      {n > 0 ? (
        Array.from({ length: n }, (_, i) => {
          const c = i % cols, r = Math.floor(i / cols);
          return (
            <g key={i}>
              <rect x={ox + c * cell + (cell - pw) / 2} y={oy + r * cell * 1.62} width={pw} height={ph} fill="#1b3657" stroke="#aab2bb" strokeWidth="0.8" />
              <line x1={ox + c * cell + cell / 2} x2={ox + c * cell + cell / 2} y1={oy + r * cell * 1.62} y2={oy + r * cell * 1.62 + ph} stroke="#0b1a2e" strokeWidth="0.5" />
            </g>
          );
        })
      ) : (
        <text x={area.x + area.w / 2} y={area.y + area.h / 2} textAnchor="middle" fontSize="10" fill="var(--fg-muted)">Panel count not recorded</text>
      )}
      {/* North mark. */}
      <g transform="translate(335 90)">
        <circle r="16" fill="none" stroke="var(--border-strong)" />
        <path d="M0 -13 L5 6 L0 2 L-5 6 Z" fill="var(--fg-secondary)" />
        <text y="-19" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--fg-secondary)">N</text>
      </g>
      {/* Title block. */}
      <g transform="translate(250 222)">
        <rect width="132" height="50" fill="none" stroke="var(--border-strong)" />
        <line x1="0" y1="16" x2="132" y2="16" stroke="var(--border)" />
        <text x="6" y="11" fontSize="7.5" letterSpacing="1.2" fontFamily="var(--font-mono-jet), ui-monospace, monospace" fill="var(--fg-muted)">SOLAR RECORD</text>
        <text x="6" y="30" fontSize="9.5" fontWeight="600" fill="var(--fg)">{systemName.length > 21 ? `${systemName.slice(0, 20)}…` : systemName}</text>
        <text x="6" y="43" fontSize="8.5" fontFamily="var(--font-mono-jet), ui-monospace, monospace" fill="var(--fg-secondary)">
          {reportCount} {reportCount === 1 ? "REPORT" : "REPORTS"} · {monthCount} {monthCount === 1 ? "MONTH" : "MONTHS"}
        </text>
      </g>
      <line x1="46" y1="232" x2="230" y2="232" stroke="var(--border)" />
      <line x1="46" y1="244" x2="200" y2="244" stroke="var(--border)" />
      <line x1="46" y1="256" x2="215" y2="256" stroke="var(--border)" />
    </svg>
  );
}
