let darkMode = true;
const FRACTIONS={1:"LSPD",2:"FBI",3:"Армия ЛС",4:"Армия СФ",5:"Армия ЛВ",6:"Больница ЛС",7:"Больница СФ",8:"Больница ЛВ",9:"Мэрия ЛС",10:"Мэрия СФ",11:"Мэрия ЛВ"};
const history={};
window.charts={};

function toggleTheme(){
  darkMode = !darkMode;
  document.body.classList.toggle('light', !darkMode);
  document.querySelectorAll('button').forEach(btn=>{
    if(!darkMode){btn.style.color='#111827'; btn.style.borderColor='rgba(0,0,0,0.2)';}
    else{btn.style.color='#fff'; btn.style.borderColor='rgba(255,255,255,0.2)';}
  });
  updateChartsTheme();
}

function updateChartsTheme(){
  Object.values(window.charts||{}).forEach(chart=>{
    chart.options.scales.x.ticks.color = darkMode ? '#fff' : '#111827';
    chart.options.scales.y.ticks.color = darkMode ? '#fff' : '#111827';
    chart.options.plugins.legend.labels.color = darkMode ? '#fff' : '#111827';
    chart.data.datasets[0].borderColor = darkMode ? '#facc15' : '#f59e0b';
    chart.data.datasets[0].backgroundColor = darkMode ? 'rgba(250,204,21,0.2)' : 'rgba(245,158,11,0.2)';
    chart.update();
  });
}

async function loadData(){
  try{
    const res=await fetch("https://yrn-api.arzmesa.ru/method/arizona.getFractionSklads?server=7",{
      headers:{Authorization:"Bearer yrn1.eyPk_OafC7hsmFYs64kdFVlIrfMJF7FCTZG2b07mQlNjAU53-zyyYcAHKt9G9PY82pEUqUNmGG2uNVE4iseBpwh8QMcKgTGH453D9jGxNoPDJ_g9n5x5iaUYefifMYK5SyYfTV66ipVSSoXQSRlBLrH8Y3e77Aon9qOSFI8llgKU_MezjRsgTzFRP1KWfF-PLxVZMxv6I_"}
    });
    const {response:{items}} = await res.json();
    const time=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    return items.map(({fraction,bank,ammo})=>({id:fraction,name:FRACTIONS[fraction]||`Фракция #${fraction}`,time,bank:bank??0,ammo}));
  }catch(e){console.error(e); return[];}
}

function createChart(ctx, records, previous){
  const diff = previous ? records[records.length-1].ammo - previous.ammo : 0;
  return new Chart(ctx,{
    type:'line',
    data:{
      labels:records.map(r=>r.time),
      datasets:[{
        data:records.map(r=>r.ammo),
        borderColor: darkMode ? '#facc15' : '#f59e0b',
        backgroundColor: darkMode ? 'rgba(250,204,21,0.2)' : 'rgba(245,158,11,0.2)',
        tension:0.3,
        pointRadius:6,
        pointBackgroundColor:records.map((r,i)=>{
          if(i===records.length-1){
            if(!previous) return darkMode?'#facc15':'#f59e0b';
            return diff>0? (darkMode?'#22c55e':'#16a34a') : diff<0?(darkMode?'#ef4444':'#dc2626') : (darkMode?'#facc15':'#f59e0b');
          }
          return darkMode?'#facc15':'#f59e0b';
        })
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:darkMode?'#fff':'#111827',font:{family:"Inter",size:11}}},
        y:{ticks:{color:darkMode?'#fff':'#111827',font:{family:"Inter",size:11}},
           suggestedMin:Math.min(...records.map(r=>r.ammo))-50,
           suggestedMax:Math.max(...records.map(r=>r.ammo))+50}
      }
    }
  });
}

const modal=document.getElementById("modal");
const modalCard=document.getElementById("modal-card");
modal.addEventListener("click",(e)=>{if(e.target.id==="modal-close"||e.target===modal){modal.classList.remove("active");}});

async function fetchData(){
  const items=await loadData();
  const container=document.getElementById("cards");
  container.innerHTML="";

  items.forEach(item=>{
    if(!history[item.id]) history[item.id]=[];
    history[item.id].push({time:item.time,bank:item.bank,ammo:item.ammo});
    history[item.id]=history[item.id].slice(-10);

    const records=history[item.id];
    const latest=records[records.length-1];
    const previous=records[records.length-2];

    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <h2>${item.name}</h2>
      <p class="meta">Обновлено: ${item.time}</p>
      <div class="stats">
        <div class="stat">💰 Банк: <b>${latest.bank.toLocaleString()}</b></div>
        <div class="stat">🔫 Патроны: <b>${latest.ammo.toLocaleString()}</b>
          ${previous && latest.ammo>previous.ammo?`<span class="green">▲</span>`:previous && latest.ammo<previous.ammo?`<span class="red">▼</span>`:`<span class="yellow">▬</span>`}
        </div>
      </div>
      <canvas id="chart-${item.id}"></canvas>
    `;
    container.appendChild(card);

    const ctx=document.getElementById(`chart-${item.id}`).getContext("2d");
    if(window.charts[item.id]) window.charts[item.id].destroy();
    window.charts[item.id]=createChart(ctx,records,previous);

    card.addEventListener("click",()=>{
      modalCard.innerHTML=`
        <h2>${item.name}</h2>
        <p class="meta">Обновлено: ${item.time}</p>
        <div class="stats">
          <div class="stat">💰 Банк: <b>${latest.bank.toLocaleString()}</b></div>
          <div class="stat">🔫 Патроны: <b>${latest.ammo.toLocaleString()}</b>
            ${previous && latest.ammo>previous.ammo?`<span class="green">▲</span>`:previous && latest.ammo<previous.ammo?`<span class="red">▼</span>`:`<span class="yellow">▬</span>`}
          </div>
        </div>
        <canvas id="modal-chart"></canvas>
        <span class="modal-close" id="modal-close">✖</span>
      `;
      modal.classList.add("active");
      const ctxModal=document.getElementById("modal-chart").getContext("2d");
      new Chart(ctxModal, createChart(ctxModal, records, previous).config);
    });
  });
}

fetchData();
setInterval(fetchData,600000);
