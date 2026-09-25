const API_URL = 'PUT_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

const state = {
  settings: [],
  teams: [],
  competitions: [],
  matches: []
};

const $ = (selector) => document.querySelector(selector);

function valueOfSetting(key) {
  const row = state.settings.find(item => item.key === key);
  return row ? row.value : '';
}

function teamName(teamId, fallback = '') {
  if (!teamId) return fallback || 'รอผลการแข่งขัน';
  const team = state.teams.find(item => item.id === teamId);
  return team ? team.name : fallback || 'รอผลการแข่งขัน';
}

function competitionName(id) {
  const item = state.competitions.find(comp => comp.id === id);
  return item ? `${item.sport} ${item.category}` : id;
}

function statusText(status) {
  return {
    scheduled: 'ยังไม่แข่ง',
    live: 'กำลังแข่ง',
    finished: 'จบการแข่งขัน',
    postponed: 'เลื่อนแข่งขัน'
  }[status] || 'ยังไม่แข่ง';
}

function getFilteredMatches() {
  const competitionId = $('#competitionFilter').value;
  const date = $('#dateFilter').value;
  const status = $('#statusFilter').value;

  return state.matches.filter(match => {
    return (!competitionId || match.competitionId === competitionId) &&
      (!date || match.date === date) &&
      (!status || match.status === status);
  });
}

function matchCard(match) {
  const scoreA = match.scoreA === '' || match.scoreA === null ? '–' : match.scoreA;
  const scoreB = match.scoreB === '' || match.scoreB === null ? '–' : match.scoreB;
  const teamA = teamName(match.teamAId, match.teamASource);
  const teamB = teamName(match.teamBId, match.teamBSource);
  const aWinner = match.winnerId && match.winnerId === match.teamAId ? 'winner' : '';
  const bWinner = match.winnerId && match.winnerId === match.teamBId ? 'winner' : '';

  return `
    <article class="match-card ${match.status}">
      <div class="match-meta">
        <strong>${competitionName(match.competitionId)}</strong>
        คู่ที่ ${match.matchNo} · ${match.round}<br>
        ${match.date || 'ไม่ระบุวัน'} ${match.time ? `· ${match.time} น.` : ''}
      </div>
      <div class="teams">
        <div class="team-line ${aWinner}">
          <span class="team-name">${teamA}</span>
          <strong class="team-score">${scoreA}</strong>
        </div>
        <div class="team-line ${bWinner}">
          <span class="team-name">${teamB}</span>
          <strong class="team-score">${scoreB}</strong>
        </div>
      </div>
      <span class="status ${match.status}">${statusText(match.status)}</span>
    </article>
  `;
}

function renderSchedule() {
  const matches = getFilteredMatches()
    .sort((a, b) => `${a.date}-${a.time}-${a.competitionId}-${a.matchNo}`
      .localeCompare(`${b.date}-${b.time}-${b.competitionId}-${b.matchNo}`, 'th'));

  $('#scheduleCount').textContent = `${matches.length} คู่แข่งขัน`;
  $('#scheduleList').innerHTML = matches.length
    ? matches.map(matchCard).join('')
    : '<div class="empty">ไม่พบรายการแข่งขันตามเงื่อนไขที่เลือก</div>';
}

function renderResults() {
  const results = getFilteredMatches()
    .filter(match => match.status === 'finished')
    .sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`));

  $('#resultsList').innerHTML = results.length
    ? results.map(matchCard).join('')
    : '<div class="empty">ยังไม่มีผลการแข่งขันที่ยืนยันแล้ว</div>';
}

function bracketMatch(match) {
  const scoreA = match.scoreA === '' || match.scoreA === null ? '' : match.scoreA;
  const scoreB = match.scoreB === '' || match.scoreB === null ? '' : match.scoreB;
  return `
    <div class="bracket-match">
      <span class="bracket-number">คู่ที่ ${match.matchNo}</span>
      <div class="bracket-team">
        <span>${teamName(match.teamAId, match.teamASource)}</span>
        <strong>${scoreA}</strong>
      </div>
      <div class="bracket-team">
        <span>${teamName(match.teamBId, match.teamBSource)}</span>
        <strong>${scoreB}</strong>
      </div>
    </div>
  `;
}

function renderBracket() {
  const selected = $('#competitionFilter').value;
  const comps = state.competitions.filter(comp => !selected || comp.id === selected);

  const html = comps.map(comp => {
    const matches = state.matches.filter(match => match.competitionId === comp.id);
    const semis = matches.filter(match => match.round.includes('รอบรอง'));
    const thirds = matches.filter(match => match.round.includes('ชิงอันดับ 3'));
    const finals = matches.filter(match => match.round.includes('ชิงชนะเลิศ'));

    if (!semis.length && !thirds.length && !finals.length) return '';

    return `
      <section class="bracket-sport">
        <h3>${comp.sport} ${comp.category}</h3>
        <div class="bracket-grid">
          <div class="bracket-column">
            <h4>รอบรองชนะเลิศ</h4>
            ${semis.map(bracketMatch).join('') || '<p>ไม่มีข้อมูล</p>'}
          </div>
          <div class="bracket-column">
            <h4>ชิงอันดับ 3</h4>
            ${thirds.map(bracketMatch).join('') || '<p>ไม่มีข้อมูล</p>'}
          </div>
          <div class="bracket-column">
            <h4>ชิงชนะเลิศ</h4>
            ${finals.map(bracketMatch).join('') || '<p>ไม่มีข้อมูล</p>'}
          </div>
        </div>
      </section>
    `;
  }).join('');

  $('#bracketList').innerHTML = html || '<div class="empty">รายการนี้ไม่มีผังรอบแพ้คัดออก</div>';
}

function renderStats() {
  $('#sportCount').textContent = state.competitions.length;
  $('#matchCount').textContent = state.matches.length;
  $('#finishedCount').textContent = state.matches.filter(m => m.status === 'finished').length;
  $('#liveCount').textContent = state.matches.filter(m => m.status === 'live').length;
}

function populateFilters() {
  const competitionFilter = $('#competitionFilter');
  const currentCompetition = competitionFilter.value;
  competitionFilter.innerHTML = '<option value="">ทุกประเภทการแข่งขัน</option>' +
    state.competitions.map(comp =>
      `<option value="${comp.id}">${comp.sport} ${comp.category}</option>`
    ).join('');
  competitionFilter.value = currentCompetition;

  const dates = [...new Set(state.matches.map(m => m.date).filter(Boolean))];
  const dateFilter = $('#dateFilter');
  const currentDate = dateFilter.value;
  dateFilter.innerHTML = '<option value="">ทุกวัน</option>' +
    dates.map(date => `<option value="${date}">${date}</option>`).join('');
  dateFilter.value = currentDate;
}

function populateJudgeMatches() {
  const select = $('#judgeMatch');
  const available = state.matches.filter(match =>
    match.teamAId && match.teamBId && match.status !== 'finished'
  );

  select.innerHTML = available.length
    ? available.map(match => `
      <option value="${match.id}">
        ${competitionName(match.competitionId)} | คู่ ${match.matchNo} |
        ${teamName(match.teamAId)} พบ ${teamName(match.teamBId)}
      </option>
    `).join('')
    : '<option value="">ไม่มีคู่ที่พร้อมบันทึกผล</option>';

  updateJudgeTeamLabels();
}

function updateJudgeTeamLabels() {
  const match = state.matches.find(item => item.id === $('#judgeMatch').value);
  $('#teamALabel').textContent = match ? teamName(match.teamAId) : 'ทีม A';
  $('#teamBLabel').textContent = match ? teamName(match.teamBId) : 'ทีม B';
}

function renderAll() {
  renderStats();
  renderSchedule();
  renderResults();
  renderBracket();
  populateJudgeMatches();
}

async function loadData(showLoading = true) {
  if (!API_URL || API_URL.includes('PUT_YOUR')) {
    throw new Error('กรุณาใส่ลิงก์ Google Apps Script Web App ในไฟล์ app.js ก่อน');
  }

  if (showLoading) {
    $('#scheduleList').innerHTML = '<div class="loading">กำลังโหลดข้อมูลการแข่งขัน…</div>';
  }

  const response = await fetch(`${API_URL}?action=bootstrap&t=${Date.now()}`);
  const data = await response.json();

  if (!data.ok) throw new Error(data.message || 'ไม่สามารถโหลดข้อมูลได้');

  state.settings = data.settings || [];
  state.teams = data.teams || [];
  state.competitions = data.competitions || [];
  state.matches = data.matches || [];

  $('#eventName').textContent = valueOfSetting('eventName') || 'การแข่งขันกีฬาเครือข่ายดอยเต่าสหศึกษา ปีการศึกษา 2569';
  $('#eventDetail').textContent = `${valueOfSetting('operationalDates') || ''} · ${valueOfSetting('venue') || ''}`;
  $('#lastUpdated').textContent = `อัปเดตข้อมูลล่าสุด: ${new Date().toLocaleString('th-TH')}`;

  populateFilters();
  renderAll();
}

function switchView(viewName) {
  document.querySelectorAll('.nav-link').forEach(button => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  $(`#${viewName}View`).classList.add('active');
}

async function saveResult(event) {
  event.preventDefault();

  const matchId = $('#judgeMatch').value;
  const scoreA = $('#scoreA').value;
  const scoreB = $('#scoreB').value;
  const message = $('#formMessage');
  const saveButton = $('#saveResultButton');

  message.textContent = '';
  message.className = 'form-message';

  if (!matchId) {
    message.textContent = 'ไม่พบคู่แข่งขันที่พร้อมบันทึกผล';
    return;
  }

  if (scoreA === scoreB) {
    message.textContent = 'คะแนนต้องไม่เสมอกัน กรุณาระบุผลตัดสินก่อนบันทึก';
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'กำลังบันทึก…';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveResult',
        matchId,
        scoreA,
        scoreB,
        judgeCode: $('#judgeCode').value,
        judgeName: $('#judgeName').value.trim(),
        note: $('#judgeNote').value.trim()
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'บันทึกผลไม่สำเร็จ');

    message.textContent = data.message;
    message.classList.add('success');
    await loadData(false);

    setTimeout(() => {
      $('#judgeDialog').close();
      $('#judgeForm').reset();
    }, 1000);
  } catch (error) {
    message.textContent = error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'ยืนยันและบันทึกผล';
  }
}

function bindEvents() {
  document.querySelectorAll('.nav-link').forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  ['competitionFilter', 'dateFilter', 'statusFilter'].forEach(id => {
    $(`#${id}`).addEventListener('change', () => {
      renderSchedule();
      renderResults();
      renderBracket();
    });
  });

  $('#refreshButton').addEventListener('click', () => {
    loadData().catch(showError);
  });

  $('#openJudge').addEventListener('click', () => {
    populateJudgeMatches();
    $('#formMessage').textContent = '';
    $('#judgeDialog').showModal();
  });

  $('#judgeMatch').addEventListener('change', updateJudgeTeamLabels);
  $('#judgeForm').addEventListener('submit', saveResult);
}

function showError(error) {
  const text = error.message || 'ไม่สามารถเชื่อมต่อระบบได้';
  $('#scheduleList').innerHTML = `<div class="empty">${text}</div>`;
  $('#liveStatus').textContent = 'เชื่อมต่อข้อมูลไม่สำเร็จ';
}

bindEvents();
loadData().catch(showError);