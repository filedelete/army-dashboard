let darkMode = true;
const history = {};
window.charts = {};

function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle('light', !darkMode);
  document.querySelectorAll('button').forEach(btn => {
    btn.style.color = darkMode ? '#fff' : '#111827';
    btn.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
  });
  updateChartsTheme();
}

function updateChartsTheme() {
  Object.values(window.charts || {}).forEach(chart => {
    chart.options.scales.x.ticks.color = darkMode ? '#fff' : '#111827';
    chart.options.scales.y.ticks.color = darkMode ? '#fff' : '#111827';
    chart.options.plugins.legend.labels.color = darkMode ? '#fff' : '#111827';
    chart.data.datasets[0].borderColor = darkMode ? '#facc15' : '#f59e0b';
    chart.data.datasets[0].backgroundColor = darkMode ? 'rgba(250,204,21,0.2)' : 'rgba(245,158,11,0.2)';
    chart.update();
  });
}

// -------------------- Загрузка данных --------------------
async function loadData() {
  try {
    const res = await fetch("https://mute-silence-f23b.antonplaksyvyi.workers.dev/", {
      headers: { 
        Authorization: "Bearer yrn1.eyOIjmZkjsa12_fenmGnAws.Ft0qH7h-NQ5Ys-XWLmQP1QQaKBGU_2ZkOOdfzmoOfi0updi6Q0tsN64F0YcCPROko9X6lkFCj7q5XqvY8kN3a1MPsMT0h51sJMiPfmTN7lwHLZrjk8uJDzBlbhdyd4m86K8eWRTcApRc9rGgvB5fT3GZ3HMTUwqLWly0RxUw5_rpeoVYVBj92I-jaGtKVj-J9iHAZftV"
      }
    });

    const json = await res.json();
    const items = json.response?.items || [];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return items.map(item => ({
      id: item.fraction.id,
      name: item.fraction.label,
      time,
      bank: item.bank,
      ammo: item.ammo.current,
      ammoMax: item.ammo.max
    }));

  } catch (e) {
    console.error("Ошибка загрузки данных:", e);
    return [];
  }
}

// -------------------- Создание графиков --------------------
function createChart(ctx, records, previous) {
  const diff = previous ? records[records.length - 1].ammo - previous.ammo : 0;

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: records.map(r => r.time),
      datasets: [{
        data: records.map(r => r.ammo),
        borderColor: darkMode ? '#facc15' : '#f59e0b',
        backgroundColor: darkMode ? 'rgba(250,204,21,0.2)' : 'rgba(245,158,11,0.2)',
        tension: 0.3,
        pointRadius: 6,
        pointBackgroundColor: records.map((r, i) => {
          if (i === records.length - 1) {
            if (!previous) return darkMode ? '#facc15' : '#f59e0b';
            return diff > 0 ? (darkMode ? '#22c55e' : '#16a34a') :
                   diff < 0 ? (darkMode ? '#ef4444' : '#dc2626') :
                   (darkMode ? '#facc15' : '#f59e0b');
          }
          return darkMode ? '#facc15' : '#f59e0b';
        })
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: darkMode ? '#fff' : '#111827', font: { family: "Inter", size: 11 } } },
        y: {
          ticks: { color: darkMode ? '#fff' : '#111827', font: { family: "Inter", size: 11 } },
          suggestedMin: Math.min(...records.map(r => r.ammo)) - 50,
          suggestedMax: Math.max(...records.map(r => r.ammo)) + 50
        }
      }
    }
  });
}

// -------------------- Модалка --------------------
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modal-card");
modal.addEventListener("click", (e) => {
  if (e.target.id === "modal-close" || e.target === modal) {
    modal.classList.remove("active");
  }
});

// -------------------- Основная функция --------------------
async function fetchData() {
  const items = await loadData();
  const container = document.getElementById("cards");

  // Сортировка по ammo от меньшего к большему
  items.sort((a, b) => a.ammo - b.ammo);

  // Создаём новые карточки и анимируем перестановку
  const newCards = items.map(item => {
    if (!history[item.id]) history[item.id] = [];
    history[item.id].push({ time: item.time, bank: item.bank, ammo: item.ammo });
    history[item.id] = history[item.id].slice(-10);

    const records = history[item.id];
    const latest = records[records.length - 1];
    const previous = records[records.length - 2];
    const ammoPercent = Math.round((latest.ammo / item.ammoMax) * 100);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${item.name}</h2>
      <p class="meta">Обновлено: ${item.time}</p>
      <div class="stats">
        <div class="stat">💰 Банк: <b>${latest.bank.toLocaleString()}</b></div>
        <div class="stat">🔫 Патроны: <b>${latest.ammo.toLocaleString()}</b>
          ${previous && latest.ammo > previous.ammo ? `<span class="green">▲</span>` :
        previous && latest.ammo < previous.ammo ? `<span class="red">▼</span>` :
          `<span class="yellow">▬</span>`}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${ammoPercent}%; background-color: ${ammoPercent>70?'#16a34a':ammoPercent>30?'#facc15':'#dc2626'}"></div>
        </div>
      </div>
      <canvas id="chart-${item.id}"></canvas>
    `;

    const ctx2d = card.querySelector(`#chart-${item.id}`).getContext("2d");
    if (window.charts[item.id]) window.charts[item.id].destroy();
    window.charts[item.id] = createChart(ctx2d, records, previous);

    // Модалка
    card.addEventListener("click", () => {
      const modalAmmoPercent = Math.round((latest.ammo / item.ammoMax) * 100);
      modalCard.innerHTML = `
        <h2>${item.name}</h2>
        <p class="meta">Обновлено: ${item.time}</p>
        <div class="stats">
          <div class="stat">💰 Банк: <b>${latest.bank.toLocaleString()}</b></div>
          <div class="stat">🔫 Патроны: <b>${latest.ammo.toLocaleString()}</b>
            ${previous && latest.ammo > previous.ammo ? `<span class="green">▲</span>` :
          previous && latest.ammo < previous.ammo ? `<span class="red">▼</span>` :
            `<span class="yellow">▬</span>`}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${modalAmmoPercent}%; background-color: ${modalAmmoPercent>70?'#16a34a':modalAmmoPercent>30?'#facc15':'#dc2626'}"></div>
          </div>
        </div>
        <canvas id="modal-chart"></canvas>
        <span class="modal-close" id="modal-close">✖</span>
      `;
      modal.classList.add("active");
      const ctxModal = document.getElementById("modal-chart").getContext("2d");
      new Chart(ctxModal, createChart(ctxModal, records, previous).config);
    });

    return card;
  });

  // Анимация перестановки карточек
  container.innerHTML = "";
  newCards.forEach(card => {
    card.style.opacity = 0;
    container.appendChild(card);
    setTimeout(() => { card.style.transition = "opacity 0.5s"; card.style.opacity = 1; }, 50);
  });
}

// -------------------- Запуск --------------------
fetchData();
setInterval(fetchData, 600000);
