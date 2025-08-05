const dateTabs = document.getElementById('dateTabs');
const tabContents = document.getElementById('tabContents');
const dates = [];

function generateDates() {
  for(let d=4; d>=0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    dates.push(date.toISOString().slice(0,10));
  }
}

generateDates();

let charts = [];
let currentDate = null;
let currentData = {};

async function loadData(date) {
  // Имитация запроса - замени на fetch к реальному API
  await new Promise(res => setTimeout(res, 250));
  const times = ["17:00", "19:00", "20:00", "21:00"];
  return times.map(t => ({
    time: t,
    sf_online: Math.floor(Math.random()*5 + 5),
    ls_online: Math.floor(Math.random()*5 + 5),
    sf_ammo: Math.floor(Math.random()*10000 + 10000),
    fbi_ammo: Math.floor(Math.random()*10000 + 10000),
    sfpd_ammo: Math.floor(Math.random()*10000 + 10000),
    lvpd_sf_ammo: Math.floor(Math.random()*10000 + 10000),
    lspd_ammo: Math.floor(Math.random()*10000 + 10000),
    rcsd_ammo: Math.floor(Math.random()*10000 + 10000),
    lvpd_ls_ammo: Math.floor(Math.random()*10000 + 10000),
  }));
}

function createTabs() {
  dateTabs.innerHTML = '';
  dates.forEach(date => {
    const btn = document.createElement('button');
    btn.textContent = date;
    btn.className = 'tab-button';
    btn.onclick = async () => {
      setActiveTab(date);
      await showTab(date);
    };
    dateTabs.appendChild(btn);
  });
}

function setActiveTab(date) {
  currentDate = date;
  localStorage.setItem('selectedDate', date);
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === date);
  });
}

function createChart(ctx, label, dataKey, dataSet, color) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataSet.map(d => d.time),
      datasets: [{
        label,
        data: dataSet.map(d => d[dataKey]),
        borderColor: color,
        backgroundColor: 'transparent',
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { labels: { color: '#e0e0e0' } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { beginAtZero: true, ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      }
    }
  });
}

async function showTab(date) {
  tabContents.innerHTML = '';
  if(currentDate !== date) setActiveTab(date);

  currentData = await loadData(date);

  const dataSet = currentData;

  const onlineDiv = document.createElement('div');
  onlineDiv.className = 'chart-container';
  onlineDiv.innerHTML = `<h2>Онлайн (SF и LS)</h2><canvas id="onlineChart"></canvas>`;
  tabContents.appendChild(onlineDiv);

  const sfStorages = [
    { key: 'sf_ammo', name: 'SF Army', color: '#82ca9d' },
    { key: 'fbi_ammo', name: 'FBI', color: '#a0a0a0' },
    { key: 'sfpd_ammo', name: 'SFPD', color: '#ffc658' },
    { key: 'lvpd_sf_ammo', name: 'LVPD (SF)', color: '#8dd1e1' }
  ];

  const lsStorages = [
    { key: 'lspd_ammo', name: 'LSPD', color: '#ff8042' },
    { key: 'rcsd_ammo', name: 'РКШД', color: '#00C49F' },
    { key: 'lvpd_ls_ammo', name: 'LVPD (LS)', color: '#888888' }
  ];

  sfStorages.forEach(store => {
    const div = document.createElement('div');
    div.className = 'chart-container';
    div.innerHTML = `<h2>Склад ${store.name}</h2><canvas id="chart-${store.key}"></canvas>`;
    tabContents.appendChild(div);
  });

  lsStorages.forEach(store => {
    const div = document.createElement('div');
    div.className = 'chart-container';
    div.innerHTML = `<h2>Склад ${store.name}</h2><canvas id="chart-${store.key}"></canvas>`;
    tabContents.appendChild(div);
  });

  charts.forEach(c => c.destroy());
  charts = [];

  // Онлайн
  const onlineCtx = document.getElementById('onlineChart').getContext('2d');
  charts.push(new Chart(onlineCtx, {
    type: 'line',
    data: {
      labels: dataSet.map(d => d.time),
      datasets: [
        {
          label: 'SF Army Онлайн',
          data: dataSet.map(d => d.sf_online),
          borderColor: '#8884d8',
          backgroundColor: 'transparent',
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'LS Army Онлайн',
          data: dataSet.map(d => d.ls_online),
          borderColor: '#ff7300',
          backgroundColor: 'transparent',
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { labels: {color: '#e0e0e0'} }, tooltip: {mode: 'index', intersect: false} },
      scales: {
        x: { ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { beginAtZero: true, ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  }));

  // Склады SF
  sfStorages.forEach(store => {
    const ctx = document.getElementById(`chart-${store.key}`).getContext('2d');
    charts.push(createChart(ctx, store.name, store.key, dataSet, store.color));
  });

  // Склады LS
  lsStorages.forEach(store => {
    const ctx = document.getElementById(`chart-${store.key}`).getContext('2d');
    charts.push(createChart(ctx, store.name, store.key, dataSet, store.color));
  });
}

createTabs();

const savedDate = localStorage.getItem('selectedDate');
if(savedDate && dates.includes(savedDate)) {
  showTab(savedDate);
  setActiveTab(savedDate);
} else {
  showTab(dates[0]);
  setActiveTab(dates[0]);
}

setInterval(() => {
  if(currentDate) showTab(currentDate);
}, 60000);

