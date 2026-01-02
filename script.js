let records = [];

/* 시간 반올림: 전체 밀리초(ms)를 입력받아 15분/45분 기준으로 0.5단위 반올림 */
function roundHours(ms) {
  const totalMin = ms / 60000;
  const h = Math.floor(totalMin / 60);
  const r = totalMin % 60;

  if (r < 15) return h;
  if (r < 45) return h + 0.5;
  return h + 1;
}

/* 기본 점수 산정 로직 */
function basePoint(dayType, hour) {
  if (hour >= 6 && hour < 18) {
    return dayType === "weekday" ? 0 : 1;
  }
  if (hour >= 18 && hour < 22) {
    return dayType === "weekday" ? 1 : 1.5;
  }
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

  // 1. 1분 단위로 모든 구간의 점수 미리 계산 (배율 변화 대응)
  let minuteData = [];
  let tempCur = new Date(start);
  
  while (tempCur < end) {
    const dayType = tempCur.toDateString() === start.toDateString() ? sType : eType;
    let point = basePoint(dayType, tempCur.getHours());
    
    // 대근(substitute) 가산점 로직
    if (sub) {
      if (dayType === "weekday" && point === 0) point += 1;
      else point += 0.5;
    }
    
    minuteData.push({
      time: new Date(tempCur),
      point: point
    });
    tempCur.setMinutes(tempCur.getMinutes() + 1);
  }

  // 2. 연속된 최대 4시간(240분) 구간 중 점수 합이 가장 높은 구간 찾기
  let bestScoreSum = -1;
  let bestWindow = [];
  const windowSize = Math.min(minuteData.length, 240); // 최대 4시간 제한

  for (let i = 0; i <= minuteData.length - windowSize; i++) {
    let currentSum = 0;
    for (let j = 0; j < windowSize; j++) {
      currentSum += minuteData[i + j].point;
    }
    
    if (currentSum > bestScoreSum) {
      bestScoreSum = currentSum;
      bestWindow = minuteData.slice(i, i + windowSize);
    }
  }

  // 3. 최적 구간 결과 도출
  const actualStart = bestWindow[0].time;
  const actualEnd = new Date(bestWindow[bestWindow.length - 1].time.getTime() + 60000);
  
  // 전체 분량을 한 번에 반올림 (예: 152분 -> 2.5시간)
  const totalHours = roundHours(windowSize * 60000);
  
  // 구간 평균 점수 계산 후 최종 점수 산출
  const averagePoint = bestScoreSum / windowSize;
  const finalScore = totalHours * averagePoint;

  // 4. UI 출력
  score.innerText = `${finalScore.toFixed(2)} 점`;
  reason.innerHTML = "";

  const li = document.createElement("li");
  li.innerHTML = `
    <strong>최적 4시간 구간:</strong><br>
    ${actualStart.toLocaleString()} ~ ${actualEnd.toLocaleTimeString()}<br>
    ${totalHours}시간(반올림 적용) × 평균 ${averagePoint.toFixed(2)}점
  `;
  reason.appendChild(li);

  // 5. 기록 저장 및 렌더링
  records.push({
    score: finalScore,
    displayTime: `${actualStart.toLocaleTimeString()}~${actualEnd.toLocaleTimeString()}`,
    details: `${totalHours}시간 × ${averagePoint.toFixed(2)}점`
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
    li.style.borderBottom = "1px solid #eee";
    li.style.padding = "8px 0";
    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${r.score.toFixed(2)}점</strong> 
          <span style="font-size:0.9em; color:#666;">(${r.displayTime})</span><br>
          <small>${r.details}</small>
        </div>
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