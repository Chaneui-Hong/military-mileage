let records = [];

/**
 * 사용자의 반올림 규칙 적용
 * 15분 미만 -> 0분 (0시간)
 * 15분 이상 45분 미만 -> 30분 (0.5시간)
 * 45분 이상 -> 60분 (1시간)
 */
function applyCustomRound(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const r = totalMinutes % 60;

  if (r < 15) return h;
  if (r < 45) return h + 0.5;
  return h + 1;
}

/* 기본 점수 산정 로직 */
function basePoint(dayType, hour) {
  if (hour >= 6 && hour < 18) return dayType === "weekday" ? 0 : 1;
  if (hour >= 18 && hour < 22) return dayType === "weekday" ? 1 : 1.5;
  return dayType === "weekday" ? 1.5 : 2;
}

function calculate() {
  const start = new Date(startTime.value);
  const end = new Date(endTime.value);
  const sub = substitute.checked;
  const sType = startDayType.value;
  const eType = endDayType.value;

  if (!start || !end || start >= end) {
    alert("시간 입력을 확인하세요");
    return;
  }

  // 1. 1분 단위 점수 데이터 생성
  let minuteData = [];
  let tempCur = new Date(start);
  while (tempCur < end) {
    // 같은 날짜인지 여부로 시작/종료의 dayType을 나눔 (원래 로직 유지)
    const dayType = tempCur.toDateString() === start.toDateString() ? sType : eType;
    let point = basePoint(dayType, tempCur.getHours());
    if (sub) {
      if (dayType === "weekday" && point === 0) point += 1;
      else point += 0.5;
    }
    minuteData.push({ time: new Date(tempCur), point: point });
    tempCur.setMinutes(tempCur.getMinutes() + 1);
  }

  if (minuteData.length === 0) {
    alert("시간 입력을 확인하세요");
    return;
  }

  // 2. 최적 4시간(240분) 구간 탐색 (고정 길이 윈도우; 전체가 240분 미만이면 전체 길이 사용)
  const windowSize = Math.min(minuteData.length, 240);
  let bestScoreSum = -Infinity;
  let bestStartIdx = 0;

  // 초기 윈도우 합
  let currentSum = 0;
  for (let i = 0; i < windowSize; i++) currentSum += minuteData[i].point;
  bestScoreSum = currentSum;

  for (let i = 1; i <= minuteData.length - windowSize; i++) {
    currentSum = currentSum - minuteData[i - 1].point + minuteData[i + windowSize - 1].point;
    if (currentSum > bestScoreSum) {
      bestScoreSum = currentSum;
      bestStartIdx = i;
    }
  }

  const bestWindow = minuteData.slice(bestStartIdx, bestStartIdx + windowSize);

  // 3. 구간별 반올림 계산 및 UI용 데이터 구성 (같은 점수 연속 구간별로 분 단위 합산 후 반올림)
  let finalScore = 0;
  let detailHTML = "";
  let currentGroup = { point: bestWindow[0].point, minutes: 0 };

  function addGroupToResult(group) {
    const roundedHours = applyCustomRound(group.minutes);
    const groupScore = roundedHours * group.point;
    finalScore += groupScore;

    // 모바일 앱 느낌의 상세 내역 HTML 생성
    detailHTML += `
      <div class="detail-item" style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9;">
        <div class="detail-info" style="color:#334155;">
          <div class="label" style="font-size:13px;">${group.minutes}분 근무 <small style="color:#94a3b8;">(반올림: ${roundedHours}시간)</small></div>
          <div class="meta" style="font-size:12px; color:#64748b;">배율: ${group.point.toFixed(1)}점</div>
        </div>
        <div style="font-weight:700; color:#3182f6; align-self:center;">+${groupScore.toFixed(2)}</div>
      </div>`;
  }

  for (let m of bestWindow) {
    if (m.point === currentGroup.point) {
      currentGroup.minutes++;
    } else {
      addGroupToResult(currentGroup);
      currentGroup = { point: m.point, minutes: 1 };
    }
  }
  // 마지막 그룹 처리
  addGroupToResult(currentGroup);

  // 4. 화면 업데이트
  const scoreEl = document.getElementById("score");
  const reasonEl = document.getElementById("reason");
  const actualStart = bestWindow[0].time;
  const actualEnd = new Date(bestWindow[bestWindow.length - 1].time.getTime() + 60000);

  if (scoreEl) scoreEl.innerText = `${finalScore.toFixed(2)} 점`;
  if (reasonEl) {
    reasonEl.innerHTML = `
      <div style="color:#8b95a1; font-size:14px; margin-bottom:12px;">
        최적 구간: ${actualStart.toLocaleTimeString()} ~ ${actualEnd.toLocaleTimeString()}
      </div>
      ${detailHTML}
    `;
  }

  records.push({
    score: finalScore,
    timeRange: `${actualStart.toLocaleTimeString()} ~ ${actualEnd.toLocaleTimeString()}`,
    date: actualStart.toLocaleDateString()
  });
  render();
}

function render() {
  let recordsEl = document.getElementById("records");
  if (!recordsEl) return;

  // totalScoreValue 요소를 우선 찾고, 없으면 동적으로 생성 (기존 동작과 호환 유지)
  let totalScoreEl = document.getElementById("totalScoreValue");
  if (!totalScoreEl) {
    totalScoreEl = document.createElement("div");
    totalScoreEl.id = "totalScoreValue";
    totalScoreEl.style.fontWeight = "bold";
    totalScoreEl.style.marginBottom = "10px";
    recordsEl.parentNode.insertBefore(totalScoreEl, recordsEl);
  }

  const total = records.reduce((sum, r) => sum + (r.score || 0), 0);
  totalScoreEl.innerText = `누적 점수: ${total.toFixed(2)}점 (${records.length}건)`;

  recordsEl.innerHTML = records.map((r, i) => `
    <div class="record-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eef2f7;">
      <div>
        <div class="record-score" style="font-weight:700;">${r.score.toFixed(2)} 점</div>
        <div class="record-meta" style="font-size:12px; color:#64748b;">${r.date} · ${r.timeRange}</div>
      </div>
      <button class="btn-delete" onclick="del(${i})" style="background:#ef4444; color:#fff; border:none; padding:6px 10px; border-radius:4px;">삭제</button>
    </div>
  `).join("");
}

function del(i) {
  records.splice(i, 1);
  render();
}

function clearAll() {
  if (confirm("모든 기록을 삭제할까요?")) {
    records = [];
    render();
  }
}
