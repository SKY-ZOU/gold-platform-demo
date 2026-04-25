// ============================================
// GoldPass 金通 v6.0
// 多角色登录 + 数据持久化 + 审计日志 + 通知
// ============================================

let currentPortal = 'business'; // 'business' | 'gov'

// ========== 用户账号系统 ==========
const USERS = {
  'zhang@chang.hk':         { pwd:'demo123', name:'张德熙', org:'张氏黄金贸易有限公司',     role:'consigner-zhang',  portal:'business', avatar:'张', color:'#d4a842' },
  'shaolong@hk.com':        { pwd:'demo123', name:'少龙',   org:'少龙国际贸易有限公司',     role:'consigner-shaolong',portal:'business',avatar:'少', color:'#d4a842' },
  'zhonghenglong@hk.com':   { pwd:'demo123', name:'刘敬毅', org:'香港众恒隆国际有限公司',   role:'hk-trader',        portal:'business', avatar:'众', color:'#fbbf24' },
  'shaolong@dg.cn':         { pwd:'demo123', name:'刘工',   org:'东莞绍隆实业有限公司',     role:'processor',        portal:'business', avatar:'绍', color:'#fbbf24' },
  'admin@goldpass.io':      { pwd:'demo123', name:'平台管理员', org:'一带一路国际黄金集团', role:'platform-admin',   portal:'business', avatar:'⭐', color:'#d4a842' },
  'customs.hk@gov.hk':      { pwd:'demo123', name:'陈监管员', org:'香港海关 · 机场科',     role:'customs-hk',       portal:'gov',      avatar:'港', color:'#d4a842' },
  'customs.sz@gov.cn':      { pwd:'demo123', name:'李监管员', org:'深圳海关 · 莲塘口岸',   role:'customs-sz',       portal:'gov',      avatar:'深', color:'#22d3ee' },
  'customs.hp@gov.cn':      { pwd:'demo123', name:'王监管员', org:'黄埔海关 · 凤岗下属',   role:'customs-hp',       portal:'gov',      avatar:'凤', color:'#5b8def' },
};

let currentUser = null;

function getCurrentUser() {
  if (currentUser) return currentUser;
  const stored = localStorage.getItem('goldpass-user');
  if (stored) {
    try { currentUser = JSON.parse(stored); return currentUser; } catch(e) {}
  }
  return null;
}

function loginUser(email, pwd, remember) {
  const u = USERS[email.toLowerCase().trim()];
  if (!u) return { ok:false, msg:'账号不存在' };
  if (u.pwd !== pwd) return { ok:false, msg:'密码错误' };
  currentUser = { email, ...u, loginTime: Date.now() };
  if (remember) localStorage.setItem('goldpass-user', JSON.stringify(currentUser));
  else sessionStorage.setItem('goldpass-user', JSON.stringify(currentUser));
  // Audit log
  addAuditLog({ type:'login', actor: currentUser.name, role: currentUser.role, target:'-', detail:'用户登录系统' });
  return { ok:true, user: currentUser };
}

function logoutUser() {
  if (currentUser) {
    addAuditLog({ type:'logout', actor: currentUser.name, role: currentUser.role, target:'-', detail:'用户退出登录' });
  }
  currentUser = null;
  localStorage.removeItem('goldpass-user');
  sessionStorage.removeItem('goldpass-user');
}

// ========== 数据持久化（IndexedDB-like via localStorage） ==========
const DB_KEY = 'goldpass-db-v6';

function getDB() {
  try {
    const s = localStorage.getItem(DB_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return { applications: [], auditLog: [], notifications: [] };
}

function saveDB(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) {}
}

function addApplication(app) {
  const db = getDB();
  app.id = 'GBP-' + Date.now().toString(36).toUpperCase();
  app.createdAt = Date.now();
  app.status = 'pending';
  app.history = [{ time: Date.now(), action: '提交申请', actor: app.applicant }];
  db.applications.push(app);
  saveDB(db);
  return app;
}

function updateApplicationStatus(id, status, actor, comment) {
  const db = getDB();
  const app = db.applications.find(a => a.id === id);
  if (!app) return null;
  app.status = status;
  app.history.push({ time: Date.now(), action: status, actor, comment: comment || '' });
  saveDB(db);
  return app;
}

// ========== 审计日志 ==========
function addAuditLog(entry) {
  const db = getDB();
  entry.id = 'L-' + Date.now().toString(36);
  entry.time = Date.now();
  entry.ip = '192.168.1.' + (Math.floor(Math.random() * 200) + 10);
  db.auditLog.unshift(entry);
  if (db.auditLog.length > 200) db.auditLog = db.auditLog.slice(0, 200);
  saveDB(db);
}

// ========== 消息通知 ==========
function addNotification(notif) {
  const db = getDB();
  notif.id = 'N-' + Date.now().toString(36);
  notif.time = Date.now();
  notif.read = false;
  db.notifications.unshift(notif);
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
  saveDB(db);
  updateNotificationBadge();
}

function getUnreadCount() {
  const db = getDB();
  if (!currentUser) return 0;
  return db.notifications.filter(n => !n.read && (n.to === currentUser.role || n.to === 'all')).length;
}

function updateNotificationBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const n = getUnreadCount();
  badge.textContent = n;
  badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

function markNotificationsRead() {
  const db = getDB();
  db.notifications.forEach(n => n.read = true);
  saveDB(db);
  updateNotificationBadge();
}

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
  // v6: 确保动态页面已注入
  if (typeof ensureAuditPages === 'function') ensureAuditPages();
  showPage(pageId);
  // v6: 渲染审计/通知内容
  if (pageId === 'b-audit' || pageId === 'g-audit') { if(typeof renderAuditList==='function') renderAuditList(); }
  if (pageId === 'b-notif' || pageId === 'g-notif') { if(typeof renderNotifList==='function') renderNotifList(); }
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

// ========== 通关模式切换 ==========
function switchCustomsMode(mode) {
  document.getElementById('cm-tab-elec').classList.toggle('active', mode === 'elec');
  document.getElementById('cm-tab-cross').classList.toggle('active', mode === 'cross');
  document.getElementById('cm-content-elec').classList.toggle('hidden', mode !== 'elec');
  document.getElementById('cm-content-cross').classList.toggle('hidden', mode !== 'cross');
  document.getElementById('mainContent').scrollTop = 0;
}

// ========== 登录逻辑 ==========
function showLogin() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('roleSelect').style.display = 'none';
  document.getElementById('platform').classList.add('hidden');
  initLoginParticles();
}

function skipLogin() {
  // 跳过登录直接进入演示模式
  currentUser = null;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('roleSelect').style.display = '';
}

function quickLogin(email) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPwd').value = 'demo123';
  doLogin({ preventDefault: ()=>{} });
}

function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pwd = document.getElementById('loginPwd').value;
  const remember = document.getElementById('loginRemember').checked;
  const result = loginUser(email, pwd, remember);
  if (!result.ok) {
    document.getElementById('loginError').textContent = result.msg;
    return false;
  }
  document.getElementById('loginError').textContent = '';
  // 登录成功 → 进入对应端口
  document.getElementById('loginScreen').classList.add('hidden');
  // 显示登录成功 toast
  showLoginToast(`欢迎，${result.user.name} (${result.user.org})`);
  // 跳过角色选择，直接进入对应 portal
  document.getElementById('roleSelect').style.display = 'none';
  setTimeout(()=>{
    enterPlatform(result.user.portal);
    // 用真实用户名替换头像
    setTimeout(()=>{
      const avatar = document.getElementById('userAvatar');
      const name = document.getElementById('userName');
      if (avatar) { avatar.textContent = result.user.avatar; avatar.style.background = result.user.color; }
      if (name) name.textContent = `${result.user.name} · ${result.user.org}`;
      updateNotificationBadge();
    }, 100);
  }, 300);
  return false;
}

function showLoginToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1a3a2a,#0f2a1a);color:#34d399;padding:12px 24px;border-radius:8px;border:1px solid rgba(52,211,153,0.3);z-index:99999;font-size:13px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:toastIn 0.4s ease';
  t.innerHTML = '✓ ' + msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

// 登录页粒子背景（简化版）
function initLoginParticles() {
  const canvas = document.getElementById('loginParticles');
  if (!canvas || canvas.dataset.inited) return;
  canvas.dataset.inited = '1';
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 60; i++) {
    particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: 0.5+Math.random()*1.5, vy: -(0.2+Math.random()*0.5), op: Math.random() });
  }
  function tick() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.y += p.vy;
      if (p.y < 0) { p.y = canvas.height; p.x = Math.random()*canvas.width; }
      ctx.fillStyle = `rgba(212,168,66,${p.op*0.4})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();
}

// ========== 启动逻辑：检查是否已登录 ==========
window.addEventListener('load', function() {
  const user = getCurrentUser();
  if (user) {
    // 已登录，自动进入平台
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('roleSelect').style.display = 'none';
    setTimeout(()=>{
      enterPlatform(user.portal);
      setTimeout(()=>{
        const avatar = document.getElementById('userAvatar');
        const name = document.getElementById('userName');
        if (avatar) { avatar.textContent = user.avatar; avatar.style.background = user.color; }
        if (name) name.textContent = `${user.name} · ${user.org}`;
        updateNotificationBadge();
      }, 100);
    }, 100);
  } else {
    // 未登录，显示登录页
    showLogin();
  }
});

// 退出登录（从切换端口扩展）
function doLogout() {
  if (confirm('确认退出登录？')) {
    logoutUser();
    location.reload();
  }
}

// ========== 用户菜单切换 ==========
function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('hidden');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.topbar-user')) {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.add('hidden');
  }
});

function switchPortalView() {
  // 切换端口视图（不退出登录）
  const newPortal = currentPortal === 'business' ? 'gov' : 'business';
  enterPlatform(newPortal);
  if (currentUser) {
    setTimeout(()=>{
      const avatar = document.getElementById('userAvatar');
      const name = document.getElementById('userName');
      if (avatar) { avatar.textContent = currentUser.avatar; avatar.style.background = currentUser.color; }
      if (name) name.textContent = `${currentUser.name} · ${currentUser.org}`;
    }, 100);
  }
  document.getElementById('userDropdown').classList.add('hidden');
}

// ========== 动态注入审计日志与通知页面 ==========
function ensureAuditPages() {
  const main = document.getElementById('mainContent');
  if (!main) return;
  if (!document.getElementById('page-b-audit')) {
    const html = `
    <div class="page" id="page-b-audit">
      ${renderAuditPage('企业服务端','b')}
    </div>
    <div class="page" id="page-g-audit">
      ${renderAuditPage('监管服务端','g')}
    </div>
    <div class="page" id="page-b-notif">
      ${renderNotifPage('企业服务端','b')}
    </div>
    <div class="page" id="page-g-notif">
      ${renderNotifPage('监管服务端','g')}
    </div>`;
    main.insertAdjacentHTML('beforeend', html);
  }
}

function renderAuditPage(prefix, suffix) {
  return `<div class="page-header"><h2>操作日志</h2><div class="breadcrumb">${prefix} / 操作日志</div><div style="margin-left:auto;display:flex;gap:8px;align-items:center;font-size:11px;color:var(--txt3)"><span class="live-dot"></span> 全链路审计追溯</div></div>
  <div class="card" style="background:rgba(91,141,239,0.04);border-left:3px solid var(--blue);padding:12px 16px;font-size:12px;color:var(--txt2);margin-bottom:14px">
    💡 所有关键操作（登录、提交、审批、核销等）自动记录，符合<b>等保三级 8.1.10 安全审计</b>要求；可作为白名单申报、海关核查、合规审计的数据依据。
  </div>
  <div class="filter-bar">
    <select class="filter-select audit-filter-type" data-suffix="${suffix}" onchange="renderAuditList()"><option value="">全部类型</option><option value="login">登录</option><option value="submit">提交</option><option value="approve">审批</option><option value="reject">退回</option><option value="verify">核销</option></select>
    <input class="filter-input audit-filter-kw" data-suffix="${suffix}" placeholder="搜索操作人/业务编号..." oninput="renderAuditList()">
    <button class="btn outline" onclick="exportAudit()">导出 CSV</button>
  </div>
  <div class="card">
    <div class="audit-row" style="background:var(--bg3);font-weight:600;color:var(--txt3);font-size:10px;text-transform:uppercase;letter-spacing:1px"><span>时间</span><span>类型</span><span>操作人</span><span>角色</span><span>详情</span><span>来源IP</span></div>
    <div class="audit-list-container" data-suffix="${suffix}"></div>
  </div>`;
}

function renderNotifPage(prefix, suffix) {
  return `<div class="page-header"><h2>消息通知</h2><div class="breadcrumb">${prefix} / 消息通知</div><div style="margin-left:auto"><button class="btn outline" onclick="markNotificationsRead();renderNotifList()">全部标为已读</button></div></div>
  <div class="card">
    <div class="notif-list-container" data-suffix="${suffix}"></div>
  </div>`;
}

const ROLE_LABELS = {
  'consigner-zhang':'张氏黄金','consigner-shaolong':'少龙国际','hk-trader':'香港众恒隆','processor':'东莞绍隆','platform-admin':'平台管理员',
  'customs-hk':'香港海关','customs-sz':'深圳海关','customs-hp':'黄埔海关·凤岗','-':'-'
};

function renderAuditList() {
  // 找当前激活页面下的审计列表容器
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const list = activePage.querySelector('.audit-list-container');
  if (!list) return;
  const tFilterEl = activePage.querySelector('.audit-filter-type');
  const kwEl = activePage.querySelector('.audit-filter-kw');
  const tFilter = tFilterEl?.value || '';
  const kw = (kwEl?.value || '').toLowerCase();
  const db = getDB();
  let logs = db.auditLog || [];
  if (tFilter) logs = logs.filter(l => l.type === tFilter);
  if (kw) logs = logs.filter(l => (l.actor||'').toLowerCase().includes(kw) || (l.target||'').toLowerCase().includes(kw) || (l.detail||'').toLowerCase().includes(kw));
  if (logs.length === 0) {
    list.innerHTML = '<div class="notif-empty">暂无操作日志（执行一些操作后会显示在这里）</div>';
    return;
  }
  list.innerHTML = logs.map(l => `<div class="audit-row">
    <span class="audit-time">${formatTime(l.time)}</span>
    <span class="audit-type ${l.type}">${typeLabel(l.type)}</span>
    <span>${l.actor||'-'}</span>
    <span style="color:var(--txt3);font-size:10px">${ROLE_LABELS[l.role]||l.role||'-'}</span>
    <span style="font-size:11px;color:var(--txt2)">${l.detail||'-'}${l.target&&l.target!=='-'?' · <span class="mono" style="font-size:10px">'+l.target+'</span>':''}</span>
    <span class="audit-ip">${l.ip||'-'}</span>
  </div>`).join('');
}

function renderNotifList() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const list = activePage.querySelector('.notif-list-container');
  if (!list) return;
  const db = getDB();
  const role = currentUser?.role;
  let notifs = (db.notifications||[]).filter(n => !role || n.to === role || n.to === 'all');
  if (notifs.length === 0) {
    list.innerHTML = '<div class="notif-empty">暂无消息（业务进展会推送通知）</div>';
    return;
  }
  list.innerHTML = notifs.map(n => `<div class="notif-item ${n.read?'':'unread'}" onclick="readNotif('${n.id}')">
    <div class="notif-icon" style="color:${n.color||'var(--gold)'};border:1px solid ${n.color||'var(--gold)'}33">${n.icon||'🔔'}</div>
    <div class="notif-content">
      <div class="notif-title">${n.title}</div>
      <div class="notif-text">${n.text||''}</div>
      <div class="notif-time">${formatTime(n.time)}</div>
    </div>
  </div>`).join('');
}

function readNotif(id) {
  const db = getDB();
  const n = db.notifications.find(x=>x.id===id);
  if (n) { n.read = true; saveDB(db); updateNotificationBadge(); renderNotifList(); }
}

function typeLabel(t) {
  return ({login:'登录',logout:'退出',submit:'提交',approve:'审批',reject:'退回',verify:'核销',other:'其他'})[t]||t;
}

function formatTime(t) {
  const d = new Date(t);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getMonth()+1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function exportAudit() {
  const db = getDB();
  const csv = '时间,类型,操作人,角色,详情,关联,IP\n' + (db.auditLog||[]).map(l=>`${formatTime(l.time)},${typeLabel(l.type)},${l.actor||''},${ROLE_LABELS[l.role]||''},${(l.detail||'').replace(/,/g,'，')},${l.target||''},${l.ip||''}`).join('\n');
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit-log-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ========== 添加菜单项 + showPage 钩子 ==========
const _origShowPage = typeof showPage === 'function' ? showPage : null;
function showPageV6(pageId) {
  ensureAuditPages();
  if (_origShowPage) _origShowPage(pageId);
  if (pageId === 'b-audit' || pageId === 'g-audit') renderAuditList();
  if (pageId === 'b-notif' || pageId === 'g-notif') renderNotifList();
}
window.showPage = showPageV6;

// ========== 申请提交→生成通知给监管员 ==========
const _origSubmitApply = typeof submitApply === 'function' ? submitApply : null;
function submitApplyV6() {
  if (currentUser) {
    // 真实保存到 DB
    const app = addApplication({
      applicant: currentUser.name,
      org: currentUser.org,
      role: currentUser.role,
      type: 'incoming',
      weight: 5,
      target: '99.99%',
      factory: '东莞绍隆实业',
    });
    addAuditLog({ type:'submit', actor:currentUser.name, role:currentUser.role, target:app.id, detail:'提交保税加工申请 5kg'});
    // 通知所有海关监管员
    ['customs-hk','customs-sz','customs-hp'].forEach(role => {
      addNotification({ to:role, icon:'📥', color:'#5b8def', title:'新业务待审批', text:`${currentUser.org} 提交了 ${app.id} 5kg 来料加工申请，请尽快审批。` });
    });
    showLoginToast('✓ 申请已提交，海关已收到通知');
  }
  if (_origSubmitApply) _origSubmitApply();
}
window.submitApply = submitApplyV6;

// ========== 审批→通知申请人 ==========
const _origApproveSuccess = typeof approveSuccess === 'function' ? approveSuccess : null;
function approveSuccessV6() {
  if (currentUser) {
    addAuditLog({ type:'approve', actor:currentUser.name, role:currentUser.role, target:'GBP-2026-0093', detail:'审批通过：张氏黄金 250kg 来料加工申请'});
    addNotification({ to:'consigner-zhang', icon:'✅', color:'#34d399', title:'申请已通过审批', text:`您的业务 GBP-2026-0093 已由 ${currentUser.org} 审批通过。`});
  }
  if (_origApproveSuccess) _origApproveSuccess();
}
window.approveSuccess = approveSuccessV6;
