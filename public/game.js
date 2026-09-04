const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);
const ui = { score: $('#score'), combo: $('#combo'), level: $('#level'), health: $('#healthBar'), healthText: $('#healthText'), start: $('#startScreen'), end: $('#endScreen'), final: $('#finalScore'), resultTitle: $('#resultTitle'), resultText: $('#resultText'), toast: $('#toast') };
const keys = {}; let state = 'menu', muted = false, audio, last = 0, spawnClock = 0, elapsed = 0, score = 0, combo = 1, health = 100, level = 1, shake = 0;
let player, bugs = [], shots = [], particles = [], pickups = [], mouse = {x:640,y:360};

function reset(){
  player={x:640,y:410,r:22,speed:250,cooldown:0,dash:0,inv:0,angle:0}; bugs=[];shots=[];particles=[];pickups=[];
  spawnClock=0;elapsed=0;score=0;combo=1;health=100;level=1;shake=0; updateUI();
}
function start(){ reset();state='playing';ui.start.classList.remove('active');ui.end.classList.remove('active');beep(220,.05,'square',.04); }
function goHome(){ reset();state='menu';ui.end.classList.remove('active');ui.start.classList.add('active');beep(180,.05,'square',.025); }
function end(win=false){state='ended';ui.final.textContent=score.toLocaleString('es');ui.resultTitle.textContent=win?'SISTEMA LIMPIO':'SISTEMA CAÍDO';ui.resultText.textContent=win?'Agustín ha estabilizado el sistema. Gran deploy.':'Los bugs ganaron esta compilación. Toca recompilar.';ui.end.classList.add('active');beep(win?660:90,.35,'sawtooth',.06)}
function updateUI(){ui.score.textContent=String(score).padStart(6,'0');ui.combo.textContent=`x${combo}`;ui.level.textContent=String(level).padStart(2,'0');ui.health.style.width=`${health}%`;ui.health.style.background=health<35?'var(--red)':'var(--green)';ui.healthText.textContent=`${Math.ceil(health)}%`}
function beep(freq,d=.05,type='square',vol=.025){if(muted)return;audio ||= new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}
function spawnBug(){const edge=Math.floor(Math.random()*4),pad=40;let x,y;if(edge<2){x=edge?canvas.width+pad:-pad;y=100+Math.random()*(canvas.height-140)}else{x=Math.random()*canvas.width;y=edge===2?60:canvas.height+pad}const kinds=['null','syntax','race'];const kind=kinds[Math.min(2,Math.floor(Math.random()*(1+level/2)))];bugs.push({x,y,r:kind==='race'?14:20,hp:kind==='syntax'?2:1,speed:(65+Math.random()*35+level*6)*(kind==='race'?1.65:1),kind,t:Math.random()*8})}
function shoot(){if(state!=='playing'||player.cooldown>0)return;const a=Math.atan2(mouse.y-player.y,mouse.x-player.x);shots.push({x:player.x+Math.cos(a)*25,y:player.y+Math.sin(a)*25,vx:Math.cos(a)*620,vy:Math.sin(a)*620,life:1});player.cooldown=.14;beep(510,.035,'square',.018)}
function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=50+Math.random()*180;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.4,color,size:2+Math.random()*5})}}
function hitBug(b,i){b.hp--;burst(b.x,b.y,'#ff8a32',6);if(b.hp<=0){score+=100*combo;combo=Math.min(9,combo+1);if(Math.random()<.09)pickups.push({x:b.x,y:b.y,r:9,t:0});bugs.splice(i,1);beep(130+combo*35,.07,'square',.03);ui.toast.classList.add('show');clearTimeout(ui.toast.timer);ui.toast.timer=setTimeout(()=>ui.toast.classList.remove('show'),450);updateUI()}}
function update(dt){
  if(state!=='playing')return;elapsed+=dt;level=1+Math.floor(elapsed/18);if(elapsed>=90)return end(true);
  let dx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),dy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0);const len=Math.hypot(dx,dy)||1;let speed=player.speed;if(player.dash>0)speed*=2.6;
  player.x=Math.max(28,Math.min(canvas.width-28,player.x+dx/len*speed*dt));player.y=Math.max(105,Math.min(canvas.height-28,player.y+dy/len*speed*dt));player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);player.cooldown-=dt;player.dash-=dt;player.inv-=dt;
  spawnClock-=dt;if(spawnClock<=0){spawnBug();spawnClock=Math.max(.2,1.05-level*.1)}
  shots.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt});shots=shots.filter(s=>s.life>0&&s.x>-20&&s.x<1300&&s.y>60&&s.y<740);
  for(let i=bugs.length-1;i>=0;i--){const b=bugs[i],a=Math.atan2(player.y-b.y,player.x-b.x);b.x+=Math.cos(a)*b.speed*dt;b.y+=Math.sin(a)*b.speed*dt;b.t+=dt;
    for(let j=shots.length-1;j>=0;j--)if(Math.hypot(shots[j].x-b.x,shots[j].y-b.y)<b.r+5){shots.splice(j,1);hitBug(b,i);break}
    if(bugs[i]&&Math.hypot(b.x-player.x,b.y-player.y)<b.r+player.r&&player.inv<=0){health=Math.max(0,health-(b.kind==='syntax'?18:12));combo=1;player.inv=.9;shake=12;bugs.splice(i,1);burst(player.x,player.y,'#ff4e68',18);beep(80,.18,'sawtooth',.05);updateUI();if(!health)return end(false)}
  }
  pickups.forEach(p=>{p.t+=dt;if(Math.hypot(p.x-player.x,p.y-player.y)<35){health=Math.min(100,health+14);p.dead=true;score+=250;beep(780,.12,'sine',.04);updateUI()}});pickups=pickups.filter(p=>!p.dead&&p.t<8);
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy*=.95;p.life-=dt});particles=particles.filter(p=>p.life>0);shake*=.87;
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function background(){ctx.fillStyle='#090e18';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#15243a';ctx.lineWidth=2;for(let x=35;x<canvas.width;x+=80){ctx.beginPath();ctx.moveTo(x,75);ctx.lineTo(x,canvas.height);ctx.stroke()}for(let y=110;y<canvas.height;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}ctx.strokeStyle='#253d52';for(let i=0;i<14;i++){const x=(i*193)%1280,y=120+(i*83)%520;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+45,y);ctx.lineTo(x+65,y+20);ctx.lineTo(x+120,y+20);ctx.stroke();rect(x+118,y+16,8,8,'#294f59')}ctx.fillStyle='rgba(83,200,255,.04)';ctx.fillRect(0,75,canvas.width,canvas.height-75)}
function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);if(player.inv>0&&Math.floor(player.inv*12)%2)return ctx.restore();ctx.rotate(player.angle);rect(-15,-17,30,35,'#303944');rect(-12,-24,24,17,'#f2a85e');rect(1,-20,10,5,'#172a63');rect(-5,-4,13,9,'#6d1239');rect(8,-5,25,7,'#dce8e9');rect(28,-7,10,11,'#53c8ff');rect(-15,18,10,13,'#171b25');rect(6,18,10,13,'#171b25');ctx.restore()}
function drawBug(b){ctx.save();ctx.translate(b.x,b.y);const flap=Math.sin(b.t*10)*4,c=b.kind==='race'?'#53c8ff':b.kind==='syntax'?'#ff4e68':'#ff8a32';rect(-b.r,-b.r*.55,b.r*2,b.r*1.1,c);rect(-b.r*.5,-b.r,b.r,b.r*2,c);rect(-b.r-8,-b.r+flap,8,6,c);rect(b.r,-b.r-flap,8,6,c);rect(-b.r-8,b.r-5-flap,8,6,c);rect(b.r,b.r-5+flap,8,6,c);rect(-7,-5,5,5,'#071019');rect(5,-5,5,5,'#071019');ctx.restore()}
function draw(){ctx.save();ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);background();pickups.forEach(p=>{ctx.globalAlpha=.65+.35*Math.sin(p.t*8);rect(p.x-11,p.y-11,22,22,'#6df7a3');rect(p.x-3,p.y-8,6,16,'#092116');rect(p.x-8,p.y-3,16,6,'#092116');ctx.globalAlpha=1});shots.forEach(s=>{rect(s.x-5,s.y-3,12,6,'#eefaff');rect(s.x-9,s.y-1,7,2,'#53c8ff')});bugs.forEach(drawBug);drawPlayer();particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);rect(p.x,p.y,p.size,p.size,p.color)});ctx.globalAlpha=1;ctx.restore();if(state==='playing'){ctx.fillStyle='#718099';ctx.font='14px Chakra Petch';ctx.fillText(`TIEMPO // ${Math.max(0,90-elapsed).toFixed(1)}s`,22,canvas.height-22)}}
function frame(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(frame)}
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Enter'&&state!=='playing')start();if(e.key==='Shift'&&state==='playing'&&player.dash<=0){player.dash=.18;player.inv=.2;beep(170,.08)}});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*canvas.width/r.width;mouse.y=(e.clientY-r.top)*canvas.height/r.height});canvas.addEventListener('pointerdown',shoot);canvas.addEventListener('touchstart',e=>{e.preventDefault();shoot()},{passive:false});
$('#startBtn').onclick=start;$('#restartBtn').onclick=start;$('#homeBtn').onclick=goHome;$('#endHomeBtn').onclick=goHome;$('#homeLogo').onclick=e=>{e.preventDefault();goHome()};$('#soundBtn').onclick=()=>{muted=!muted;$('#soundBtn').textContent=`SONIDO: ${muted?'OFF':'ON'}`};
reset();requestAnimationFrame(frame);
