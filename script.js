// Элементы UI
const themeToggle = document.getElementById('theme-toggle');
const wrapper = document.getElementById('charts-wrapper');
const spinner = document.getElementById('loading-spinner');
const toastContainer = document.getElementById('toast-container');

const fractionData = new Map();
const fractionOrder = [];
const colorPalette = ['#42a5f5', '#e1b557', '#ffa726', '#ab47bc', '#9757e1', '#26c6da', '#8d6e63', '#d4e157'];

const texts = {
  themeToggle: 'Переключить тему',
  bankLabel: 'Банк $',
  ammoLabel: 'Боеприпасы',
  ammoLossLabel: '⬇ -{count} боеприпасов',
  ammoGainLabel: '⬆ +{count} боеприпасов',
  fractionNames: {
    7: "Армия SF",
    8: "Армия SF (доп.)",
    10: "ФБР",
    11: "SFPD",
    12: "LVPD",
    13: "LSPD",
    14: "РКШД",
  },
  notifAmmoUp: (f, c) => `${f}: боеприпасы увеличились на +${c}`,
  notifAmmoDown: (f, c) => `${f}: боеприпасы уменьшились на -${c}`,
  notifBankUp: (f, c) => `${f}: банк увеличился на +${c}`,
  notifBankDown: (f, c) => `${f}: банк уменьшился на -${c}`,
};

const translate = key => texts[key];
const getFractionName = id => texts.fractionNames[id] || `Фракция ${id}`;
const hexToRgba = (hex, alpha) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5), 16)}, ${alpha})`;

const getThemeColors = () => {
  const dark = document.body.classList.contains('dark-theme');
  return {
    textColor: dark ? '#E0E0E0' : '#333',
    gridColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    tooltipBg: dark ? '#424242' : '#fff',
    tooltipTitleColor: dark ? '#90CAF9' : '#1976d2',
    tooltipBodyColor: dark ? '#E0E0E0' : '#444'
  };
};

Chart.register({
  id: 'pulsePlugin',
  afterDraw(chart) {
    const { ctx, data } = chart;
    if (!data.datasets[0].pointPulse) return;
    chart.getDatasetMeta(0).data.forEach((point, i) => {
      if (!data.datasets[0].pointPulse[i]) return;
      const time = Date.now() / 1000;
      const scale = 1 + 0.3 * Math.sin(time * 6 + i);
      ctx.save();
      ctx.beginPath();
      ctx.arc(point.x, point.y, (point.radius || 6) * scale, 0, 2 * Math.PI);
      ctx.strokeStyle = data.datasets[0].pointBackgroundColor[i];
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.restore();
    });
  }
});

const getChartOptions = () => {
  const t = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.tooltipBg,
        titleColor: t.tooltipTitleColor,
        bodyColor: t.tooltipBodyColor,
        cornerRadius: 6,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: ctx => `${texts.ammoLabel}: ${ctx.raw.toLocaleString()} ${ctx.dataset.pointLabel?.[ctx.dataIndex] || ''}`
        }
      },
      pulsePlugin: true
    },
    scales: {
      x: { ticks: { color: t.textColor }, grid: { color: t.gridColor } },
      y: { beginAtZero: true, ticks: { color: t.textColor }, grid: { color: t.gridColor } }
    }
  };
};

async function loadData() {
  try {
    const res = await fetch("https://yrn-api.arzmesa.ru/method/arizona.getFractionSklads?server=7", {
      headers: { Authorization: "Bearer yrn1.eyPk_OafC7hsmFYs64kdFVlIrfMJF7FCTZG2b07mQlNjAU53-zyyYcAHKt9G9PY82pEUqUNmGG2uNVE4iseBpwh8QMcKgTGH453D9jGxNoPDJ_g9n5x5iaUYefifMYK5SyYfTV66ipVSSoXQSRlBLrH8Y3e77Aon9qOSFI8llgKU_MezjRsgTzFRP1KWfF-PLxVZMxv6I_" }
    });
    const { response: { items } } = await res.json();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return items.map(({ fraction, bank, ammo }) => ({
      id: fraction,
      name: getFractionName(fraction),
      time,
      bank,
      ammo
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

function createChartBlock(id, name, bank, colorIndex) {
  const container = document.createElement('div');
  container.className = 'chart-container';
  container.innerHTML = `
    <div class="fraction-header">
      <h2>${name}</h2>
      <div class="bank-text">${texts.bankLabel}: ${bank.toLocaleString()}</div>
      <div class="ammo-text"></div>
    </div>
    <canvas></canvas>
  `;
  wrapper.appendChild(container);
  const table = document.createElement('table');
table.className = 'change-table';
table.innerHTML = `
  <thead>
    <tr><th>Время</th><th>Изменение</th><th>Количество патронов</th></tr>
  </thead>
  <tbody></tbody>
`;
container.appendChild(table);

  const ctx = container.querySelector('canvas').getContext('2d');
  const color = colorPalette[colorIndex % colorPalette.length];
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: texts.ammoLabel,
        data: [],
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.3),
        fill: true,
        tension: 0.3,
        pointRadius: [],
        pointBackgroundColor: [],
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBorderColor: '#fff',
        pointLabel: [],
        hitRadius: 10
      }]
    },
    options: getChartOptions()
  });

  fractionData.set(id, {
    chart,
    labels: [],
    data: [],
    bankText: container.querySelector('.bank-text'),
    ammoText: container.querySelector('.ammo-text'),
	tableBody: table.querySelector('tbody'),
    color,
    prevBank: null,
    prevAmmo: null
  });
}

function showToast(text, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = text;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function updateEntry(entry, label, data, current, prev, labelType, notifUp, notifDown) {
  const diff = current - prev;
  const arrow = diff > 0 ? '⬆' : diff < 0 ? '⬇' : '';
  const color = diff > 0 ? '#4caf50' : diff < 0 ? '#ef5350' : 'inherit';
  label.innerHTML = `${labelType}: ${current.toLocaleString()} <span style="color:${color}">${arrow}</span>`;
  if (diff !== 0) {
    showToast((diff > 0 ? notifUp : notifDown)(entry.name, Math.abs(diff).toLocaleString()), diff > 0 ? 'success' : 'error');
  }
}

async function updateDashboard() {
  spinner.style.display = 'block';
  const data = await loadData();
  spinner.style.display = 'none';

  data.forEach(({ id, name, time, bank, ammo }) => {
    if (!fractionData.has(id)) {
      fractionOrder.push(id);
      createChartBlock(id, name, bank, fractionOrder.length - 1);
    }

    const entry = fractionData.get(id);
    entry.labels.push(time);
    entry.data.push(ammo);
const prevAmmo = entry.prevAmmo;
const diff = prevAmmo !== null ? ammo - prevAmmo : 0; // Если нет предыдущего, diff=0

const row = document.createElement('tr');
row.innerHTML = `
  <td>${time}</td>
  <td style="color:${diff > 0 ? '#4caf50' : diff < 0 ? '#ef5350' : '#999'}">
    ${diff > 0 ? '⬆' : diff < 0 ? '⬇' : '-'}
  </td>
  <td>${diff !== 0 ? Math.abs(diff).toLocaleString() : ammo.toLocaleString()}</td>
`;

entry.tableBody.appendChild(row);

// Обрізаємо до 30 рядків
if (entry.tableBody.rows.length > 30) {
  entry.tableBody.removeChild(entry.tableBody.firstChild);
}

    if (entry.labels.length > 30) entry.labels.shift(), entry.data.shift();

    const pr = [], pbc = [], pl = [], pp = [];
    entry.data.forEach((val, i) => {
      const prev = entry.data[i - 1] ?? val;
      let r = 4, c = entry.color, pulse = false, lbl = '';
      if (val > prev) {
        r = 7;
        c = '#4caf50';
        pulse = true;
        lbl = texts.ammoGainLabel.replace('{count}', (val - prev).toLocaleString());
      } else if (val < prev) {
        r = 7;
        c = '#ef5350';
        pulse = true;
        lbl = texts.ammoLossLabel.replace('{count}', (prev - val).toLocaleString());
      }
      pr.push(r); pbc.push(c); pp.push(pulse); pl.push(lbl);
    });

    Object.assign(entry.chart.data, { labels: entry.labels, datasets: [{
      ...entry.chart.data.datasets[0],
      data: entry.data,
      pointRadius: pr,
      pointBackgroundColor: pbc,
      pointPulse: pp,
      pointLabel: pl
    }] });
    entry.chart.update();

    if (entry.prevBank !== null) updateEntry(entry, entry.bankText, entry.data, bank, entry.prevBank, texts.bankLabel, texts.notifBankUp, texts.notifBankDown);
    else entry.bankText.textContent = `${texts.bankLabel}: ${bank.toLocaleString()}`;
    entry.prevBank = bank;

    if (entry.prevAmmo !== null) updateEntry(entry, entry.ammoText, entry.data, ammo, entry.prevAmmo, texts.ammoLabel, texts.notifAmmoUp, texts.notifAmmoDown);
    else entry.ammoText.textContent = `${texts.ammoLabel}: ${ammo.toLocaleString()}`;
    entry.prevAmmo = ammo;
  });
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  fractionData.forEach(({ chart }) => {
    chart.options = { ...chart.options, ...getChartOptions() };
    chart.update();
  });
}

themeToggle.textContent = texts.themeToggle;

themeToggle.onclick = toggleTheme;

(function init() {
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
  updateDashboard();
  setInterval(updateDashboard, 5 * 60 * 1000);
})();