/* ===============================
   시간대 판별
================================ */
function getTimeSlot(hour) {
  if (hour >= 6 && hour < 18) return "day";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/* ===============================
   30분 슬롯 점수 계산
================================ */
function getSlotScore(date, dayType, isSub) {
  const hour = date.getHours();
  const slot = getTimeSlot(hour);

  let base = 0;

  if (dayType === "weekday") {
    if (slot === "evening") base = 1;
    if (slot === "night") base = 1.5;
  } else {
    if (slot === "day") base = 1;
    if (slot === "evening") base = 1.5;
    if (slot === "night") base = 2;
  }

  let extra = 0;
  if (isSub) {
    if (dayType === "weekday" && slot === "day") extra = 1;
    else extra = 0.5;
  }

  return (base + extra) / 2; // 30분 단위
}

/* ===============================
   메인 계산
================================ */
function calculateMileage(start, end, dayType, isSub) {
  let slots = [];
  let cur = new Date(start);

  while (cur < end) {
    slots.push({
      time: new Date(cur),
      score: getSlotScore(cur, dayType, isSub)
    });
    cur.setMinutes(cur.getMinutes() + 30);
  }

  // 날짜별 분리
  const byDate = {};
  slots.forEach(s => {
    const key = s.time.toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(s);
  });

  let total = 0;
  let reasons = [];

  for (const date in byDate) {
    const daySlots = byDate[date];
    let best = 0;
    let bestIndex = null;

    if (daySlots.length >= 8) {
      for (let i = 0; i <= daySlots.length - 8; i++) {
        let sum = 0;
        for (let j = i; j < i + 8; j++) sum += daySlots[j].score;
        if (sum > best) {
          best = sum;
          bestIndex = i;
        }
      }
    } else {
      best = daySlots.reduce((a, b) => a + b.score, 0);
    }

    total += best;

    if (bestIndex !== null) {
      const s = daySlots[bestIndex].time;
      const e = new Date(s);
      e.setHours(e.getHours() + 4);

      reasons.push(
        `- ${date} ${fmt(s)}~${fmt(e)} ` +
        `(연속 4시간 최고 점수 적용) → ${best.toFixed(1)}점`
      );
    } else {
      reasons.push(`- ${date} 근무 전체 적용 → ${best.toFixed(1)}점`);
    }
  }

  return { total, reason: reasons.join("\n") };
}

/* ===============================
   UI 연결
================================ */
function onCalculate() {
  const start = new Date(document.getElementById("startTime").value);
  const end = new Date(document.getElementById("endTime").value);
  const dayType = document.getElementById("dayType").value;
  const isSub = document.getElementById("substitute").checked;

  if (!start || !end || start >= end) {
    alert("시간 입력을 확인하세요.");
    return;
  }

  const result = calculateMileage(start, end, dayType, isSub);
  document.getElementById("score").innerText = result.total.toFixed(1) + "점";
  document.getElementById("reason").innerText = result.reason;
}

function fmt(d) {
  return String(d.getHours()).padStart(2, "0") + ":" +
         String(d.getMinutes()).padStart(2, "0");
}
