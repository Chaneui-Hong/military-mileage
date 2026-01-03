// script.js - updated: keeps #totalScore in sync with saved records

let records = [];

/**
 * 사용자 반올림 규칙 적용
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

/* 기본 점수 산정 로직 (시간대와 평일/주말/공휴일에 따라) */
function basePoint(dayType, hour) {
  if (hour >= 6 && hour < 18) return dayType === "weekday" ? 0 : 1;
  if (hour >= 18 && hour < 22) return dayType === "weekday" ? 1 : 1.5;
  return dayType === "weekday" ? 1.5 : 2;
}

/* --- 계산 & 레코드 관리 --- */

function calculate() {
  const startEl = document.getElementById("startTime");
  const endEl = document.getElementById("endTime");
  const substituteEl = document.getElementById("substitute");
  const startDayTypeEl = document.getElementById("startDayType");
  const endDayTypeEl = document.getElementById("endDayType");

  const start = new Date(startEl.value);
  const end = new Date(endEl.value);
  const sub = substituteEl.checked;
  const sType = startDayTypeEl.value;
  const eType = endDayTypeEl.value;

  if (!startEl.value || !endEl.value || start >= end) {
    alert("시간 입력을 확인하세요");
    return;
  }

  // 1. 분 단위 점수 데이터 생성
  let minuteData = [];
  let tempCur = new Date(start);
  while (tempCur < end) {
    // dayType: if same day as start use sType otherwise eType
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

  // 2. 최적 4시간(240분) 구간 탐색 (windowSize는 전체 길이 또는 240분 중 작은 값)
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

  // 3. 점수 산정
  // minute-level points 합계를 시간 단위로 환산 (분 단위 합 / 60)
  const totalMinutePoints = bestWindow.reduce((s, it) => s + it.point, 0);
  const rawPoints = totalMinutePoints / 60; // 예: 1분당 point를 모아 시간 단위로 변환

  // sessionMinutes: 실제 선택된 구간 분량 (보통 windowSize)
  const sessionMinutes = bestWindow.length;
  // roundedHours: 사용자 규칙에 따른 반올림된 시간 (예: 근무시간 표시에 사용 가능)
  const roundedHours = applyCustomRound(sessionMinutes);

  // 화면 표시용 점수 (소수 둘째자리까지)
  const displayScore = Math.round(rawPoints * 100) / 100;

  // 출력: 이번 근무 점수 및 근거
  const scoreEl = document.getElementById("score");
  const reasonEl = document.getElementById("reason");
  scoreEl.textContent = `${displayScore.toFixed(2)} 점`;
  reasonEl.innerHTML = ""; // 근거 목록 초기화
  const li1 = document.createElement("li");
  li1.textContent = `선택 구간 길이: ${sessionMinutes} 분 (반올림: ${roundedHours} 시간)`;
  const li2 = document.createElement("li");
  li2.textContent = `원시 점수 합계: ${totalMinutePoints.toFixed(2)} (시간 단위: ${rawPoints.toFixed(4)})`;
  reasonEl.appendChild(li1);
  reasonEl.appendChild(li2);

  // 저장: records 배열에 추가 (저장 시 소수 둘째자리)
  const newRecord = {
    id: Date.now(),
    start: start.toISOString(),
    end: end.toISOString(),
    score: displayScore,
    minutes: sessionMinutes,
    roundedHours: roundedHours,
    createdAt: new Date().toISOString(),
  };

  records.push(newRecord);
  saveRecords();
  renderRecords();
  updateTotalScore();
}

/* 렌더링: 기록 목록 */
function renderRecords() {
  const ul = document.getElementById("records");
  ul.innerHTML = "";

  if (!records || records.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "기록이 없습니다.";
    empty.style.color = "#8b95a1";
    ul.appendChild(empty);
    return;
  }

  // 최근 순으로 표시 (최신이 위)
  const rev = [...records].reverse();
  rev.forEach((r) => {
    const li = document.createElement("li");
    li.style.borderBottom = "1px solid #eee";
    li.style.padding = "8px 0";
    const timeRange = document.createElement("div");
    const s = new Date(r.start);
    const e = new Date(r.end);
    timeRange.textContent = `${s.toLocaleString()} — ${e.toLocaleString()}`;
    timeRange.style.fontSize = "12px";
    timeRange.style.color = "#556";
    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.justifyContent = "space-between";
    meta.style.alignItems = "center";
    const left = document.createElement("div");
    left.textContent = `${r.roundedHours}시간 (${r.minutes}분)`;
    left.style.fontSize = "13px";
    const right = document.createElement("div");
    right.textContent = `${r.score.toFixed(2)} 점`;
    right.style.fontWeight = "700";
    right.style.color = "#222";
    meta.appendChild(left);
    meta.appendChild(right);

    // 삭제 버튼
    const delBtn = document.createElement("button");
    delBtn.textContent = "삭제";
    delBtn.style.marginLeft = "8px";
    delBtn.style.background = "transparent";
    delBtn.style.border = "none";
    delBtn.style.color = "#d93636";
    delBtn.style.cursor = "pointer";
    delBtn.onclick = () => {
      records = records.filter((x) => x.id !== r.id);
      saveRecords();
      renderRecords();
      updateTotalScore();
    };

    li.appendChild(timeRange);
    li.appendChild(meta);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
}

/* 총합 업데이트: #totalScore */
function updateTotalScore() {
  const totalEl = document.getElementById("totalScore");
  if (!totalEl) return;
  const sum = records.reduce((s, r) => s + Number(r.score || 0), 0);
  totalEl.textContent = `${sum.toFixed(2)}점`;
}

/* localStorage 저장/로드 */
function saveRecords() {
  try {
    localStorage.setItem("mm_records", JSON.stringify(records));
  } catch (e) {
    console.warn("로컬 저장 실패", e);
  }
}

function loadRecords() {
  try {
    const raw = localStorage.getItem("mm_records");
    if (!raw) {
      records = [];
      return;
    }
    records = JSON.parse(raw) || [];
  } catch (e) {
    records = [];
    console.warn("로컬 로드 실패", e);
  }
}

/* 초기화 */
function clearAll() {
  if (!confirm("정말로 기록을 모두 초기화하시겠습니까?")) return;
  records = [];
  saveRecords();
  renderRecords();
  updateTotalScore();

  // UI도 초기화
  const scoreEl = document.getElementById("score");
  const reasonEl = document.getElementById("reason");
  if (scoreEl) scoreEl.textContent = "- 점";
  if (reasonEl) reasonEl.innerHTML = "";
}

/* 페이지 로드 시 초기화 처리 */
window.addEventListener("DOMContentLoaded", () => {
  // 전역 함수가 필요하면 노출 (index.html의 onclick 속성들이 사용)
  window.calculate = calculate;
  window.clearAll = clearAll;

  loadRecords();
  renderRecords();
  updateTotalScore();
});
