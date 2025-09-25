let darkMode = true;
const history = {};
window.charts = {};

// переключение темы
function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle("light", !darkMode);
  updateChartsTheme();
}

function updateChartsTheme() {
  Object.values(window.charts || {}).forEach(chart => {
    chart.options.scales.x.ticks.color = darkMode ? '#e6e6e6' : '#111';
    chart.options.scales.y.ticks.color = darkMode ? '#e6e6e6' : '#111';
    chart.update();
  });
}

// ================= Загрузка данных =================
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

// ================= Chart.js с прогнозом =================
// ================= Chart.js без прогноза =================
function createChart(ctx, records) {
  // реальные значения
  const labels = records.map(r => r.time);
  const data = records.map(r => r.ammo);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Патроны',
          data,
          borderColor: "#f59e0b",
          backgroundColor: 'rgba(245,158,11,0.2)',
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#f59e0b"
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: darkMode ? '#e6e6e6' : '#111' } },
        y: { ticks: { color: darkMode ? '#e6e6e6' : '#111' } }
      },
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      }
    }
  });
}


// ================= Утилиты =================
function getPercentColor(percent) {
  if (percent > 70) return "green";
  if (percent > 30) return "yellow";
  return "red";
}

// плавная анимация чисел
function animateNumber(el, to) {
  const from = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  const duration = 600;
  const start = performance.now();
  requestAnimationFrame(function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const val = Math.floor(from + (to - from) * progress);
    el.textContent = val.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  });
}

// ================= Модалка =================
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modal-card");
modal.addEventListener("click", (e) => {
  if (e.target.id === "modal-close" || e.target === modal) {
    modal.classList.remove("active");
  }
});

// ================= Основная функция =================
async function fetchData() {
  // показать загрузку
  document.getElementById("loader").classList.add("active");

  const items = await loadData();
  const container = document.getElementById("cards");

  items.sort((a, b) => a.ammo - b.ammo);

  const newCards = items.map(item => {
    if (!history[item.id]) history[item.id] = [];
    history[item.id].push({ time: item.time, bank: item.bank, ammo: item.ammo });
    history[item.id] = history[item.id].slice(-10);

    const records = history[item.id];
    const latest = records[records.length - 1];
    const previous = records[records.length - 2];
    const ammoPercent = Math.round((latest.ammo / item.ammoMax) * 100);
    const percentColor = getPercentColor(ammoPercent);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${item.name}</h2>
      <div class="content">
        <p class="meta">Обновлено: ${item.time}</p>
        <div class="stat">💰 <b>Банк:</b> <span class="value-bank">0</span></div>
        <div class="stat">🔫 <b>Патроны:</b> <span class="value-ammo">0</span>
          ${previous && latest.ammo > previous.ammo ? `<span class="green">▲</span>` :
        previous && latest.ammo < previous.ammo ? `<span class="red">▼</span>` :
          `<span class="yellow">▬</span>`}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="background-color:${ammoPercent > 70 ? '#22c55e' : ammoPercent > 30 ? '#facc15' : '#ef4444'}"></div>
        </div>
        <p class="meta ${percentColor}">Заполнено: <span class="value-percent">0</span>%</p>
        <canvas id="chart-${item.id}"></canvas>
      </div>
    `;

    // анимации чисел
    animateNumber(card.querySelector(".value-bank"), latest.bank);
    animateNumber(card.querySelector(".value-ammo"), latest.ammo);
    animateNumber(card.querySelector(".value-percent"), ammoPercent);

    // анимация прогресс-бара
    setTimeout(() => {
      card.querySelector(".progress-fill").style.width = `${ammoPercent}%`;
    }, 50);

    const ctx2d = card.querySelector(`#chart-${item.id}`).getContext("2d");
    if (window.charts[item.id]) window.charts[item.id].destroy();
    window.charts[item.id] = createChart(ctx2d, records);

    // Модалка
    card.addEventListener("click", () => {
      modalCard.innerHTML = `
        <h2>${item.name}</h2>
        <p class="meta">Обновлено: ${item.time}</p>
        <div class="stat">💰 <b>Банк:</b> ${latest.bank.toLocaleString()}</div>
        <div class="stat">🔫 <b>Патроны:</b> ${latest.ammo.toLocaleString()}
          ${previous && latest.ammo > previous.ammo ? `<span class="green">▲</span>` :
        previous && latest.ammo < previous.ammo ? `<span class="red">▼</span>` :
          `<span class="yellow">▬</span>`}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${ammoPercent}%; background-color:${ammoPercent > 70 ? '#22c55e' : ammoPercent > 30 ? '#facc15' : '#ef4444'}"></div>
        </div>
        <p class="meta ${percentColor}">Заполнено: ${ammoPercent}%</p>
        <canvas id="modal-chart"></canvas>
        <span class="modal-close" id="modal-close">✖</span>
      `;
      modal.classList.add("active");
      const ctxModal = document.getElementById("modal-chart").getContext("2d");
      new Chart(ctxModal, createChart(ctxModal, records).config);
    });

    return card;
  });

  container.innerHTML = "";
  newCards.forEach(card => container.appendChild(card));

  // скрыть загрузку
  document.getElementById("loader").classList.remove("active");
}

document.addEventListener("DOMContentLoaded", () => {
  fetchData();                       // первая загрузка сразу после рендера DOM
  setInterval(fetchData, 600000);    // автообновление каждые 10 минут
});