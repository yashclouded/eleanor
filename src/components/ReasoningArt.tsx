export function ReasoningArt() {
  return <div className="reasoning-art" aria-hidden="true">
    <span className="art-caption">THE PRACTICE OF PERSPECTIVE</span>
    <svg viewBox="0 0 440 440" fill="none" focusable="false">
      <g className="art-grid" stroke="currentColor" strokeWidth="0.6">
        <path d="M40 110h360M40 220h360M40 330h360M110 40v360M220 40v360M330 40v360" />
        <circle cx="220" cy="220" r="180" /><circle cx="220" cy="220" r="134" />
      </g>
      <g className="orbit-motion" stroke="currentColor" strokeWidth="1.2">
        <ellipse cx="220" cy="220" rx="165" ry="71" transform="rotate(-38 220 220)" />
        <ellipse cx="220" cy="220" rx="165" ry="71" transform="rotate(38 220 220)" />
        <ellipse cx="220" cy="220" rx="71" ry="165" />
        <circle cx="220" cy="220" r="71" />
        <path d="m220 122 98 98-98 98-98-98 98-98Z" />
      </g>
      <g fill="currentColor"><circle cx="220" cy="220" r="5" /><circle cx="330" cy="110" r="4" /><circle cx="110" cy="330" r="4" /></g>
      <path d="M209 40h22m-11-11v22M40 209v22m-11-11h22M389 220h22m-11-11v22" stroke="currentColor" />
    </svg>
    <div className="art-footnote"><span>01 — THINK</span><span>02 — REFLECT</span><span>03 — RETURN</span></div>
  </div>
}
