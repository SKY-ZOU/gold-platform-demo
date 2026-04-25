// ============================================
// GoldPass 金通 v4.0
// 3D地球 + ECharts GL + 粒子系统
// ============================================

let currentPortal = 'business'; // 'business' | 'gov'

// ========== 3D地球 ==========
function initGlobe() {
  const el = document.getElementById('globeChart');
  if (!el || typeof echarts === 'undefined' || !echarts.getMap) {
    // echarts-gl not loaded yet, retry
    setTimeout(initGlobe, 500);
    return;
  }
  if (el.dataset.inited) return;
  el.dataset.inited = '1';

  const chart = echarts.init(el);

  // 节点数据 [lng, lat, name, inventory, color, type]
  const nodes = [
    [114.17, 22.32, '香港 · 1,800kg', '机场金库·张氏黄金', '#d4a842', 22],
    [114.13, 22.55, '莲塘口岸', '深圳海关', '#22d3ee', 11],
    [114.05, 22.83, '凤岗海关', '黄埔海关下属', '#5b8def', 11],
    [113.75, 23.05, '东莞·绍隆实业', '众恒隆集团子公司·精炼3吨/日', '#fbbf24', 14],
    [55.27, 25.20, '迪拜DMCC · 120kg', '合作仓', '#fbbf24', 14],
    [36.82, -1.29, '内罗毕 · 45kg', '合作仓', '#a855f7', 12],
    [101.69, 3.14, '吉隆坡 · 68kg', '合作仓', '#34d399', 12]
  ];

  // 飞线数据 [[fromLng,fromLat], [toLng,toLat]]
  // 主路线：电子锁试点（香港→莲塘→凤岗→东莞绍隆）
  const routes = [
    { coords: [[114.17,22.32],[114.13,22.55]], color: '#d4a842' },
    { coords: [[114.13,22.55],[114.05,22.83]], color: '#22d3ee' },
    { coords: [[114.05,22.83],[113.75,23.05]], color: '#5b8def' },
    { coords: [[114.17,22.32],[55.27,25.20]], color: '#fbbf24' },
    { coords: [[114.17,22.32],[36.82,-1.29]], color: '#a855f7' },
    { coords: [[114.17,22.32],[101.69,3.14]], color: '#34d399' },
    // return lines (dimmer)
    { coords: [[55.27,25.20],[114.17,22.32]], color: 'rgba(251,191,36,0.3)' },
    { coords: [[36.82,-1.29],[114.17,22.32]], color: 'rgba(168,85,247,0.3)' },
    { coords: [[101.69,3.14],[114.17,22.32]], color: 'rgba(52,211,153,0.3)' },
  ];

  chart.setOption({
    backgroundColor: 'transparent',
    globe: {
      baseColor: '#000',
      heightTexture: 'assets/world-topo.jpg',
      displacementScale: 0.05,
      environment: 'assets/starfield.jpg',
      shading: 'realistic',
      realisticMaterial: { roughness: 0.9, metalness: 0 },
      postEffect: {
        enable: true,
        bloom: { enable: true, intensity: 0.2 }
      },
      temporalSuperSampling: { enable: true },
      atmosphere: {
        show: true,
        color: '#1a4a8a',
        glowPower: 8,
        innerGlowPower: 2
      },
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 2,
        distance: 200,
        alpha: 10,
        beta: 160,
        minDistance: 120,
        maxDistance: 400,
        damping: 0.9
      },
      light: {
        ambient: { intensity: 0 },
        main: { intensity: 0, shadow: false }
      },
      layers: [{
        type: 'blend',
        blendTo: 'emission',
        texture: 'assets/night.jpg',
        intensity: 2.5
      }]
    },
    series: [
      // Flying lines with particle effect
      {
        type: 'lines3D',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        lineStyle: {
          width: 2,
          opacity: 0.8
        },
        effect: {
          show: true,
          period: 3,
          trailLength: 0.4,
          trailWidth: 4,
          trailOpacity: 1
        },
        data: routes.map(r => ({
          coords: r.coords,
          lineStyle: { color: r.color },
          effect: { color: r.color }
        }))
      },
      // Scatter points for nodes
      {
        type: 'scatter3D',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        symbolSize: function(val) { return val[2]; },
        itemStyle: {
          opacity: 1
        },
        label: {
          show: true,
          position: 'top',
          formatter: function(p) { return p.data.name; },
          textStyle: {
            color: '#e2e8f0',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "'Noto Sans SC', sans-serif",
            backgroundColor: 'rgba(6,10,20,0.7)',
            padding: [3, 8],
            borderRadius: 4,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
          }
        },
        data: nodes.map(n => ({
          value: [n[0], n[1], n[5]],
          name: n[2],
          label: { show: true },
          itemStyle: { color: n[4] }
        }))
      },
      // Halo rings around Hong Kong (core hub)
      {
        type: 'scatter3D',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        symbol: 'circle',
        symbolSize: 45,
        itemStyle: {
          color: 'rgba(212,168,66,0.2)',
          opacity: 0.8
        },
        label: { show: false },
        data: [[114.17, 22.32, 0]]
      }
    ]
  });

  window.addEventListener('resize', () => chart.resize());
  window._globeChart = chart;
}

// ========== 粒子系统 ==========
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1 + Math.random() * 2,
      speedY: -0.2 - Math.random() * 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: 0.1 + Math.random() * 0.4
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 168, 66, ${p.opacity})`;
      ctx.fill();
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
    });
    animId = requestAnimationFrame(draw);
  }
  draw();

  window.stopParticles = () => { if (animId) cancelAnimationFrame(animId); };
}

// ========== 数字动画 ==========
function animateValue(el, target, duration, suffix) {
  duration = duration || 1500;
  suffix = suffix || '';
  const start = 0;
  const startTime = performance.now();
  const isDecimal = String(target).includes('.');

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = isDecimal ? current.toFixed(1) + suffix : Math.round(current).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function animateKPIs() {
  document.querySelectorAll('.page.active .kpi-val').forEach(el => {
    const text = el.textContent.trim();
    const match = text.match(/([\d,.]+)/);
    if (match) {
      const target = parseFloat(match[1].replace(/,/g, ''));
      const suffix = text.replace(match[1], '').trim();
      animateValue(el, target, 1500, suffix ? ' ' + suffix : '');
    }
  });
}

// ========== ECharts 图表 ==========
function initGovCharts() {
  initTrendChart();
  initGaugeChart();
  initPieChart();
}

function initTrendChart() {
  const el = document.getElementById('chartTrend');
  if (!el || el.dataset.inited) return;
  const chart = echarts.init(el, 'dark');
  el.dataset.inited = '1';

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, textStyle: { color: '#8896ab', fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
      axisLine: { lineStyle: { color: '#1e2a3a' } },
      axisLabel: { color: '#556378', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e2a3a' } },
      axisLabel: { color: '#556378', fontSize: 10 }
    },
    series: [
      {
        name: '来料加工', type: 'bar',
        data: [1200,1350,1500,1800,2100,2300,2500,2600,2400,2700,2850,2847],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0,0,0,1,[
            { offset: 0, color: '#d4a842' },
            { offset: 1, color: 'rgba(212,168,66,0.2)' }
          ]),
          borderRadius: [4,4,0,0]
        },
        barWidth: '40%'
      },
      {
        name: '进料加工', type: 'line',
        data: [400,500,600,700,800,900,1000,1100,1200,1300,1400,1500],
        smooth: true,
        lineStyle: { color: '#5b8def', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0,0,0,1,[
            { offset: 0, color: 'rgba(91,141,239,0.3)' },
            { offset: 1, color: 'rgba(91,141,239,0.02)' }
          ])
        },
        symbol: 'circle', symbolSize: 6,
        itemStyle: { color: '#5b8def' }
      }
    ]
  });
  window.addEventListener('resize', () => chart.resize());
}

function initGaugeChart() {
  const el = document.getElementById('chartGauge');
  if (!el || el.dataset.inited) return;
  const chart = echarts.init(el, 'dark');
  el.dataset.inited = '1';

  chart.setOption({
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 220, endAngle: -40,
      min: 0, max: 1,
      center: ['50%', '55%'], radius: '85%',
      progress: {
        show: true, width: 12,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#34d399' },
              { offset: 0.7, color: '#fbbf24' },
              { offset: 1, color: '#f87171' }
            ]
          }
        }
      },
      axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(255,255,255,0.05)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { distance: 20, color: '#556378', fontSize: 10, formatter: v => v.toFixed(1) + '%' },
      pointer: { length: '55%', width: 4, itemStyle: { color: '#d4a842' } },
      anchor: { show: true, size: 8, itemStyle: { color: '#d4a842', borderColor: '#0f1628', borderWidth: 3 } },
      title: { show: true, offsetCenter: [0, '70%'], fontSize: 12, color: '#8896ab' },
      detail: {
        valueAnimation: true, fontSize: 28, fontWeight: 700,
        color: '#d4a842', offsetCenter: [0, '40%'],
        formatter: v => v.toFixed(2) + '%'
      },
      data: [{ value: 0.38, name: '平均损耗率' }]
    }]
  });
  window.addEventListener('resize', () => chart.resize());
}

function initPieChart() {
  const el = document.getElementById('chartPie');
  if (!el || el.dataset.inited) return;
  const chart = echarts.init(el, 'dark');
  el.dataset.inited = '1';

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'], center: ['50%', '50%'],
      label: { color: '#8896ab', fontSize: 11 },
      labelLine: { lineStyle: { color: '#2a3a50' } },
      itemStyle: { borderColor: '#0f1628', borderWidth: 2 },
      data: [
        { value: 55, name: '香港交易所', itemStyle: { color: '#d4a842' } },
        { value: 20, name: '一带一路', itemStyle: { color: '#5b8def' } },
        { value: 15, name: '国内市场', itemStyle: { color: '#34d399' } },
        { value: 10, name: '水贝转厂', itemStyle: { color: '#a78bfa' } }
      ],
      animationType: 'scale',
      animationDelay: idx => idx * 200
    }]
  });
  window.addEventListener('resize', () => chart.resize());
}

// ========== 角色选择与进入平台 ==========
function enterPlatform(role) {
  currentPortal = role;
  if (window.stopParticles) window.stopParticles();
  document.getElementById('roleSelect').classList.add('hidden');
  document.getElementById('platform').classList.remove('hidden');

  const badge = document.getElementById('portalBadge');
  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');

  if (role === 'business') {
    badge.textContent = '企业端 To B';
    badge.className = 'topbar-portal business';
    avatar.textContent = '张';
    name.textContent = '张氏黄金贸易';
    document.getElementById('menuBusiness').classList.remove('hidden');
    document.getElementById('menuGov').classList.add('hidden');
    showPage('b-dashboard');
  } else {
    badge.textContent = '监管端 To G';
    badge.className = 'topbar-portal gov';
    avatar.textContent = '海';
    name.textContent = '凤岗海关 · 监管员';
    document.getElementById('menuBusiness').classList.add('hidden');
    document.getElementById('menuGov').classList.remove('hidden');
    showPage('g-dashboard');
  }
}

function showRoleSelect() {
  document.getElementById('roleSelect').classList.remove('hidden');
  document.getElementById('platform').classList.add('hidden');
}

// ========== 侧边栏 ==========
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    sb.classList.toggle('open');
  } else {
    sb.classList.toggle('collapsed');
  }
}

// Close sidebar when clicking a menu item on mobile
function closeMobileSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

// ========== 导航 ==========
function navigateTo(el) {
  const page = el.dataset.page;
  const menu = currentPortal === 'business' ? 'menuBusiness' : 'menuGov';
  document.querySelectorAll('#' + menu + ' .menu-item').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  showPage(page);
  closeMobileSidebar();
}

function navigateToPage(pageId) {
  const menu = currentPortal === 'business' ? 'menuBusiness' : 'menuGov';
  document.querySelectorAll('#' + menu + ' .menu-item').forEach(m => {
    m.classList.toggle('active', m.dataset.page === pageId);
  });
  showPage(pageId);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    document.getElementById('mainContent').scrollTop = 0;
  }
  // 监管端仪表盘 - 初始化图表和KPI动画
  if (pageId === 'g-dashboard') {
    setTimeout(() => { initTrendChart(); initGaugeChart(); initPieChart(); animateKPIs(); }, 300);
  }
  // 企业端仪表盘 - KPI动画
  if (pageId === 'b-dashboard') {
    setTimeout(animateKPIs, 300);
  }
}

// ========== 表单提交 ==========
function submitApply() {
  showToast('申请信息已保存，请继续上传单证材料');
  const steps = document.querySelectorAll('.step-item');
  const lines = document.querySelectorAll('.step-line');
  if (steps[2]) {
    steps[2].classList.add('active');
    lines[1].classList.add('done');
  }
}

// ========== 审批弹窗 ==========
function showApproval() {
  document.getElementById('approvalModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('approvalModal').classList.add('hidden');
}

function approveSuccess() {
  closeModal();
  showToast('审批通过！已通知申请企业');
}

// ========== Toast 提示 ==========
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ========== 金价平滑动画 ==========
function animateGoldPrice(el, from, to, duration) {
  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = '$' + current.toFixed(2);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initGlobe();

  // 类型选择交互
  document.addEventListener('click', e => {
    const opt = e.target.closest('.type-option');
    if (opt) {
      document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    }
  });

  // 金价模拟 - 平滑数字过渡
  let lastPrice = 2347.80;
  setInterval(() => {
    const el = document.querySelector('.price-value');
    if (!el) return;
    const base = 2347.80;
    const change = (Math.random() - 0.5) * 5;
    const newPrice = base + change;
    animateGoldPrice(el, lastPrice, newPrice, 800);
    lastPrice = newPrice;

    const changeEl = document.querySelector('.price-change');
    if (!changeEl) return;
    const pct = (change / base * 100).toFixed(2);
    if (change >= 0) {
      changeEl.textContent = '+' + pct + '%';
      changeEl.className = 'price-change up';
    } else {
      changeEl.textContent = pct + '%';
      changeEl.className = 'price-change down';
    }
  }, 5000);

  // Command center clock
  function updateClock() {
    const el = document.getElementById('cmdTime');
    if (!el) return;
    const now = new Date();
    const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'),
          d = String(now.getDate()).padStart(2,'0'), h = String(now.getHours()).padStart(2,'0'),
          mi = String(now.getMinutes()).padStart(2,'0'), s = String(now.getSeconds()).padStart(2,'0');
    el.textContent = `${y}-${m}-${d} ${h}:${mi}:${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Command center mini chart
  if (typeof echarts !== 'undefined' && document.getElementById('cmdMiniChart')) {
    const mc = echarts.init(document.getElementById('cmdMiniChart'), 'dark');
    const data = [2320,2340,2335,2348,2342,2350,2347,2352,2345,2349,2347,2351,2348];
    mc.setOption({
      backgroundColor:'transparent',
      grid:{top:5,right:5,bottom:5,left:5},
      xAxis:{show:false,data:data.map((_,i)=>i)},
      yAxis:{show:false,min:2310,max:2360},
      series:[{type:'line',data:data,smooth:true,symbol:'none',
        lineStyle:{color:'#d4a842',width:1.5},
        areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(212,168,66,0.2)'},{offset:1,color:'rgba(212,168,66,0)'}]}}}]
    });
    window.addEventListener('resize',()=>mc.resize());
  }
});
