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

  // 2. 최적 4시간(240분) 구간 탐색 (구간 길이는 최대 240분, 여기선 최대 길이인 240분(또는 전체 길이) 고정으로 처리)
  const windowSize = Math.min(minuteData.length, 240);
  let bestScoreSum = -Infinity;
  let bestStartIdx = 0;

  // 슬라이딩 윈도우(고정 길이 windowSize)로 최대 합을 찾음
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

  // 3. 구간별 분리 및 사용자 규칙에 따른 반올림 계산 (같은 점수 연속 구간별로 분 단위 합산 후 반올림)
  let finalScore = 0;
  let detailList = [];
  let currentGroup = { point: bestWindow[0].point, minutes: 0 };

  for (let m of bestWindow) {
    if (m.point === currentGroup.point) {
      currentGroup.minutes++;
    } else {
      // 구간이 바뀌면 해당 그룹에 반올림 규칙 적용하여 시간 환산 후 점수 누적
      const roundedHours = applyCustomRound(currentGroup.minutes);
      finalScore += roundedHours * currentGroup.point;
      detailList.push({
        rawMinutes: currentGroup.minutes,
        roundedHours: roundedHours,
        point: currentGroup.point
      });
      currentGroup = { point: m.point, minutes: 1 };
    }
  }
  // 마지막 그룹 처리
  const lastRoundedHours = applyCustomRound(currentGroup.minutes);
  finalScore += lastRoundedHours * currentGroup.point;
  detailList.push({
    rawMinutes: currentGroup.minutes,
    roundedHours: lastRoundedHours,
    point: currentGroup.point
  });

  // 4. UI 출력
  const actualStart = bestWindow[0].time;
  const actualEnd = new Date(bestWindow[bestWindow.length - 1].time.getTime() + 60000);

  score.innerText = `${finalScore.toFixed(2)} 점`;
  reason.innerHTML = `<strong>최적 구간: ${actualStart.toLocaleTimeString()} ~ ${actualEnd.toLocaleTimeString()}</strong>`;

  detailList.forEach(d => {
    const li = document.createElement("li");
    li.innerText = `${d.rawMinutes}분 → ${d.roundedHours}시간 적용 × ${d.point.toFixed(2)}점`;
    reason.appendChild(li);
  });

  records.push({
    score: finalScore,
    displayTime: `${actualStart.toLocaleTimeString()}~${actualEnd.toLocaleTimeString()}`,
    details: detailList.map(d => `${d.roundedHours}h×${d.point}`).join(", ")
  });
  render();
}

function render() {
  let recordsEl = document.getElementById("records");
  if (!recordsEl) return;

  let totalEl = document.getElementById("totalScore");
  if (!totalEl) {
    totalEl = document.createElement("div");
    totalEl.id = "totalScore";
    totalEl.style.fontWeight = "bold";
    totalEl.style.marginBottom = "10px";
    recordsEl.parentNode.insertBefore(totalEl, recordsEl);
  }

  const total = records.reduce((sum, r) => sum + (r.score || 0), 0);
  totalEl.innerText = `누적 점수: ${total.toFixed(2)}점 (${records.length}건)`;

  recordsEl.innerHTML = "";
  records.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px;">
        <div><strong>${r.score.toFixed(2)}점</strong> <small>(${r.displayTime})</small></div>
        <button onclick="del(${i})">삭제</button>
      </div>
    `;
    recordsEl.appendChild(li);
  });
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
