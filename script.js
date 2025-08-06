const themeToggle = document.getElementById('theme-toggle');
const refreshButton = document.getElementById('refresh-now');
const wrapper = document.getElementById('charts-wrapper');
const spinner = document.getElementById('loading-spinner');
const toastContainer = document.getElementById('toast-container');

const fractionData = new Map();

const colorPalette = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc', '#ef5350', '#26c6da', '#8d6e63', '#d4e157'];
const fractionOrder = [];

function translate(key) {
const texts = {
  themeToggle: 'Переключить тему',
  refreshNow: 'Обновить сейчас',
  bankLabel: 'Банк $',
  ammoLabel: 'Боеприпасы',
  ammoLossLabel: '⬇ -{count} боеприпасов',
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
  return texts[key];
}

function getFractionName(id) {
  const names = translate('fractionNames');
  return names[id] || `Фракция ${id}`;
}

function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getThemeColors() {
  const isDark = document.body.classList.contains('dark-theme');
  return {
    textColor: isDark ? '#E0E0E0' : '#333',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    tooltipBg: isDark ? '#424242' : '#ffffff',
    tooltipTitleColor: isDark ? '#90CAF9' : '#1976d2',
    tooltipBodyColor: isDark ? '#E0E0E0' : '#444'
  };
}

const pulsePlugin = {
  id: 'pulsePlugin',
  afterDraw(chart) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    if (!dataset.pointPulse) return;

    const meta = chart.getDatasetMeta(0);
    meta.data.forEach((point, i) => {
      if (!dataset.pointPulse[i]) return;
      const radius = point.radius || 6;
      const x = point.x;
      const y = point.y;

      const time = Date.now() / 1000;
      const scale = 1 + 0.3 * Math.sin(time * 6 + i);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius * scale, 0, 2 * Math.PI);
      ctx.strokeStyle = dataset.pointBackgroundColor[i];
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.restore();
    });
  }
};

Chart.register(pulsePlugin);

function getChartOptions() {
  const theme = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipTitleColor,
        bodyColor: theme.tooltipBodyColor,
        cornerRadius: 6,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const val = context.raw;
            const label = context.dataset.pointLabel?.[index] || '';
            return `${translate('ammoLabel')}: ${val.toLocaleString()} ${label}`;
          }
        }
      },
      pulsePlugin: true
    },
    scales: {
      x: {
        ticks: { color: theme.textColor },
        grid: { color: theme.gridColor }
      },
      y: {
        beginAtZero: true,
        ticks: { color: theme.textColor },
        grid: { color: theme.gridColor }
      }
    }
  };
}

async function loadData() {
  try {
    const apiUrl = "https://yrn-api.arzmesa.ru/method/arizona.getFractionSklads?server=7";
    const headers = {
      Authorization: "Bearer yrn1.eyPk_OafC7hsmFYs64kdFVlIrfMJF7FCTZG2b07mQlNjAU53-zyyYcAHKt9G9PY82pEUqUNmGG2uNVE4iseBpwh8QMcKgTGH453D9jGxNoPDJ_g9n5x5iaUYefifMYK5SyYfTV66ipVSSoXQSRlBLrH8Y3e77Aon9qOSFI8llgKU_MezjRsgTzFRP1KWfF-PLxVZMxv6I_",
    };
    const response = await fetch(apiUrl, { method: "GET", headers });
    const result = await response.json();
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return result.response.items.map(item => ({
      id: item.fraction,
      name: getFractionName(item.fraction),
      time,
      bank: item.bank,
      ammo: item.ammo,
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

function createChartBlock(id, name, bank, colorIndex) {
  const container = document.createElement('div');
  container.className = 'chart-container';

  const header = document.createElement('div');
  header.className = 'fraction-header';

  const title = document.createElement('h2');
  title.textContent = name;

  const bankText = document.createElement('div');
  bankText.className = 'bank-text';
  bankText.textContent = `${translate('bankLabel')}: ${bank.toLocaleString()}`;

  const ammoText = document.createElement('div');
  ammoText.className = 'ammo-text';
  ammoText.textContent = '';

  header.appendChild(title);
  header.appendChild(bankText);
  header.appendChild(ammoText);
  container.appendChild(header);

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  wrapper.appendChild(container);

  const ctx = canvas.getContext('2d');
  const color = colorPalette[colorIndex % colorPalette.length];
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: translate('ammoLabel'),
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
    bankText,
    ammoText,
    color,
    prevBank: null,
    prevAmmo: null,
  });
}

function showToast(text, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = text;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
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

    if (entry.labels.length > 30) {
      entry.labels.shift();
      entry.data.shift();
    }

    const pointRadius = [];
    const pointBackgroundColor = [];
    const pointLabel = [];
    const pointPulse = [];

    entry.data.forEach((val, i) => {
      const prev = entry.data[i - 1] ?? val;
      let radius = 4;
      let color = entry.color;
      let pulse = false;
      let label = '';

      if (val > prev) {
        radius = 7;
        color = '#4caf50';
        pulse = true;
      } else if (val < prev) {
        radius = 7;
        color = '#ef5350';
        pulse = true;
        const lostCount = (prev - val).toLocaleString();
        label = translate('ammoLossLabel').replace('{count}', lostCount);
      }

      pointRadius.push(radius);
      pointBackgroundColor.push(color);
      pointPulse.push(pulse);
      pointLabel.push(label);
    });

    const dataset = entry.chart.data.datasets[0];
    entry.chart.data.labels = entry.labels;
    dataset.data = entry.data;
    dataset.pointRadius = pointRadius;
    dataset.pointBackgroundColor = pointBackgroundColor;
    dataset.pointPulse = pointPulse;
    dataset.pointLabel = pointLabel;
    entry.chart.update();

    if (entry.prevBank !== null) {
      const diff = bank - entry.prevBank;
      const arrow = diff > 0 ? '⬆' : (diff < 0 ? '⬇' : '');
      const colorArrow = diff > 0 ? '#4caf50' : (diff < 0 ? '#ef5350' : 'inherit');
      entry.bankText.innerHTML = `${translate('bankLabel')}: ${bank.toLocaleString()} <span style="color:${colorArrow}">${arrow}</span>`;

      if (diff !== 0) {
        showToast(diff > 0 ? translate('notifBankUp')(name, Math.abs(diff).toLocaleString())
                           : translate('notifBankDown')(name, Math.abs(diff).toLocaleString()),
                           diff > 0 ? 'success' : 'error');
      }
    } else {
      entry.bankText.textContent = `${translate('bankLabel')}: ${bank.toLocaleString()}`;
    }
    entry.prevBank = bank;

    if (entry.prevAmmo !== null) {
      const diffAmmo = ammo - entry.prevAmmo;
      const arrowAmmo = diffAmmo > 0 ? '⬆' : (diffAmmo < 0 ? '⬇' : '');
      const colorArrowAmmo = diffAmmo > 0 ? '#4caf50' : (diffAmmo < 0 ? '#ef5350' : 'inherit');
      entry.ammoText.innerHTML = `${translate('ammoLabel')}: ${ammo.toLocaleString()} <span style="color:${colorArrowAmmo}">${arrowAmmo}</span>`;

      if (diffAmmo !== 0) {
        showToast(diffAmmo > 0 ? translate('notifAmmoUp')(name, Math.abs(diffAmmo).toLocaleString())
                              : translate('notifAmmoDown')(name, Math.abs(diffAmmo).toLocaleString()),
                              diffAmmo > 0 ? 'success' : 'error');
      }
    } else {
      entry.ammoText.textContent = `${translate('ammoLabel')}: ${ammo.toLocaleString()}`;
    }
    entry.prevAmmo = ammo;
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  fractionData.forEach(({ chart }) => {
    chart.options = { ...chart.options, ...getChartOptions() };
    chart.update();
  });
}

themeToggle.textContent = translate('themeToggle');
refreshButton.textContent = translate('refreshNow');

themeToggle.addEventListener('click', () => {
  toggleTheme();
});

refreshButton.addEventListener('click', () => {
  updateDashboard();
});

(function init() {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }
  updateDashboard();
  setInterval(updateDashboard, 5 * 60 * 1000);
})();

