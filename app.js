const API_URL = 'https://script.google.com/macros/s/AKfycbw64CXChOxieAaDbfSrqffToA1Io061xC2zLlMibrVvGm3L8OWCB3dJe2n67wOSv2rp/exec';

let appState = {
  settings: [],
  teams: [],
  competitions: [],
  matches: [],
  standings: []
};

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initModal();
  initFilters();
  loadData();
});

function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      
      const targetView = e.target.dataset.view;
      e.target.classList.add('active');
      document.getElementById(`${targetView}View`).classList.add('active');
    });
  });

  document.getElementById('btnRefresh').addEventListener('click', () => loadData());
}

function initModal() {
  const dialog = document.getElementById('judgeDialog');
  document.getElementById('openJudgeModal').addEventListener('click', () => {
    populateJudgeMatchSelect();
    dialog.showModal();
  });
  document.getElementById('closeModal').addEventListener('click', () => dialog.close());

  document.getElementById('judgeMatchSelect').addEventListener('change', updateJudgeModalLabels);
  
  document.getElementById('btnSetLive').addEventListener('click', () => handleMatchAction('setLive'));
  document.getElementById('judgeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleMatchAction('saveResult');
  });
}

function initFilters() {
  ['compFilter', 'dateFilter', 'statusFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderAllViews);
  });
}

async function loadData() {
  try {
    const res = await fetch(`${API_URL}?action=bootstrap&t=${Date.now()}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || 'โหลดข้อมูลไม่สำเร็จ');

    appState.settings = json.settings || [];
    appState.teams = json.teams || [];
    appState.competitions = json.competitions || [];
    appState.matches = json.matches || [];
    appState.standings = json.standings || [];

    updateUI();
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ' + err.message);
  }
}

function updateUI() {
  const eventName = appState.settings.find(s => s.key === 'eventName')?.value || 'การแข่งขันกีฬาเครือข่ายดอยเต่า';
  document.getElementById('eventName').textContent = eventName;
  document.getElementById('lastUpdated').textContent = 'อัปเดตล่าสุด: ' + new Date().toLocaleTimeString('th-TH');

  // Stats
  document.getElementById('statCompetitions').textContent = appState.competitions.length;
  document.getElementById('statMatches').textContent = appState.matches.length;
  document.getElementById('statFinished').textContent = appState.matches.filter(m => m.status === 'finished').length;

  populateDropdowns();
  renderAllViews();
}

function populateDropdowns() {
  const compSelect = document.getElementById('compFilter');
  const currentComp = compSelect.value;
  compSelect.innerHTML = '<option value="">-- ทุกประเภทกีฬา --</option>' + 
    appState.competitions.map(c => `<option value="${c.id}">${c.sport} (${c.category})</option>`).join('');
  compSelect.value = currentComp;

  const dates = [...new Set(appState.matches.map(m => m.date).filter(Boolean))];
  const dateSelect = document.getElementById('dateFilter');
  const currentDate = dateSelect.value;
  dateSelect.innerHTML = '<option value="">-- ทุกวัน --</option>' + 
    dates.map(d => `<option value="${d}">${d}</option>`).join('');
  dateSelect.value = currentDate;
}

function renderAllViews() {
  renderSchedule();
  renderResults();
  renderStandings();
  renderBrackets();
}

function getFilteredMatches() {
  const compId = document.getElementById('compFilter').value;
  const date = document.getElementById('dateFilter').value;
  const status = document.getElementById('statusFilter').value;

  return appState.matches.filter(m => {
    return (!compId || m.competitionId === compId) &&
           (!date || m.date === date) &&
           (!status || m.status === status);
  });
}

function getTeamName(teamId, fallback) {
  if (!teamId) return fallback || 'รอผลการแข่งขัน';
  const team = appState.teams.find(t => t.id === teamId);
  return team ? team.name : (fallback || teamId);
}

function getCompName(compId) {
  const c = appState.competitions.find(x => x.id === compId);
  return c ? `${c.sport} (${c.category})` : compId;
}

function matchCardHTML(m) {
  const tA = getTeamName(m.teamAId, m.teamASource);
  const tB = getTeamName(m.teamBId, m.teamBSource);
  const scoreA = (m.scoreA !== '' && m.scoreA !== null) ? m.scoreA : '-';
  const scoreB = (m.scoreB !== '' && m.scoreB !== null) ? m.scoreB : '-';
  
  const isFinished = m.status === 'finished';
  const aWin = isFinished && Number(m.scoreA) > Number(m.scoreB);
  const bWin = isFinished && Number(m.scoreB) > Number(m.scoreA);

  const statusText = { scheduled: 'ยังไม่แข่ง', live: 'กำลังแข่ง 🟢', finished: 'จบการแข่งขัน' }[m.status] || m.status;

  return `
    <div class="match-card ${m.status}">
      <div class="match-header-info">
        <span class="match-sport-tag">${getCompName(m.competitionId)}</span>
        <span>คู่ที่ ${m.matchNo} · ${m.round}</span>
      </div>
      <div class="match-teams-box">
        <div class="team-row ${aWin ? 'winner' : ''}">
          <span>${tA}</span>
          <span class="team-score-num">${scoreA}</span>
        </div>
        <div class="team-row ${bWin ? 'winner' : ''}">
          <span>${tB}</span>
          <span class="team-score-num">${scoreB}</span>
        </div>
      </div>
      <div class="match-footer-info">
        <span>📅 ${m.date || '-'} ⏰ ${m.time || '-'} น. (${m.venue || '-'})</span>
        <span class="status-pill ${m.status}">${statusText}</span>
      </div>
    </div>
  `;
}

function renderSchedule() {
  const matches = getFilteredMatches();
  document.getElementById('scheduleCount').textContent = matches.length + ' คู่';
  const list = document.getElementById('scheduleList');
  list.innerHTML = matches.length ? matches.map(matchCardHTML).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">ไม่พบรายการแข่งขันตามเงื่อนไข</p>';
}

function renderResults() {
  const matches = getFilteredMatches().filter(m => m.status === 'finished');
  document.getElementById('resultsCount').textContent = matches.length + ' คู่';
  const list = document.getElementById('resultsList');
  list.innerHTML = matches.length ? matches.map(matchCardHTML).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">ยังไม่มีผลการแข่งขันที่เสร็จสิ้น</p>';
}

function renderStandings() {
  const compId = document.getElementById('compFilter').value;
  const filtered = appState.standings.filter(s => !compId || s.competitionId === compId);
  const container = document.getElementById('standingsContainer');

  if (!filtered.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">ไม่มีข้อมูลตารางคะแนนในประเภทนี้</p>';
    return;
  }

  container.innerHTML = filtered.map(group => {
    const compName = getCompName(group.competitionId);
    return `
      <div class="standings-group-box">
        <h3 class="standings-group-title">🏆 ${compName} — สาย ${group.groupName}</h3>
        <div class="table-responsive">
          <table class="styled-table">
            <thead>
              <tr>
                <th>อันดับ</th>
                <th>ทีมโรงเรียน</th>
                <th>แข่ง</th>
                <th>ชนะ</th>
                <th>เสมอ</th>
                <th>แพ้</th>
                <th>ได้</th>
                <th>เสีย</th>
                <th>ผลต่าง</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              ${group.standings.map(row => `
                <tr>
                  <td><strong>#${row.rank}</strong></td>
                  <td>${row.teamName}</td>
                  <td>${row.played}</td>
                  <td>${row.won}</td>
                  <td>${row.drawn}</td>
                  <td>${row.lost}</td>
                  <td>${row.scoreFor}</td>
                  <td>${row.scoreAgainst}</td>
                  <td>${row.difference > 0 ? '+' + row.difference : row.difference}</td>
                  <td><strong>${row.points}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function renderBrackets() {
  const compId = document.getElementById('compFilter').value;
  const comps = appState.competitions.filter(c => (!compId || c.id === compId) && c.format.includes('รอบแพ้คัดออก'));
  const container = document.getElementById('bracketContainer');

  if (!comps.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">ไม่มีผังสายการแข่งขันในประเภทนี้</p>';
    return;
  }

  container.innerHTML = comps.map(comp => {
    const matches = appState.matches.filter(m => m.competitionId === comp.id);
    const semis = matches.filter(m => m.round.includes('รอบรอง') || m.round.includes('รอบก่อนรอง'));
    const thirds = matches.filter(m => m.round.includes('ชิงอันดับ 3'));
    const finals = matches.filter(m => m.round.includes('ชิงชนะเลิศ'));

    const renderCol = (items) => items.map(m => `
      <div class="bracket-match-item">
        <span class="bracket-match-no">คู่ที่ ${m.matchNo} · ${m.round}</span>
        <div class="bracket-team-line">
          <span>${getTeamName(m.teamAId, m.teamASource)}</span>
          <strong>${m.scoreA ?? '-'}</strong>
        </div>
        <div class="bracket-team-line">
          <span>${getTeamName(m.teamBId, m.teamBSource)}</span>
          <strong>${m.scoreB ?? '-'}</strong>
        </div>
      </div>
    `).join('') || '<p style="font-size:12px;color:var(--text-muted);">ไม่มีข้อมูล</p>';

    return `
      <div class="bracket-sport-box">
        <h3>🏅 ${comp.sport} (${comp.category})</h3>
        <div class="bracket-columns">
          <div>
            <div class="bracket-col-title">รอบก่อนรอง / รองชนะเลิศ</div>
            ${renderCol(semis)}
          </div>
          <div>
            <div class="bracket-col-title">ชิงอันดับ 3</div>
            ${renderCol(thirds)}
          </div>
          <div>
            <div class="bracket-col-title">ชิงชนะเลิศ</div>
            ${renderCol(finals)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populateJudgeMatchSelect() {
  const select = document.getElementById('judgeMatchSelect');
  const available = appState.matches.filter(m => m.teamAId && m.teamBId);
  select.innerHTML = available.map(m => `
    <option value="${m.id}">
      [${getCompName(m.competitionId)}] คู่ ${m.matchNo} : ${getTeamName(m.teamAId)} vs ${getTeamName(m.teamBId)} (${m.status})
    </option>
  `).join('');
  updateJudgeModalLabels();
}

function updateJudgeModalLabels() {
  const matchId = document.getElementById('judgeMatchSelect').value;
  const match = appState.matches.find(m => m.id === matchId);
  if (!match) return;

  document.getElementById('labelTeamA').textContent = getTeamName(match.teamAId, match.teamASource);
  document.getElementById('labelTeamB').textContent = getTeamName(match.teamBId, match.teamBSource);
  document.getElementById('scoreA').value = match.scoreA !== '' ? match.scoreA : 0;
  document.getElementById('scoreB').value = match.scoreB !== '' ? match.scoreB : 0;
}

async function handleMatchAction(actionType) {
  const matchId = document.getElementById('judgeMatchSelect').value;
  const judgeCode = document.getElementById('judgeCode').value;
  const judgeName = document.getElementById('judgeName').value;
  const scoreA = document.getElementById('scoreA').value;
  const scoreB = document.getElementById('scoreB').value;
  const note = document.getElementById('judgeNote').value;
  const msgEl = document.getElementById('modalMessage');

  if (!judgeCode || !judgeName) {
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = 'กรุณากรอกรหัสผ่านและชื่อกรรมการให้ครบถ้วน';
    return;
  }

  msgEl.style.color = 'var(--text-muted)';
  msgEl.textContent = 'กำลังบันทึกข้อมูล...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: actionType,
        matchId,
        judgeCode,
        judgeName,
        scoreA,
        scoreB,
        note
      })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    msgEl.style.color = 'var(--success)';
    msgEl.textContent = json.message;
    
    await loadData();
    setTimeout(() => {
      document.getElementById('judgeDialog').close();
      msgEl.textContent = '';
    }, 1200);
  } catch (err) {
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = 'ผิดพลาด: ' + err.message;
  }
}
