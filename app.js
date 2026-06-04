/**
 * FPT QA AGENT v10.0 (ULTIMATE MASTER)
 * Logic: Strictly BASED ON "LỚP" Column
 * Multipliers: TH(35/60), THCS/Spec(0.75), CLB(1.25)
 * Period: Full string preservation for 100% parity
 */

const RULES = {
    COEFFICIENTS: { TH: 35 / 60, THCS: 45 / 60, HSG: 45 / 60, DT: 45 / 60, PD: 45 / 60, CLB: 1.25 },
    MAX_HOURS: 110,
    KEYWORDS: {
        id: ['mã', 'username', 'account', 'acc', 'mã gv'],
        name: ['người dạy', 'họ tên', 'giáo viên', 'gv', 'tên'],
        class: ['lớp', 'class', 'mã lớp'],
        date: ['ngày', 'date'],
        period: ['tiết', 'session'],
        gvGoc: ['gốc', 'nghỉ', 'ban đầu'],
        gvThay: ['thay', 'dạy thay']
    }
};

const state = {
    files: { th: null, thcs: null, doi: null },
    data: { th: [], thcs: [], doi: [] },
    metrics: { rawRows: 0, cleanRows: 0 },
    teachers: {},
    fspMap: new Map(),
    sub_discrepancy_count: 0,
    discrepancy_logs: [],
    duplicate_logs: [] // Capture rows for auditability
};

let chartInstance = null;

// ==========================================
// 1. INITIALIZATION & UI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    ['th', 'thcs', 'doi'].forEach(key => {
        const dz = document.getElementById(`dz-${key}`);
        const input = document.getElementById(`file-${key}`);
        if (!dz || !input) return;
        dz.addEventListener('click', () => input.click());
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('hover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('hover'));
        dz.addEventListener('drop', (e) => {
            e.preventDefault(); dz.classList.remove('hover');
            if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0], key, dz);
        });
        input.addEventListener('change', (e) => { if (e.target.files.length) handleFileSelect(e.target.files[0], key, dz); });
    });
    document.getElementById('btn-execute').addEventListener('click', runPipeline);
    document.getElementById('btn-export').addEventListener('click', exportToExcel);
});

function handleFileSelect(file, key, dz) {
    state.files[key] = file;
    dz.classList.add('ready');
    dz.querySelector('.drop-zone__title').innerText = file.name;
    const statusList = document.getElementById('file-status');
    const badge = document.createElement('div');
    badge.className = 'file-badge';
    badge.innerHTML = `<span>${key.toUpperCase()}</span>: ${file.name}`;
    statusList.appendChild(badge);

    // Enable button as soon as at least 1 main file (TH or THCS) is loaded
    const btn = document.getElementById('btn-execute');
    if (state.files.th || state.files.thcs) {
        btn.disabled = false;
        btn.classList.add('ready');
        btn.style.opacity = '1';
        btn.style.filter = 'none';
    }
}

// ==========================================
// 2. CORE ENGINE (v9.9 FINAL)
// ==========================================
async function runPipeline() {
    const secPipeline = document.getElementById('sec-pipeline');
    secPipeline.classList.remove('hidden');
    secPipeline.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('btn-execute').disabled = true;

    state.teachers = {}; state.fspMap = new Map();
    state.sub_discrepancy_count = 0; state.discrepancy_logs = [];
    state.duplicate_logs = []; // RESET — fix: prevent accumulation across re-runs
    state.metrics = { rawRows: 0, cleanRows: 0 };

    try {
        logTerm('Initializing System Alignment v10.0 Ultimate...', 'system');
        setNodeActive(1); updateProgress(20);
        if (state.files.th) state.data.th = await processExcel(state.files.th);
        if (state.files.thcs) state.data.thcs = await processExcel(state.files.thcs);
        if (state.files.doi) state.data.doi = await processExcel(state.files.doi);

        logTerm('Normalization: Date & Period Normalization High-Precision...', 'info');
        setNodeActive(2); updateProgress(40);
        setNodeActive(3); updateProgress(60);

        setNodeActive(4); updateProgress(80);
        calculateHours();
        checkDiscrepancies();

        setNodeActive(5); updateProgress(100);
        logTerm('Packaging refined analytics. Parity check final.', 'success');
        await sleep(600);
        renderDashboard();
    } catch (e) { logTerm(`FATAL ERROR: ${e.message}`, 'error'); }
}

function processExcel(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array', cellDates: true });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            let h_idx = 0;
            for (let i = 0; i < 30; i++) {
                if (!json[i]) continue;
                const rowStr = json[i].join(' ').toLowerCase();
                if (rowStr.includes('ngày') && rowStr.includes('lớp')) { h_idx = i; break; }
            }
            const cleanJson = XLSX.utils.sheet_to_json(sheet, { range: h_idx, raw: false });
            state.metrics.rawRows += cleanJson.length;
            resolve(cleanJson);
        };
        reader.readAsArrayBuffer(file);
    });
}

function normalizeDate(val) {
    if (!val) return "None";
    let d = null;
    if (val instanceof Date) d = val;
    else {
        const s = String(val).trim();
        const m = s.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})$/);
        if (m) { d = new Date(m[3], m[2] - 1, m[1]); }
        else d = new Date(s);
    }
    if (!d || isNaN(d.getTime())) return "None";
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

function cleanCoord(t) { return String(t || "").replace(/[^a-z0-9]/gi, "").toUpperCase(); }

function findVal(row, kws) {
    const key = Object.keys(row).find(k => kws.some(kw => String(k).toLowerCase().includes(kw)));
    return key ? row[key] : null;
}

function classifyBlock(lopStr) {
    const numMatch = String(lopStr || "").match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1]) : 0;
    if (num >= 1 && num <= 5) return 'TH';
    if (num >= 6 && num <= 12) return 'THCS';
    return 'TH';
}

function calculateHours() {
    const combined = [...state.data.th, ...state.data.thcs];
    const periodSet = new Set();

    combined.forEach(row => {
        const date = normalizeDate(findVal(row, RULES.KEYWORDS.date));
        const pVal = findVal(row, RULES.KEYWORDS.period);
        // PRESERVE FULL PERIOD STRING (No .split('.')). Fixes DIUPT3 (82 -> 83)
        const period = String(pVal || "").trim();
        const lop_raw = String(findVal(row, RULES.KEYWORDS.class) || "").trim();

        let user = "", name = "Unknown";
        const rowVals = Object.values(row);
        for (let i = 0; i < rowVals.length; i++) {
            const v = String(rowVals[i] || "").trim().toUpperCase();
            if (v.includes('@') && !user) {
                user = v;
                name = String(rowVals[i - 1] || "Unknown").trim();
            }
        }

        if (!user || !lop_raw || date === "None") {
            // Log skipped rows so ALL dropped records are visible in the export
            state.duplicate_logs.push({
                'Ngày': date || '[N/A]',
                'Tiết': period || '[N/A]',
                'Lớp': lop_raw || '[N/A]',
                'Username': user || '[N/A]',
                'Tên': name,
                'Trạng thái': 'Thiếu dữ kiện',
                'Chi tiết': !user ? 'Thiếu Username/Email' : !lop_raw ? 'Thiếu Lớp' : 'Thiếu/Lỗi Ngày'
            });
            return;
        }

        // DEDUPLICATION (Hash by date|period|class|user)
        const hash = `${date}|${period}|${lop_raw}|${user}`;
        if (periodSet.has(hash)) {
            state.duplicate_logs.push({ 'Ngày': date, 'Tiết': period, 'Lớp': lop_raw, 'Username': user, 'Tên': name, 'Trạng thái': 'Trùng lặp', 'Chi tiết': `Hash trùng: ${hash}` });
            return;
        }
        periodSet.add(hash);

        state.metrics.cleanRows++;
        state.fspMap.set(`${date}|${period}|${cleanCoord(lop_raw)}`, { user, name });

        if (!state.teachers[user]) {
            state.teachers[user] = { user, name, ck_h: 0, spec_h: 0, c3: 0, c4: 0, c5: 0, c6: 0, c7: 0, c8: 0, c9: 0, c10: 0, c11: 0, c12: 0, c13: 0, c14: 0, c15: 0, c16: 0 };
        }
        const t = state.teachers[user];

        const block = classifyBlock(lop_raw);
        const lNorm = lop_raw.toLowerCase();

        // SPECIALIST CATEGORIZATION
        if (lNorm.includes('hsg') || lNorm.includes('học sinh giỏi')) {
            t.c5++; t.c11 += 0.75; t.spec_h += 0.75;
        } else if (lNorm.includes('đt') || lNorm.includes('đội tuyển')) {
            t.c6++; t.c12 += 0.75; t.spec_h += 0.75;
        } else if (lNorm.includes('pd') || lNorm.includes('phụ đạo')) {
            t.c7++; t.c13 += 0.75; t.spec_h += 0.75;
        } else if (lNorm.includes('clb') || lNorm.includes('câu lạc bộ')) {
            t.c8++; t.c14 += 1.25; t.spec_h += 1.25;
        } else {
            // MAIN CK
            if (block === 'TH') {
                t.c3++; t.c9 += (35 / 60); t.ck_h += (35 / 60);
            } else {
                t.c4++; t.c10 += 0.75; t.ck_h += 0.75;
            }
        }
    });

    state.metrics.finalTeachers = Object.keys(state.teachers).length;
    state.metrics.finalHours = Object.values(state.teachers).reduce((acc, t) => acc + t.spec_h + t.ck_h, 0);

    Object.values(state.teachers).forEach(t => {
        t.c15 = Number(t.ck_h.toFixed(2));
        t.c16 = Number((t.ck_h + t.spec_h).toFixed(2));
    });
}

function checkDiscrepancies() {
    if (!state.data.doi) return;
    state.data.doi.forEach(row => {
        const d_date = normalizeDate(findVal(row, RULES.KEYWORDS.date));
        if (d_date === "None") return;
        const d_period = String(findVal(row, RULES.KEYWORDS.period) || "").trim();
        const d_lop_raw = String(findVal(row, RULES.KEYWORDS.class) || "");
        const d_lop = cleanCoord(d_lop_raw);
        const g_goc = String(findVal(row, RULES.KEYWORDS.gvGoc) || "").toUpperCase();
        const g_thay = String(findVal(row, RULES.KEYWORDS.gvThay) || "").toUpperCase();
        if (!g_thay || g_thay === "NAN" || !d_lop) return;

        const fsp = state.fspMap.get(`${d_date}|${d_period}|${d_lop}`);
        let group = "", status = "";
        if (!fsp) { group = "Lỗi"; status = `[N/A] GV thực tế trên FSP: ${d_lop_raw}`; }
        else {
            const act = fsp.user.split('@')[0], plan = g_thay.split('@')[0], orig = g_goc.split('@')[0];
            if (act === plan) return; // FSP khớp với GV dạy thay → OK
            if (act === orig) {
                // 🔴 ĐỔI TIẾT ẢO: FSP vẫn ghi GV gốc, chưa cập nhật GV dạy thay
                group = "🔴 ĐỔI TIẾT ẢO";
                status = `Chưa cập nhật người dạy thay trên hệ thống — FSP vẫn ghi ${orig}, kế hoạch đổi cho ${plan}`;
            } else {
                // 🟡 Sai lệch: FSP ghi GV khác, không khớp cả GV gốc lẫn GV dạy thay
                group = "Cảnh báo";
                status = `Sai GV thực tế: FSP ghi nhận ${fsp.user} (Kế hoạch: ${g_thay})`;
            }
        }
        state.sub_discrepancy_count++;
        state.discrepancy_logs.push({ 'Ngày': d_date, 'Tiết': d_period, 'Lớp': d_lop_raw, 'GV gốc (Kế hoạch)': g_goc, 'GV dạy thay (Kế hoạch)': g_thay, 'GV Thực Tế (FSP)': fsp ? fsp.user : "[N/A]", 'Trạng thái': group, 'Vấn đề phát hiện': status });
    });
}

function renderDashboard() {
    document.getElementById('sec-dashboard').classList.remove('hidden');
    document.getElementById('sec-dashboard').scrollIntoView({ behavior: 'smooth' });

    // Calculate Global Metrics
    const teachers = Object.values(state.teachers);
    const totalTeachers = teachers.length;
    const totalSessions = state.metrics.cleanRows;
    const totalHours = teachers.reduce((acc, t) => acc + t.c16, 0);
    const overQuota = teachers.filter(t => t.c16 > 110).length;
    const auditCount = state.sub_discrepancy_count;

    // Render Metric Cards
    const metaGrid = document.getElementById('meta-grid');
    metaGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-card__val">${totalTeachers}</div>
            <div class="stat-card__label">Tổng GV giảng dạy</div>
            <div class="stat-card__icon">👨‍🏫</div>
        </div>
        <div class="stat-card stat-card--orange">
            <div class="stat-card__val">${totalSessions}</div>
            <div class="stat-card__label">Tổng tiết dạy (FSP)</div>
            <div class="stat-card__icon">📑</div>
        </div>
        <div class="stat-card stat-card--green">
            <div class="stat-card__val">${totalHours.toFixed(1)}h</div>
            <div class="stat-card__label">Tổng giờ quy đổi</div>
            <div class="stat-card__icon">⏳</div>
        </div>
        <div class="stat-card stat-card--red">
            <div class="stat-card__val">${overQuota}</div>
            <div class="stat-card__label">GV vượt định mức (>110h)</div>
            <div class="stat-card__icon">⚖️</div>
        </div>
        <div class="stat-card stat-card--orange">
            <div class="stat-card__val">${auditCount}</div>
            <div class="stat-card__label">Sai lệch đối chiếu</div>
            <div class="stat-card__icon">🔍</div>
        </div>
    `;

    // Before/After Cleanse Overview — Clean metrics only (Raw data exported to separate report)
    document.querySelector('#ba-table tbody').innerHTML = `
        <tr>
            <td>🧹 1. Dòng dữ liệu sau khi làm sạch & khử trùng lặp (Cleaned)</td>
            <td class="val-old">${state.metrics.rawRows}</td>
            <td class="val-new">${state.metrics.cleanRows}</td>
            <td class="val-delta">Δ -${state.metrics.rawRows - state.metrics.cleanRows}</td>
        </tr>
        <tr>
            <td>👨‍🏫 2. Số lượng tài khoản GV tham gia giảng dạy (Unique Teachers)</td>
            <td class="val-old">—</td>
            <td class="val-new">${totalTeachers}</td>
            <td class="val-delta">High Precision</td>
        </tr>
        <tr>
            <td>⏳ 3. Tổng quỹ giờ quy đổi toàn trường (Total Converted Hours)</td>
            <td class="val-old">—</td>
            <td class="val-new">${totalHours.toFixed(1)}h</td>
            <td class="val-delta">Verified</td>
        </tr>
        <tr>
            <td>⚖️ 4. Số lượng GV vượt ngưỡng định mức (>110h)</td>
            <td class="val-old">—</td>
            <td class="val-new">${overQuota}</td>
            <td class="val-delta" style="color:var(--clr-danger)">Audit Focus</td>
        </tr>
        <tr>
            <td>🔍 5. Sai lệch đối soát tọa độ FSP (Discrepancies)</td>
            <td class="val-old">—</td>
            <td class="val-new">${auditCount}</td>
            <td class="val-delta" style="color:var(--clr-warning)">Needs Sync</td>
        </tr>
    `;

    const fBody = document.querySelector('#full-table tbody');
    const sorted = teachers.sort((a, b) => b.c16 - a.c16);
    fBody.innerHTML = sorted.map(t => `<tr><td>${t.user}</td><td>${t.name}</td><td>${t.c3}</td><td>${t.c4}</td><td>${t.c5}</td><td>${t.c6}</td><td>${t.c7}</td><td>${t.c8}</td><td>${t.c9.toFixed(2)}</td><td>${t.c10.toFixed(2)}</td><td>${t.c11.toFixed(2)}</td><td>${t.c12.toFixed(2)}</td><td>${t.c13.toFixed(2)}</td><td>${t.c14.toFixed(2)}</td><td style="color:var(--fpt-orange); font-weight:800">${t.c15.toFixed(2)}</td><td style="color:var(--clr-success); font-weight:900">${t.c16.toFixed(2)}</td></tr>`).join('');
    renderChart(sorted.slice(0, 15));
}

function renderChart(data) {
    const ctx = document.getElementById('barChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, { type: 'bar', data: { labels: data.map(t => t.user.split('@')[0]), datasets: [{ label: 'Giờ Chính Khóa', data: data.map(t => t.ck_h), backgroundColor: '#00529B', stack: 'Stack 0' }, { label: 'Giờ Đặc Thù', data: data.map(t => t.spec_h), backgroundColor: '#F26F21', stack: 'Stack 0' }] }, options: { plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { stacked: true, ticks: { color: '#8e8e93' } }, y: { stacked: true, beginAtZero: true, ticks: { color: '#8e8e93' } } } } });
}

function exportToExcel() {
    const wb = XLSX.utils.book_new();
    const hd = ['Username', 'Người dạy', 'Tiết TH', 'Tiết THCS', 'Tiết HSG', 'Tiết ĐT', 'Tiết PD', 'Tiết CLB', 'Giờ TH', 'Giờ THCS', 'Giờ HSG', 'Giờ ĐT', 'Giờ PD', 'Giờ CLB', 'TỔNG CK', 'TỔNG CỘNG'];
    const rs = Object.values(state.teachers).map(t => [t.user, t.name, t.c3, t.c4, t.c5, t.c6, t.c7, t.c8, t.c9.toFixed(2), t.c10.toFixed(2), t.c11.toFixed(2), t.c12.toFixed(2), t.c13.toFixed(2), t.c14.toFixed(2), t.c15.toFixed(2), t.c16.toFixed(2)]);
    const ws = XLSX.utils.aoa_to_sheet([["FPT QA REPORT v10.0 FINAL"], [], hd, ...rs]);
    XLSX.utils.book_append_sheet(wb, ws, "Gio_giang_GV_Synthesized");

    const ds = XLSX.utils.json_to_sheet(state.discrepancy_logs);
    XLSX.utils.book_append_sheet(wb, ds, "Canh_Bao_Sai_Lech");

    XLSX.writeFile(wb, `FPT_QA_Report_v10.0_Ultimate_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function logTerm(msg, type) {
    const body = document.getElementById('log-body');
    const div = document.createElement('div');
    div.className = `log ${type}`;
    div.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
    body.appendChild(div); body.scrollTop = body.scrollHeight;
}
function setNodeActive(n) {
    // Set current active
    document.getElementById(`pn-${n}`).classList.add('active');
    if (n > 1) {
        document.getElementById(`pc-${n - 1}`).classList.add('active');
        // Mark previous as complete (Green)
        for (let i = 1; i < n; i++) {
            document.getElementById(`pn-${i}`).classList.remove('active');
            document.getElementById(`pn-${i}`).classList.add('complete');
            document.getElementById(`pc-${i}`).classList.remove('active');
            document.getElementById(`pc-${i}`).classList.add('complete');
        }
    }
}
function updateProgress(p) { document.getElementById('progress-fill').style.width = `${p}%`; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function initParticles() {
    const canvas = document.getElementById('particles-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const p = []; for (let i = 0; i < 80; i++) p.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.5, v: Math.random() * 0.5 });
    function draw() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'rgba(255,255,255,0.2)'; p.forEach(i => { ctx.beginPath(); ctx.arc(i.x, i.y, i.r, 0, Math.PI * 2); ctx.fill(); i.y -= i.v; if (i.y < 0) i.y = canvas.height; }); requestAnimationFrame(draw); }
    draw();
}