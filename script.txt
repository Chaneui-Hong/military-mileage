let records = JSON.parse(localStorage.getItem("records") || "[]");

function isNight(date) {
  const h = date.getHours();
  return h >= 22 || h < 6;
}

function getRate(type, night, proxy = false) {
  if (type === "weekday") return night ? 1.5 : 1;
  if (type === "holiday") return night ? 2 : 1;
  if (type === "weekend") return night ? (proxy ? 2.5 : 2) : 1;
}

function calculate() {
  const start = new Date(startTime.value);
  const end = new Date(endTime.value);
  if (!startTime.value || !endTime.value || start >= end) {
    alert("시간 입력을 확인하세요");
    return;
  }

  let dailyHours = {};
  let dailyScore = {};
  let logs = [];

  let cur = new Date(start);

  while (cur < end) {
    let next = new Date(cur);
    next.setHours(cur.getHours() + 1, 0, 0, 0);
    if (next > end) next = end;

    const diff = (next - cur) / 3600000;
    if (diff >= 0.25) {
      const dateKey = cur.toISOString().slice(0, 10);
      const type =
        cur.toDateString() === start.toDateString()
          ? startType.value
          : endType.value;

      if (!dailyHours[dateKey]) {
        dailyHours[dateKey] = 0;
        dailyScore[dateKey] = 0;
      }

      if (dailyHours[dateKey] < 4) {
        const usable = Math.min(diff, 4 - dailyHours[dateKey]);
        const night = isNight(cur);
        const rate = getRate(type, night, true);
        const score = usable * rate;

        dailyHours[dateKey] += usable;
        dailyScore[dateKey] += score;

        logs.push(
          `- ${dateKey} ${cur.getHours()}:00~${next.getHours()}:00 (${type}${night ? " 야간" : ""}) ${usable}시간 × ${rate}점`
        );
      }
    }
    cur = next;
  }

  let total = Object.values(dailyScore).reduce((a, b) => a + b, 0);

  records.push({
    score: total,
    log: logs.join("<br>")
  });

  localStorage.setItem("records", JSON.stringify(records));
  render();
}

function render() {
  const list = document.getElementById("recordList");
  list.innerHTML = "";
  let sum = 0;

  records.forEach((r, i) => {
    sum += r.score;
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${r.score.toFixed(1)}점</b><br>
      <small>${r.log}</small><br>
      <button onclick="remove(${i})">삭제</button>
    `;
    list.appendChild(li);
  });

  document.getElementById("totalScore").innerText = sum.toFixed(1) + " 점";
}

function remove(i) {
  records.splice(i, 1);
  localStorage.setItem("records", JSON.stringify(records));
  render();
}

function clearAll() {
  if (!confirm("전체 기록을 삭제할까요?")) return;
  records = [];
  localStorage.clear();
  render();
}

render();