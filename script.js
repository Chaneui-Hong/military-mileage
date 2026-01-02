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
    tempCur = new Date(tempCur.getTime() + 60000); // +1분
  }

  const n = minuteData.length;
  if (n === 0) {
    alert("시간 입력을 확인하세요");
    return;
  }

  // 2. 최대 240분(4시간) 이하의 연속 구간 중 합이 최대인 구간을 O(n)으로 찾기
  const W = Math.min(240, n);
  // prefix sums P[0]=0, P[k]=sum of first k points (minuteData[0..k-1])
  const P = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + minuteData[i].point;

  // deque of candidate indices for minimal prefix within window
  const deque = []; // will store indices of P in increasing P value
  deque.push(0);

  let bestSum = -Infinity;
  let bestStart = 0;
  let bestEnd = 0; // exclusive

  for (let j = 1; j <= n; j++) {
    // remove indices out of window range [j-W, j-1]
    while (deque.length > 0 && deque[0] < j - W) deque.shift();

    // current best using deque[0] as start index
    if (deque.length > 0) {
      const curSum = P[j] - P[deque[0]];
      if (curSum > bestSum) {
        bestSum = curSum;
        bestStart = deque[0];
        bestEnd = j;
      }
    }

    // maintain deque monotonic increasing by P value
    while (deque.length > 0 && P[j] <= P[deque[deque.length - 1]]) deque.pop();
    deque.push(j);
  }

  // guard
  if (bestEnd <= bestStart) {
    alert("적절한 구간을 찾을 수 없습니다.");
    return;
  }

  const windowLen = bestEnd - bestStart; // in minutes
  const actualStart = minuteData[bestStart].time;
  const actualEnd = new Date(minuteData[bestEnd - 1].time.getTime() + 60000);

  // 전체 분량을 한 번에 반올림해서 시간으로 환산
  const totalHours = roundHours(windowLen * 60000);

  // 평균 점수 및 최종 점수
  const averagePoint = bestSum / windowLen;
  const finalScore = totalHours * averagePoint;

  // UI 출력
  score.innerText = `${finalScore.toFixed(2)} 점`;
  reason.innerHTML = "";

  const li = document.createElement("li");
  li.innerHTML = `
    <strong>최적 구간 (최대 4시간 범위 내):</strong><br>
    ${actualStart.toLocaleString()} ~ ${actualEnd.toLocaleTimeString()}<br>
    ${windowLen}분(약 ${totalHours}시간, 반올림 적용) × 평균 ${averagePoint.toFixed(2)}점
  `;
  reason.appendChild(li);

  // 기록 저장 및 렌더링
  records.push({
    score: finalScore,
    displayTime: `${actualStart.toLocaleTimeString()}~${actualEnd.toLocaleTimeString()}`,
    details: `${windowLen}분 (약 ${totalHours}시간) × ${averagePoint.toFixed(2)}점`
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
      <div class="record-row">
        <div class="record-info">
          <strong>${r.score.toFixed(2)}점</strong>
          <span class="record-time">${r.displayTime}</span><br>
          <small class="record-details">${r.details}</small>
        </div>
        <div class="record-actions">
          <button class="btn small" onclick="del(${i})">삭제</button>
        </div>
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
