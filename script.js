let records = [];

/* 시간 반올림 */
function roundHours(ms) {
  const totalMin = ms / 60000;
  const h = Math.floor(totalMin / 60);
  const r = totalMin % 60;

  if (r < 15) return h;
  if (r < 45) return h + 0.5;
  return h + 1;
}

/* 기본 점수 */
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

  let segs = [];
  let cur = new Date(start);

  while (cur < end) {
    let next = new Date(cur);
    next.setMinutes(0, 0, 0);
    next.setHours(cur.getHours() + 1);
    if (next > end) next = end;

    const dayType =
      cur.toDateString() === start.toDateString() ? sType : eType;

    const hours = roundHours(next - cur);
    const base = basePoint(dayType, cur.getHours());
    let point = base;

    if (sub) {
      if (dayType === "weekday" && base === 0) point += 1;
      else point += 0.5;
    }

    segs.push({
      start: new Date(cur),
      end: new Date(next),
      hours,
      point,
      dayType
    });

    cur = next;
  }

  let best = { score: 0, list: [] };

  for (let i = 0; i < segs.length; i++) {
    let hSum = 0;
    let pSum = 0;
    let temp = [];

    for (let j = i; j < segs.length; j++) {
      hSum += segs[j].hours;
      if (hSum > 4) break;

      pSum += segs[j].hours * segs[j].point;
      temp.push(segs[j]);

      if (pSum > best.score) {
        best = { score: pSum, list: temp };
      }
    }
  }

  score.innerText = `${best.score.toFixed(2)} 점`;
  reason.innerHTML = "";

  best.list.forEach(s => {
    const li = document.createElement("li");
    li.innerText =
      `${s.start.toLocaleString()} ~ ${s.end.toLocaleTimeString()} ` +
      `(${s.dayType}) ${s.hours}시간 × ${s.point.toFixed(2)}점`;
    reason.appendChild(li);
  });

  records.push(best);
  render();
}

function render() {
  // recordsEl 변수 정리 및 레코드 목록 가져오기
  let recordsEl = document.getElementById("records");
  if (!recordsEl) return;

  // 누적 점수 표시 요소가 없으면 생성 (records 요소 앞에 삽입)
  let totalEl = document.getElementById("totalScore");
  if (!totalEl) {
    totalEl = document.createElement("div");
    totalEl.id = "totalScore";
    totalEl.style.marginBottom = "8px";
    recordsEl.parentNode.insertBefore(totalEl, recordsEl);
  }

  // 누적 점수 계산 및 표시 (소수점 둘째자리, 기록 개수 포함)
  const total = records.reduce((sum, r) => sum + (r.score || 0), 0);
  const count = records.length;
  totalEl.innerText = `누적 점수: ${total.toFixed(2)}점 (${count}건)`;

  recordsEl.innerHTML = "";

  records.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <strong>${r.score.toFixed(2)}점</strong>
      <ul>${r.list.map(s =>
        `<li>${s.hours}시간 × ${s.point.toFixed(2)}점</li>`
      ).join("")}</ul>
      <button onclick="del(${i})">삭제</button>
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
