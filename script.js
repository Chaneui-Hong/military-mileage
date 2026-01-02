let records = [];

function buildDate(d, t) {
  return new Date(`${d}T${t}`);
}

function getRate(dayType, hour, isSub) {
  let base = 0;
  const night = (hour >= 22 || hour < 6);

  if (dayType === 'weekday') {
    if (night) base = 1.5;
    else if (hour >= 18) base = 1;
    else base = 0;
  } else {
    base = night ? 2 : 1;
  }

  // 🔥 대리근무 규칙
  if (isSub) {
    if (dayType === 'weekday' && !night && hour < 18) {
      base += 1;       // 평일 일과 대리 = +1
    } else if (base > 0) {
      base += 0.5;     // 그 외 대리 = +0.5
    }
  }

  return base;
}

function calculate(record) {
  let total = 0;
  let cur = new Date(record.start);

  while (cur < record.end) {
    const next = new Date(cur);
    next.setHours(cur.getHours() + 1, 0, 0, 0);

    const segmentEnd = next > record.end ? record.end : next;
    let hours = (segmentEnd - cur) / 36e5;

    if (hours >= 0.25 && hours < 0.75) hours = 0.5;
    else if (hours >= 0.75) hours = 1;
    else hours = 0;

    const dayType =
      cur.toDateString() === record.start.toDateString()
        ? record.startType
        : record.endType;

    const rate = getRate(dayType, cur.getHours(), record.isSub);
    total += hours * rate;

    cur = segmentEnd;
  }

  return total;
}

function addRecord() {
  const start = buildDate(startDate.value, startTime.value);
  const end = buildDate(endDate.value, endTime.value);
  if (end <= start) return alert("시간 입력 오류");

  records.push({
    start,
    end,
    startType: startType.value,
    endType: endType.value,
    isSub: isSub.value === 'yes'
  });

  render();
}

function render() {
  recordsEl = document.getElementById("records");
  recordsEl.innerHTML = "";
  let sum = 0;

  records.forEach((r, i) => {
    const score = calculate(r);
    sum += score;

    recordsEl.innerHTML += `
      <li>
        ${r.start.toLocaleString()} ~ ${r.end.toLocaleString()}
        (${score.toFixed(1)}점)
        <span class="delete" onclick="remove(${i})">삭제</span>
      </li>`;
  });

  document.getElementById("totalScore").innerText = sum.toFixed(1);
}

function remove(i) {
  records.splice(i, 1);
  render();
}

function resetAll() {
  if (confirm("전체 기록을 삭제할까요?")) {
    records = [];
    render();
  }
}
