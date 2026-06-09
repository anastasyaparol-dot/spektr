import { useState } from 'react'

// ── helpers ──────────────────────────────────────────────
function pad(n) { return String(Math.floor(Math.abs(n))).padStart(2, '0') }

function secsToHMS(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${h}:${pad(m)}:${pad(sec)}`
}

function secsToMMSS(s) {
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

function round2(n) { return Math.round(n * 100) / 100 }

// ── BACKYARD ULTRA ────────────────────────────────────────
const LOOP_KM = 6.706  // стандартная петля ~4.167 мили

function BackyardCalc() {
  const [laps, setLaps] = useState('')
  const [lapH, setLapH] = useState('')
  const [lapM, setLapM] = useState('55')
  const [lapS, setLapS] = useState('0')

  const lapSec = (parseInt(lapH)||0)*3600 + (parseInt(lapM)||0)*60 + (parseInt(lapS)||0)
  const lapsNum = parseInt(laps) || 0

  const totalKm   = lapsNum > 0 ? round2(lapsNum * LOOP_KM) : null
  const totalTime = lapsNum > 0 && lapSec > 0 ? secsToHMS(lapsNum * lapSec) : null
  const pacePerKm = lapSec > 0 ? secsToMMSS(lapSec / LOOP_KM) : null
  const speedKmh  = lapSec > 0 ? round2(LOOP_KM / lapSec * 3600) : null

  return (
    <div className="calc-section">
      <div className="calc-section-title">Backyard Ultra</div>
      <p className="calc-desc">Петля ≈ {LOOP_KM} км · Старт раз в час</p>

      <div className="calc-grid" style={{marginTop: 16}}>
        <div className="field">
          <label>Количество петель</label>
          <input type="number" min="1" placeholder="например, 10" value={laps} onChange={e => setLaps(e.target.value)} />
        </div>
        <div className="field" style={{gridColumn: '1 / -1'}}>
          <label>Время на петлю (цель)</label>
          <div style={{display:'flex', gap:8}}>
            <input type="number" min="0" max="0" placeholder="ч" value={lapH} onChange={e => setLapH(e.target.value)} style={{width:'100%'}} />
            <input type="number" min="0" max="59" placeholder="мин" value={lapM} onChange={e => setLapM(e.target.value)} style={{width:'100%'}} />
            <input type="number" min="0" max="59" placeholder="сек" value={lapS} onChange={e => setLapS(e.target.value)} style={{width:'100%'}} />
          </div>
        </div>
      </div>

      <div className="calc-result" style={{marginTop:12}}>
        <div className="result-row">
          <span className="result-label">Всего км</span>
          <span className="result-value result-value--sm">{totalKm ?? '—'}{totalKm && <span className="result-unit"> км</span>}</span>
        </div>
        <hr className="result-divider"/>
        <div className="result-row">
          <span className="result-label">Общее время</span>
          <span className="result-value result-value--sm">{totalTime ?? '—'}</span>
        </div>
        <hr className="result-divider"/>
        <div className="result-row">
          <span className="result-label">Темп</span>
          <span className="result-value result-value--sm">{pacePerKm ?? '—'}{pacePerKm && <span className="result-unit"> мин/км</span>}</span>
        </div>
        <hr className="result-divider"/>
        <div className="result-row">
          <span className="result-label">Скорость</span>
          <span className="result-value result-value--sm">{speedKmh ?? '—'}{speedKmh && <span className="result-unit"> км/ч</span>}</span>
        </div>
      </div>
    </div>
  )
}

// ── MAIN CALCULATOR ───────────────────────────────────────
// Режимы: что является исходным, а что считается
// Всегда показываем все 4 поля; пользователь заполняет любые 2 из (дистанция, время, темп/скорость)

export default function PaceCalculator() {
  const [distKm, setDistKm]   = useState('')
  const [timeH,  setTimeH]    = useState('')
  const [timeM,  setTimeM]    = useState('')
  const [timeS,  setTimeS]    = useState('')
  const [paceM,  setPaceM]    = useState('')
  const [paceS,  setPaceS]    = useState('')
  const [speed,  setSpeed]    = useState('')

  const dist    = parseFloat(distKm) || 0
  const timeSec = (parseInt(timeH)||0)*3600 + (parseInt(timeM)||0)*60 + (parseInt(timeS)||0)
  const paceSec = (parseInt(paceM)||0)*60 + (parseInt(paceS)||0)
  const spd     = parseFloat(speed) || 0

  // Вычисляем результаты по заполненным полям
  let resTime = null, resPace = null, resSpeed = null, resDist = null

  if (dist > 0 && timeSec > 0) {
    resDist  = dist
    resTime  = secsToHMS(timeSec)
    resPace  = secsToMMSS(timeSec / dist)
    resSpeed = round2(dist / timeSec * 3600)
  } else if (dist > 0 && paceSec > 0) {
    resDist  = dist
    resTime  = secsToHMS(paceSec * dist)
    resPace  = secsToMMSS(paceSec)
    resSpeed = round2(3600 / paceSec)
  } else if (dist > 0 && spd > 0) {
    resDist  = dist
    resTime  = secsToHMS(dist / spd * 3600)
    resPace  = secsToMMSS(3600 / spd)
    resSpeed = spd
  } else if (timeSec > 0 && paceSec > 0) {
    resDist  = round2(timeSec / paceSec)
    resTime  = secsToHMS(timeSec)
    resPace  = secsToMMSS(paceSec)
    resSpeed = round2(3600 / paceSec)
  } else if (timeSec > 0 && spd > 0) {
    resDist  = round2(timeSec / 3600 * spd)
    resTime  = secsToHMS(timeSec)
    resPace  = secsToMMSS(3600 / spd)
    resSpeed = spd
  }

  const hasResult = resTime !== null

  return (
    <div className="calculator">
      <div>
        <h2 className="calc-title">Калькулятор темпа</h2>
        <p className="calc-desc">Заполни любые два поля — остальное посчитается</p>
      </div>

      {/* ── INPUTS ── */}
      <div className="calc-section">
        <div className="calc-grid">

          {/* Дистанция */}
          <div className="field" style={{gridColumn: '1 / -1'}}>
            <label>Дистанция</label>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input type="number" min="0.1" step="0.1" placeholder="42.2" value={distKm} onChange={e => setDistKm(e.target.value)} />
              <span className="input-unit">км</span>
            </div>
          </div>

          {/* Время */}
          <div className="field" style={{gridColumn: '1 / -1'}}>
            <label>Время</label>
            <div style={{display:'flex', gap:8}}>
              <div style={{flex:1, display:'flex', flexDirection:'column', gap:4}}>
                <input type="number" min="0" placeholder="0" value={timeH} onChange={e => setTimeH(e.target.value)} />
                <span className="input-sublabel">ч</span>
              </div>
              <div style={{flex:1, display:'flex', flexDirection:'column', gap:4}}>
                <input type="number" min="0" max="59" placeholder="45" value={timeM} onChange={e => setTimeM(e.target.value)} />
                <span className="input-sublabel">мин</span>
              </div>
              <div style={{flex:1, display:'flex', flexDirection:'column', gap:4}}>
                <input type="number" min="0" max="59" placeholder="0" value={timeS} onChange={e => setTimeS(e.target.value)} />
                <span className="input-sublabel">сек</span>
              </div>
            </div>
          </div>

          {/* Темп */}
          <div className="field">
            <label>Темп</label>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input type="number" min="0" max="59" placeholder="5" value={paceM} onChange={e => setPaceM(e.target.value)} style={{width:'100%'}} />
              <span style={{color:'var(--text-muted)', fontSize:13, flexShrink:0}}>:</span>
              <input type="number" min="0" max="59" placeholder="30" value={paceS} onChange={e => setPaceS(e.target.value)} style={{width:'100%'}} />
              <span className="input-unit">мин/км</span>
            </div>
          </div>

          {/* Скорость */}
          <div className="field">
            <label>Скорость</label>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input type="number" min="0" step="0.1" placeholder="8.5" value={speed} onChange={e => setSpeed(e.target.value)} />
              <span className="input-unit">км/ч</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── RESULT ── */}
      <div className="calc-result">
        <div className="result-row">
          <span className="result-label">Дистанция</span>
          <span className="result-value">{hasResult ? resDist : '—'}{hasResult && <span className="result-unit"> км</span>}</span>
        </div>
        <hr className="result-divider"/>
        <div className="result-row">
          <span className="result-label">Время</span>
          <span className="result-value">{hasResult ? resTime : '—'}</span>
        </div>
        <hr className="result-divider"/>
        <div className="result-row">
          <span className="result-label">Темп</span>
          <span className="result-value">{hasResult ? resPace : '—'}{hasResult && <span className="result-unit"> мин/км</span>}</span>
        </div>
        <hr className="result-divider"/>
        <div className="result-row">
          <span className="result-label">Скорость</span>
          <span className="result-value">{hasResult ? resSpeed : '—'}{hasResult && <span className="result-unit"> км/ч</span>}</span>
        </div>
      </div>

      {/* ── BACKYARD ── */}
      <BackyardCalc />
    </div>
  )
}
