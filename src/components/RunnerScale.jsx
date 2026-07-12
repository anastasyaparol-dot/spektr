export default function RunnerScale() {
  return (
    <div className="runner-scale">
      <svg viewBox="0 0 60 580" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M32,15 C32,15 22,70 32,120 C42,170 22,210 30,265 C38,315 44,355 30,410 C18,455 38,495 30,565"
          fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"
        />
        <text x="27" y="19" textAnchor="end" fontSize="8" fill="currentColor" fontFamily="inherit">5 км</text>
        <text x="17" y="124" textAnchor="end" fontSize="8" fill="currentColor" fontFamily="inherit">10 км</text>
        <text x="25" y="224" textAnchor="end" fontSize="8" fill="currentColor" fontFamily="inherit">21 км</text>
        <text x="33" y="329" textAnchor="end" fontSize="8" fill="currentColor" fontFamily="inherit">42 км</text>
        <text x="17" y="434" textAnchor="end" fontSize="8" fill="currentColor" fontFamily="inherit">100 км</text>
        <text x="25" y="549" textAnchor="end" fontSize="10" fill="currentColor" fontFamily="inherit">∞</text>
      </svg>
    </div>
  )
}
