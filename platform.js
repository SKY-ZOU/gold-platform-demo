// ============================================
// 大湾区跨境黄金保税加工智慧监管服务平台 v2.0
// To B + To G 双端协同演示
// ============================================

let currentPortal = 'business'; // 'business' | 'gov'

// === 角色选择 ===
function enterPlatform(role) {
    currentPortal = role;
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
        name.textContent = '黄埔海关监管员';
        document.getElementById('menuBusiness').classList.add('hidden');
        document.getElementById('menuGov').classList.remove('hidden');
        showPage('g-dashboard');
    }
}

function showRoleSelect() {
    document.getElementById('roleSelect').classList.remove('hidden');
    document.getElementById('platform').classList.add('hidden');
}

// === 侧边栏 ===
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

// === 导航 ===
function navigateTo(el) {
    const page = el.dataset.page;
    // 更新菜单激活状态
    const menu = currentPortal === 'business' ? 'menuBusiness' : 'menuGov';
    document.querySelectorAll('#' + menu + ' .menu-item').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    showPage(page);
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
}

// === 表单提交 ===
function submitApply() {
    showToast('申请信息已保存，请继续上传单证材料');
    // 更新步骤条
    const steps = document.querySelectorAll('.step-item');
    const lines = document.querySelectorAll('.step-line');
    if (steps[2]) {
        steps[2].classList.add('active');
        lines[1].classList.add('done');
    }
}

// === 审批 ===
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

// === Toast ===
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// === 类型选择 ===
document.addEventListener('click', function(e) {
    const opt = e.target.closest('.type-option');
    if (opt) {
        document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
    }
});

// === 金价模拟 ===
setInterval(() => {
    const el = document.querySelector('.price-value');
    if (!el) return;
    const base = 2347.80;
    const change = (Math.random() - 0.5) * 5;
    const price = base + change;
    el.textContent = '$' + price.toFixed(2);
    const changeEl = document.querySelector('.price-change');
    const pct = (change / base * 100).toFixed(2);
    if (change >= 0) {
        changeEl.textContent = '+' + pct + '%';
        changeEl.className = 'price-change up';
    } else {
        changeEl.textContent = pct + '%';
        changeEl.className = 'price-change down';
    }
}, 5000);
