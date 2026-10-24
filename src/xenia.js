// XENIA page extras: event filter, rock reveal, stone-crumble click. Does not touch the dragon.
const $$=s=>[...document.querySelectorAll(s)];
const rocks=$$('.rock');
$$('.tabs button').forEach(b=>b.onclick=()=>{
  $$('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
  rocks.forEach(r=>{const show=b.dataset.f==='all'||r.dataset.c===b.dataset.f;r.classList.toggle('off',!show);r.classList.remove('in');if(show){void r.offsetWidth;r.classList.add('in')}});
});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
rocks.forEach((r,i)=>{r.style.animationDelay=(i%4)*.08+'s';io.observe(r)});
$$('.stone,.tabs button').forEach(b=>b.addEventListener('pointerdown',e=>{
  for(let i=0;i<9;i++){const c=document.createElement('i');c.className='chip';c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';
  c.style.setProperty('--dx',(Math.random()-.5)*140+'px');c.style.setProperty('--dy',(Math.random()*90-30)+'px');document.body.appendChild(c);setTimeout(()=>c.remove(),800)}
}));

// ---------- CRAZY BACKGROUND FX (sits between the lava and the page, below the dragon) ----------
(()=>{
if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
const cv=document.createElement('canvas');cv.id='bgfx';cv.style.cssText='z-index:1;pointer-events:none';
document.body.insertBefore(cv,document.querySelector('main'));
const g=cv.getContext('2d');let W,H;
const fit=()=>{const d=1;W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0)};fit();addEventListener('resize',fit);
const spr=(r,gc,b,a)=>{const s=document.createElement('canvas');s.width=s.height=96;const x=s.getContext('2d'),q=x.createRadialGradient(48,48,0,48,48,48);
q.addColorStop(0,`rgba(${r},${gc},${b},${a})`);q.addColorStop(.4,`rgba(${r},${gc*.45|0},${b},${a*.4})`);q.addColorStop(1,`rgba(${r},0,0,0)`);x.fillStyle=q;x.fillRect(0,0,96,96);return s};
const ORB=spr(255,170,40,1),HALO=spr(255,90,15,.55);
const R=Math.random,m={x:W/2,y:H/2,px:W/2,py:H/2,acc:0,t:0};
let cracks=[],orbs=[],rings=[],bits=[],pulse=0;
function crack(x,y,a,len,w,d){const pts=[[x,y]];let px=x,py=y,aa=a;
  for(let i=0,n=Math.ceil(len/14);i<n;i++){aa+=(R()-.5)*.9;px+=Math.cos(aa)*14;py+=Math.sin(aa)*14;pts.push([px,py]);
    if(d>0&&R()<.12)crack(px,py,aa+(R()<.5?-1:1)*(.5+R()*.6),len*.5*R()+30,w*.7,d-1)}
  cracks.push({pts,w,life:1,t:0});if(cracks.length>45)cracks.shift()}
function spray(x,y,n,up,spread){for(let i=0;i<n&&bits.length<200;i++)bits.push({x,y,vx:(R()-.5)*spread,vy:-(up*.4+R()*up),l:1,s:1.5+R()*3})}
addEventListener('pointermove',e=>{m.px=m.x;m.py=m.y;m.x=e.clientX;m.y=e.clientY;
  const d=Math.hypot(m.x-m.px,m.y-m.py);m.acc+=d;m.t=performance.now();
  if(d>2&&orbs.length<50)orbs.push({x:m.x+(R()-.5)*20,y:m.y+(R()-.5)*20,vx:(R()-.5)*1.2,vy:-.4-R()*1.2,r:14+R()*26,l:1});
  if(m.acc>240){m.acc=0;crack(m.x,m.y,R()*6.28,90+R()*90,1.6,1);spray(m.x,m.y,3,5,4)}});
addEventListener('contextmenu',e=>e.preventDefault());
let lastY=scrollY;addEventListener('scroll',()=>{if(Math.abs(scrollY-lastY)>260){lastY=scrollY;crack(R()*W,R()*H,R()*6.28,200+R()*200,2,2)}},{passive:true});
document.querySelectorAll('.rock,.stone,.tabs button').forEach(el=>el.addEventListener('pointerenter',()=>{
  const b=el.getBoundingClientRect();for(let i=0;i<8;i++)bits.length<200&&bits.push({x:b.left+R()*b.width,y:b.top+R()*8,vx:(R()-.5)*3,vy:-(3+R()*6),l:1,s:1.5+R()*2.5});
  crack(b.left+b.width/2,b.top+b.height/2,R()*6.28,140,1.4,1)}));
setInterval(()=>{if(document.hidden)return;spray(R()*W,H+10,8,15,5);if(R()<.3)crack(R()*W,H,-1.57+(R()-.5),220,2,1)},2600);
// rocks tilt toward the cursor
document.querySelectorAll('.rock').forEach(r=>{r.addEventListener('pointermove',e=>{const b=r.getBoundingClientRect();
  r.style.setProperty('--rx',((.5-(e.clientY-b.top)/b.height)*16).toFixed(1)+'deg');r.style.setProperty('--ry',(((e.clientX-b.left)/b.width-.5)*16).toFixed(1)+'deg')});
  r.addEventListener('pointerleave',()=>{r.style.removeProperty('--rx');r.style.removeProperty('--ry')})});
let last=0;(function tick(now){requestAnimationFrame(tick);if(document.hidden||now-last<33)return;last=now;g.clearRect(0,0,W,H);g.globalCompositeOperation='lighter';
  // heat halo that follows the cursor and throbs
  pulse*=.93;if(performance.now()-m.t<2500){const hr=180+Math.sin(now/260)*20+pulse*50;g.globalAlpha=.26+pulse*.2;g.drawImage(HALO,m.x-hr,m.y-hr,hr*2,hr*2)}
  // cracks grow, glow, fade
  g.lineJoin=g.lineCap='round';cracks=cracks.filter(c=>(c.life-=.0065)>0);
  cracks.forEach(c=>{c.t+=1.7;const n=Math.min(c.pts.length,Math.ceil(c.t)),a=Math.min(1,c.life*1.5);
    g.beginPath();for(let i=0;i<n;i++)i?g.lineTo(c.pts[i][0],c.pts[i][1]):g.moveTo(c.pts[i][0],c.pts[i][1]);
    g.globalAlpha=a*.3;g.strokeStyle='#ff4a0a';g.lineWidth=c.w*3;g.stroke();g.globalAlpha=a*.85;g.strokeStyle='#ffd27a';g.lineWidth=c.w;g.stroke()});
  // lava blobs trailing the cursor
  orbs=orbs.filter(o=>{o.x+=o.vx;o.y+=o.vy;o.vy-=.012;o.l-=.011;return o.l>0});
  orbs.forEach(o=>{g.globalAlpha=o.l*.5;const r=o.r*(.6+o.l*.6);g.drawImage(ORB,o.x-r,o.y-r,r*2,r*2)});
  // shockwaves
  rings=rings.filter(k=>{k.r+=18;k.l-=.035;return k.l>0});
  rings.forEach(k=>{g.globalAlpha=k.l*.7;g.strokeStyle='#ff8a2a';g.lineWidth=2+(1-k.l)*6;g.beginPath();g.arc(k.x,k.y,k.r,0,6.28);g.stroke()});
  // rock chips and embers
  bits=bits.filter(b=>{b.x+=b.vx;b.y+=b.vy;b.vy+=.2;b.l-=.013;return b.l>0});
  bits.forEach(b=>{g.globalAlpha=b.l;g.fillStyle=`rgb(255,${90+b.l*140|0},25)`;g.fillRect(b.x,b.y,b.s,b.s)});
  g.globalAlpha=1;g.globalCompositeOperation='source-over'})();
})();
