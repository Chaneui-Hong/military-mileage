let records = JSON.parse(localStorage.getItem("records")||"[]");
render();

function parseTime(t){let [h,m]=t.split(":").map(Number);return h*60+m}

function unit(min){
 if(min<15) return 0;
 if(min<45) return 0.5;
 return 1;
}

function calculate(){
 const date=document.getElementById("date").value;
 const s=document.getElementById("start").value;
 const e=document.getElementById("end").value;
 const day=document.getElementById("dayType").value;
 const proxy=document.getElementById("proxy").value;
 if(!date||!s||!e){alert("입력 필요");return;}

 let start=parseTime(s);
 let end=parseTime(e);
 let reason=[];
 let total=0;

 function add(minutes, rate, label){
   let hours=unit(minutes);
   if(hours>0){
     let pts=hours*rate;
     total+=pts;
     reason.push(`${label}: ${hours}시간 × ${rate}점 = ${pts}점`);
   }
 }

 function calcRange(from,to,baseDay){
   if(from<to){
     let mins=to-from;
     if(baseDay==="weekday"){
       if(from<1080) add(mins,0,"평일 일과시간");
       else if(from<1320) add(mins,1,"평일 일과후");
       else add(mins,1.5,"평일 취침중");
     }else{
       let rate=1;
       if(from>=1320||from<360) rate=proxy==="yes"?2.5:2;
       else rate=proxy==="yes"?1.5:1;
       add(mins,rate,"주말 근무");
     }
   }
 }

 if(end<=start){ // 자정 넘김
   calcRange(start,1440,day);
   calcRange(0,end,day);
 }else{
   calcRange(start,end,day);
 }

 if(total>4){
   total=4;
   reason.push("하루 최대 4시간 적용");
 }

 records.push({date,score:total});
 localStorage.setItem("records",JSON.stringify(records));

 document.getElementById("result").style.display="block";
 document.getElementById("score").innerText=total+"점";
 document.getElementById("reason").innerText=reason.join("\n");
 render();
}

function render(){
 const box=document.getElementById("records");
 const totalBox=document.getElementById("total");
 box.innerHTML="";
 let sum=0;
 records.forEach(r=>{
   sum+=r.score;
   let d=document.createElement("div");
   d.className="record";
   d.innerText=`${r.date} · ${r.score}점`;
   box.appendChild(d);
 });
 totalBox.innerText=`누적 점수: ${sum}점`;
}
