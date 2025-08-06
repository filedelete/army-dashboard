const dateTabs = document.getElementById('dateTabs');
const tabContents = document.getElementById('tabContents');
const themeToggle = document.getElementById('theme-toggle');
const dates = [];

function generateDates() {
  for (let d = 4; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    dates.push(date.toISOString().slice(0, 10));
  }
}

generateDates();

let charts = [];
let currentDate = null;
let currentData = {};

async function loadData(date) {
  // Имитация запроса - замени на fetch к реальному API
  await new Promise(res => setTimeout(res, 250));
  const times = ["18:00", "19:00", "20:00", "21:00", "22:00"];
  return times.map(t => ({
    time: t,
    sf_online: Math.floor(Math.random() * 5 + 5),
    ls_online: Math.floor(Math.random() * 5 + 5),
    sf_ammo: Math.floor(Math.random() * 10000 + 10000),
    fbi_ammo: Math.floor(Math.random() * 10000 + 10000),
    sfpd_ammo: Math.floor(Math.random() * 10000 + 10000),
    lvpd_sf_ammo: Math.floor(Math.random() * 10000 + 10000),
    lspd_ammo: Math.floor(Math.random() * 10000 + 10000),
    rcsd_ammo: Math.floor(Math.random() * 10000 + 10000),
    lvpd_ls_ammo: Math.floor(Math.random() * 10000 + 10000),
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

function getThemeColors() {
    const isDark = document.body.classList.contains('dark-theme');
    return {
        textColor: isDark ? '#E0E0E0' : '#333',
        gridColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
        tooltipBg: isDark ? '#424242' : '#ffffff',
        tooltipTitleColor: isDark ? '#90CAF9' : '#1976d2',
        tooltipBodyColor: isDark ? '#E0E0E0' : '#444'
    };
}

function createChart(ctx, label, dataKey, dataSet, color) {
  const themeColors = getThemeColors();
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, hexToRgba(color, 0.35));
  gradient.addColorStop(1, hexToRgba(color, 0));

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataSet.map(d => d.time),
      datasets: [{
        label,
        data: dataSet.map(d => d[dataKey]),
        borderColor: color,
        backgroundColor: gradient,
        tension: 0.45,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: themeColors.tooltipBg,
        pointBorderColor: color,
        pointBorderWidth: 2,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: themeColors.tooltipBg
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: themeColors.textColor,
            boxWidth: 14,
            padding: 15,
            font: {
              size: 14,
              family: 'Roboto',
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.tooltipTitleColor,
          bodyColor: themeColors.tooltipBodyColor,
          borderColor: color,
          borderWidth: 1,
          padding: 10,
          titleFont: { weight: '600' },
          bodyFont: { weight: '500' }
        }
      },
      scales: {
        x: {
          grid: { color: themeColors.gridColor },
          ticks: { color: themeColors.textColor, font: { family: 'Roboto' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: themeColors.gridColor },
          ticks: { color: themeColors.textColor, font: { family: 'Roboto' } }
        }
      },
      animations: {
        tension: {
          duration: 1000,
          easing: 'easeOutQuart',
          from: 0.2,
          to: 0.45,
          loop: false
        }
      }
    }
  });
}

function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function showTab(date) {
  // Уничтожаем старые графики перед созданием новых
  if (charts.length > 0) {
    charts.forEach(chart => chart.destroy());
    charts = [];
  }
  
  // Создаем DOM-элементы для графиков
  tabContents.innerHTML = '';
  const columnsWrapper = document.createElement('div');
  columnsWrapper.style.display = 'flex';
  columnsWrapper.style.flexWrap = 'wrap';
  columnsWrapper.style.gap = '24px';
  columnsWrapper.style.opacity = '0';
  columnsWrapper.style.transition = 'opacity 0.5s ease-in';
  
  const sfCol = document.createElement('div');
  sfCol.style.flex = '1';
  sfCol.style.minWidth = '300px';

  const lsCol = document.createElement('div');
  lsCol.style.flex = '1';
  lsCol.style.minWidth = '300px';

  const sfOnlineContainer = document.createElement('div');
  sfOnlineContainer.className = 'chart-container';
  sfOnlineContainer.innerHTML = `
    <h2>SF Army Онлайн</h2>
    <canvas id="sfOnlineChart"></canvas>`;
  sfCol.appendChild(sfOnlineContainer);

  const lsOnlineContainer = document.createElement('div');
  lsOnlineContainer.className = 'chart-container';
  lsOnlineContainer.innerHTML = `
    <h2>LS Army Онлайн</h2>
    <canvas id="lsOnlineChart"></canvas>`;
  lsCol.appendChild(lsOnlineContainer);

  const sfStorages = [
    { key: 'sf_ammo', name: 'SF Army', color: '#82ca9d' },
    { key: 'fbi_ammo', name: 'FBI', color: '#a0a0a0' },
    { key: 'sfpd_ammo', name: 'SFPD', color: '#ffc658' },
    { key: 'lvpd_sf_ammo', name: 'LVPD (SF)', color: '#8dd1e1' }
  ];

  sfStorages.forEach(store => {
    const div = document.createElement('div');
    div.className = 'chart-container';
    div.innerHTML = `<h2>Склад ${store.name}</h2><canvas id="chart-${store.key}"></canvas>`;
    sfCol.appendChild(div);
  });

  const lsStorages = [
    { key: 'lspd_ammo', name: 'LSPD', color: '#ff8042' },
    { key: 'rcsd_ammo', name: 'РКШД', color: '#00C49F' },
    { key: 'lvpd_ls_ammo', name: 'LVPD (LS)', color: '#888888' }
  ];

  lsStorages.forEach(store => {
    const div = document.createElement('div');
    div.className = 'chart-container';
    div.innerHTML = `<h2>Склад ${store.name}</h2><canvas id="chart-${store.key}"></canvas>`;
    lsCol.appendChild(div);
  });

  columnsWrapper.appendChild(sfCol);
  columnsWrapper.appendChild(lsCol);
  tabContents.appendChild(columnsWrapper);

  setActiveTab(date);
  currentData = await loadData(date);
  const dataSet = currentData;
  
  // Создаем графики после небольшой задержки, чтобы DOM обновился
  setTimeout(() => {
    const sfCtx = document.getElementById('sfOnlineChart')?.getContext('2d');
    if (sfCtx) charts.push(createChart(sfCtx, 'SF Army Онлайн', 'sf_online', dataSet, '#1976d2'));
    const lsCtx = document.getElementById('lsOnlineChart')?.getContext('2d');
    if (lsCtx) charts.push(createChart(lsCtx, 'LS Army Онлайн', 'ls_online', dataSet, '#ff6f61'));
    sfStorages.forEach(store => {
      const ctx = document.getElementById(`chart-${store.key}`)?.getContext('2d');
      if (ctx) charts.push(createChart(ctx, store.name, store.key, dataSet, store.color));
    });
    lsStorages.forEach(store => {
      const ctx = document.getElementById(`chart-${store.key}`)?.getContext('2d');
      if (ctx) charts.push(createChart(ctx, store.name, store.key, dataSet, store.color));
    });

    columnsWrapper.style.opacity = '1';
  }, 50); 
}


// Функция для обновления графиков при смене темы
function updateChartsTheme() {
    if (charts.length === 0) return;
    const themeColors = getThemeColors();
    charts.forEach(chart => {
        chart.options.plugins.legend.labels.color = themeColors.textColor;
        chart.options.scales.x.grid.color = themeColors.gridColor;
        chart.options.scales.x.ticks.color = themeColors.textColor;
        chart.options.scales.y.grid.color = themeColors.gridColor;
        chart.options.scales.y.ticks.color = themeColors.textColor;
        chart.options.plugins.tooltip.backgroundColor = themeColors.tooltipBg;
        chart.options.plugins.tooltip.titleColor = themeColors.tooltipTitleColor;
        chart.options.plugins.tooltip.bodyColor = themeColors.tooltipBodyColor;
        
        // Обновляем цвета точек
        chart.data.datasets.forEach(dataset => {
            dataset.pointBackgroundColor = themeColors.tooltipBg;
            dataset.pointHoverBorderColor = themeColors.tooltipBg;
        });

        chart.update();
    });
}

// --- Логика переключения темы ---
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateChartsTheme();
}

themeToggle.addEventListener('click', toggleTheme);

// Устанавливаем тему из localStorage при загрузке
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// --- Инициализация ---
createTabs();

const savedDate = localStorage.getItem('selectedDate');
if (savedDate && dates.includes(savedDate)) {
  showTab(savedDate);
} else {
  showTab(dates[0]);
}

setInterval(() => {
  if (currentDate) showTab(currentDate);
}, 60000);