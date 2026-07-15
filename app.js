const state = { data: null, date: null, days: 14, week: null, trafficChange: 20, parkingShare: 12 };
const fmt = new Intl.NumberFormat('sl-SI');
const dateFmt = new Intl.DateTimeFormat('sl-SI', { day:'2-digit', month:'2-digit', year:'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('sl-SI', { day:'2-digit', month:'2-digit' });

fetch('data/data.json')
  .then(r => { if (!r.ok) throw new Error('Podatkov ni bilo mogoče naložiti.'); return r.json(); })
  .then(data => { state.data = data; initialize(); })
  .catch(err => { document.querySelector('main').innerHTML = `<div class="error"><strong>Napaka:</strong> ${err.message}<br>Za lokalni ogled aplikacijo zaženi prek spletnega strežnika, ne neposredno z dvoklikom na index.html.</div>`; });

function initialize() {
  const dates = [...new Set(state.data.traffic.map(x => x.date))].sort();
  state.date = dates[dates.length - 1];
  const weeks = [...new Set(state.data.parking.map(x => x.week))].sort();
  state.week = weeks[weeks.length - 1];

  const dateSelect = document.getElementById('dateSelect');
  dates.slice().reverse().forEach(d => dateSelect.add(new Option(dateFmt.format(new Date(d+'T12:00:00')), d)));
  dateSelect.value = state.date;
  dateSelect.addEventListener('change', e => { state.date = e.target.value; renderAll(); });

  const weekSelect = document.getElementById('weekSelect');
  weeks.slice().reverse().forEach(w => weekSelect.add(new Option(`Teden od ${dateFmt.format(new Date(w+'T12:00:00'))}`, w)));
  weekSelect.value = state.week;
  weekSelect.addEventListener('change', e => { state.week = e.target.value; renderParking(); renderSimulation(); });

  document.querySelectorAll('.seg').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.days = btn.dataset.range === 'all' ? 'all' : Number(btn.dataset.range);
    renderTrafficChart();
  }));

  const trafficSlider = document.getElementById('trafficSlider');
  const parkingSlider = document.getElementById('parkingSlider');
  trafficSlider.addEventListener('input', e => { state.trafficChange = Number(e.target.value); renderSimulation(); });
  parkingSlider.addEventListener('input', e => { state.parkingShare = Number(e.target.value); renderSimulation(); });
  document.getElementById('resetSim').addEventListener('click', () => {
    state.trafficChange = 20; state.parkingShare = 12;
    trafficSlider.value = 20; parkingSlider.value = 12;
    renderSimulation();
  });

  document.getElementById('dataRange').textContent = `Promet: ${dateFmt.format(new Date(state.data.meta.trafficRange.from+'T12:00:00'))}–${dateFmt.format(new Date(state.data.meta.trafficRange.to+'T12:00:00'))}`;
  renderAll();
}

function dailyData(date=state.date) { return state.data.traffic.filter(x => x.date === date); }
function dailyTotal(date=state.date) { return dailyData(date).reduce((s,x)=>s+x.count,0); }
function totalByType(rows) { return rows.reduce((acc,x)=>{ acc[x.vehicleType]=(acc[x.vehicleType]||0)+x.count; return acc; },{}); }

function renderAll() { renderKPIs(); renderTrafficChart(); renderBreakdown(); renderSpeeds(); renderParking(); renderSimulation(); }

function renderKPIs() {
  const rows = dailyData();
  const total = rows.reduce((s,x)=>s+x.count,0);
  const allDates = [...new Set(state.data.traffic.map(x=>x.date))].sort();
  const avg = allDates.reduce((s,d)=>s+dailyTotal(d),0)/allDates.length;
  const types = totalByType(rows);
  const top = Object.entries(types).sort((a,b)=>b[1]-a[1])[0] || ['—',0];
  const weightedSpeed = state.data.speeds.reduce((s,x)=>s+x.speed,0)/state.data.speeds.length;
  const delta = avg ? ((total-avg)/avg*100) : 0;
  const cards = [
    ['Vozil na izbrani dan', fmt.format(total), `${delta>=0?'+':''}${delta.toFixed(1).replace('.',',')} % glede na dnevno povprečje`],
    ['Najpogostejša vrsta', top[0], `${fmt.format(top[1])} vozil`],
    ['Povprečna hitrost', `${weightedSpeed.toFixed(1).replace('.',',')} km/h`, `${(50-weightedSpeed).toFixed(1).replace('.',',')} km/h pod omejitvijo`],
    ['Zasedenost parkirišč', `${averageParking().toFixed(0)} %`, `povprečje ${parkingRows().length} parkirišč`]
  ];
  document.getElementById('kpis').innerHTML = cards.map(c=>`<article class="kpi"><div class="kpi-label">${c[0]}</div><div class="kpi-value">${c[1]}</div><div class="kpi-sub">${c[2]}</div></article>`).join('');
}

function renderTrafficChart() {
  const totals = Object.entries(totalByDate()).sort((a,b)=>a[0].localeCompare(b[0]));
  const rows = state.days === 'all' ? totals : totals.slice(-state.days);
  const el = document.getElementById('trafficChart');
  if (!rows.length) return;
  const w=900,h=300,p={l:54,r:18,t:18,b:42};
  const max=Math.max(...rows.map(x=>x[1]))*1.08;
  const x=i=>p.l+(i/(Math.max(rows.length-1,1)))*(w-p.l-p.r);
  const y=v=>p.t+(1-v/max)*(h-p.t-p.b);
  const points=rows.map((r,i)=>`${x(i)},${y(r[1])}`).join(' ');
  const area=`${p.l},${h-p.b} ${points} ${x(rows.length-1)},${h-p.b}`;
  let grid='';
  for(let i=0;i<=4;i++){ const val=max*i/4; const yy=y(val); grid+=`<line class="grid-line" x1="${p.l}" y1="${yy}" x2="${w-p.r}" y2="${yy}"/><text class="axis-label" x="${p.l-8}" y="${yy+4}" text-anchor="end">${Math.round(val/1000)}k</text>`; }
  const labels=rows.map((r,i)=>({r,i})).filter((_,idx)=>idx%Math.ceil(rows.length/6)===0 || idx===rows.length-1).map(o=>`<text class="axis-label" x="${x(o.i)}" y="${h-15}" text-anchor="middle">${shortDateFmt.format(new Date(o.r[0]+'T12:00:00'))}</text>`).join('');
  const dots=rows.map((r,i)=>`<circle class="chart-point" cx="${x(i)}" cy="${y(r[1])}" r="${r[0]===state.date?5:2.8}"><title>${dateFmt.format(new Date(r[0]+'T12:00:00'))}: ${fmt.format(r[1])} vozil</title></circle>`).join('');
  el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img"><polygon class="chart-area" points="${area}"/>${grid}<polyline class="chart-line" points="${points}"/>${dots}${labels}</svg>`;
  const peak=rows.slice().sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('trafficLegend').textContent=`Največ v prikazanem obdobju: ${fmt.format(peak[1])} vozil (${dateFmt.format(new Date(peak[0]+'T12:00:00'))}).`;
}
function totalByDate(){ return state.data.traffic.reduce((acc,x)=>{acc[x.date]=(acc[x.date]||0)+x.count;return acc;},{}); }

function renderBreakdown() {
  const map=totalByType(dailyData()); const total=Object.values(map).reduce((s,v)=>s+v,0);
  const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  document.getElementById('vehicleBreakdown').innerHTML=rows.map(([name,val])=>{
    const pct=total?val/total*100:0;
    return `<div class="breakdown-row"><div class="breakdown-head"><span>${name}</span><strong>${pct.toFixed(1).replace('.',',')} %</strong></div><div class="progress"><span style="width:${pct}%"></span></div><div class="kpi-sub">${fmt.format(val)} vozil</div></div>`;
  }).join('');
}

function renderSpeeds() {
  document.getElementById('speedChart').innerHTML=state.data.speeds.slice().sort((a,b)=>b.speed-a.speed).map(x=>{
    const pct=Math.min(x.speed/50*100,100); const cls=x.speed>=45?'near':'';
    return `<div class="speed-row"><span>${x.vehicleType}</span><div class="speed-track"><div class="speed-fill ${cls}" style="width:${pct}%"></div></div><span class="speed-value">${x.speed} km/h</span></div>`;
  }).join('');
}
function parkingRows(){ return state.data.parking.filter(x=>x.week===state.week); }
function averageParking(){ const rows=parkingRows(); return rows.length?rows.reduce((s,x)=>s+x.occupancy,0)/rows.length:0; }
function parkingClass(v){ return v>=90?'full':v>=75?'high':v>=50?'medium':'low'; }
function renderParking(){
  document.getElementById('parkingList').innerHTML=parkingRows().slice().sort((a,b)=>b.occupancy-a.occupancy).map(x=>`<div class="parking-row"><div class="parking-head"><span>${x.parking}</span><strong>${x.occupancy.toFixed(0)} %</strong></div><div class="progress"><span class="parking-fill ${parkingClass(x.occupancy)}" style="width:${x.occupancy}%"></span></div></div>`).join('');
}

function renderSimulation(){
  document.getElementById('trafficIncrease').textContent=`${state.trafficChange>=0?'+':''}${state.trafficChange} %`;
  document.getElementById('parkingShare').textContent=`${state.parkingShare} %`;
  const base=dailyTotal(); const multiplier=1+state.trafficChange/100; const projected=Math.max(0,Math.round(base*multiplier));
  const extra=projected-base;
  const parkingDemand=Math.max(0,Math.round(extra*state.parkingShare/100));
  const avgOcc=averageParking();
  // Without capacities, use bounded scenario score, not fake occupancy calculation.
  const pressure=Math.max(0,Math.min(100,avgOcc+(state.trafficChange*state.parkingShare/100)*0.9));
  const level=pressure>=90?'kritična':pressure>=75?'visoka':pressure>=55?'povišana':'zmerna';
  const speedBase=state.data.speeds.reduce((s,x)=>s+x.speed,0)/state.data.speeds.length;
  const projectedSpeed=Math.max(12,speedBase-(Math.max(state.trafficChange,0)*0.11));
  const results=[
    ['Ocenjeno vozil',fmt.format(projected)],
    ['Razlika',`${extra>=0?'+':''}${fmt.format(extra)}`],
    ['Dodatno iskanje parkirišča',`${fmt.format(parkingDemand)} vozil`],
    ['Pritisk na parkirišča',`${level} (${pressure.toFixed(0)} / 100)`],
    ['Scenarijska hitrost',`${projectedSpeed.toFixed(1).replace('.',',')} km/h`],
    ['Izhodišče',dateFmt.format(new Date(state.date+'T12:00:00'))]
  ];
  document.getElementById('simResults').innerHTML=results.map(x=>`<div class="sim-result"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  renderCars(projected,projectedSpeed);
}
function renderCars(projected,speed){
  const layer=document.getElementById('carsLayer'); const count=Math.max(4,Math.min(28,Math.round(projected/700)));
  const duration=Math.max(5,18-(speed/4));
  layer.innerHTML=Array.from({length:count},(_,i)=>`<div class="car" style="top:${i%2===0?27:76}px; left:${-(i*75)}px; animation-duration:${(duration+(i%5)*.4).toFixed(1)}s; animation-delay:${(-i*.8).toFixed(1)}s; transform:${i%2?'rotate(180deg)':''}"></div>`).join('');
}
