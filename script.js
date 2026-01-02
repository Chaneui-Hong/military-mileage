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

  score.innerText = `${best.score.toFixed(1)} 점`;
  reason.innerHTML = "";

  best.list.forEach(s => {
    const li = document.createElement("li");
    li.innerText =
      `${s.start.toLocaleString()} ~ ${s.end.toLocaleTimeString()} ` +
      `(${s.dayType}) ${s.hours}시간 × ${s.point}점`;
    reason.appendChild(li);
  });

  records.push(best);
  render();
}

function render() {
  recordsEl = records;
  recordsEl = document.getElementById("records");
  recordsEl.innerHTML = "";

  records.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <strong>${r.score.toFixed(1)}점</strong>
      <ul>${r.list.map(s =>
        `<li>${s.hours}시간 × ${s.point}점</li>`
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
