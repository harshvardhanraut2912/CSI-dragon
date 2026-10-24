import {drawHead} from './dragonHead.js';
const $=s=>document.querySelector(s);const mouse={x:innerWidth/2,y:innerHeight/2,t:0,down:0};
// ---------- LAVA SHADER ----------
const lc=$('#lava'),gl=lc.getContext('webgl');
const vs='attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';
const fs=`precision highp float;uniform vec2 r,m;uniform float t,b;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+7.;a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/r.y;vec2 mu=m/r.y;float d=distance(uv,mu);
vec2 q=uv*2.5+(uv-mu)*.25/(d+.3);q.y-=t*.12;
float w=fbm(q+fbm(q*1.5+t*.08)*2.);
float crack=1.-smoothstep(0.,.07,abs(w-.5));
float heat=exp(-d*3.)*.9+b;
vec3 c=mix(vec3(.02,0,0),vec3(.35,.02,0),w);
c+=crack*mix(vec3(1.,.25,0),vec3(1.,.85,.3),crack*heat+.2)*(1.+heat);
c+=vec3(.9,.25,.02)*exp(-d*5.)*.6;
c*=1.-.45*length(gl_FragCoord.xy/r-.5);
gl_FragColor=vec4(c,1);}`;
const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};
const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pg);gl.useProgram(pg);
gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const pl=gl.getAttribLocation(pg,'p');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
const U=k=>gl.getUniformLocation(pg,k);
// ---------- DRAGON + EMBERS ----------
const fx=$('#fx'),c=fx.getContext('2d');let W,H;
function size(){const d=Math.min(devicePixelRatio,1.5);W=innerWidth;H=innerHeight;lc.width=W*d*.6;lc.height=H*d*.6;lc.style.width=fx.style.width='100%';fx.width=W;fx.height=H;gl.viewport(0,0,lc.width,lc.height)}
size();addEventListener('resize',size);
const N=90,GAP=11,seg=[...Array(N)].map((_,i)=>({x:W/2-i*GAP,y:H/2,a:0,z:0}));
let pa=0,mode="wander",alt=0,time=0,boost=0,sparks=[],parts=[],smk=[],dist=0,breath=0,jaw=0,burst=0,nextAuto=5,hv=[0,0];
const LX=-.6,LY=-.8;
addEventListener('pointerdown',()=>{burst=time+1.7});
const rad=i=>(4+26*Math.pow(1-i/N,1.15))*(1+.1*Math.sin(i*.22))*(i<5?.75+i*.05:1);
const hs=(k,l,a=1)=>`hsla(${4+k*10},${92-k*35}%,${Math.max(3,Math.min(90,l))}%,${a})`;
const pt=(x,y,a,d,n=0)=>[x+Math.cos(a)*d-Math.sin(a)*n,y+Math.sin(a)*d+Math.cos(a)*n];
const poly=(P,f,s)=>{c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();if(f){c.fillStyle=f;c.fill()}if(s){c.strokeStyle=s;c.lineWidth=1;c.stroke()}};
// ---- fire sprites (colour ramp white-hot -> red -> soot) ----
const RAMP=[[255,255,235],[255,225,120],[255,150,30],[230,60,10],[110,12,4],[30,6,4]];
const ramp=t=>{t=Math.min(.999,t)*5;const i=t|0,f=t-i,a=RAMP[i],b=RAMP[i+1];return a.map((v,k)=>v+(b[k]-v)*f|0)};
const mk=(r,g,b,a)=>{const s=document.createElement('canvas');s.width=s.height=64;const x=s.getContext('2d'),q=x.createRadialGradient(32,32,0,32,32,32);q.addColorStop(0,`rgba(${r},${g},${b},${a})`);q.addColorStop(.45,`rgba(${r},${g},${b},${a*.45})`);q.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=q;x.fillRect(0,0,64,64);return s};
const SP=[...Array(24)].map((_,i)=>mk(...ramp(i/24),1)),SM=mk(45,40,38,.6);
// ---- strands (mane/whisker hair) ----
const strand=(x,y,a,len,sw)=>{c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a+sw*.5)*len*.55,y+Math.sin(a+sw*.5)*len*.55,x+Math.cos(a+sw)*len,y+Math.sin(a+sw)*len)};
// ---- legs: planted feet + two-bone IK, real stepping ----
const LEGS=[[14,1],[14,-1],[44,1],[44,-1]].map(([i,s])=>({i,s,f:null,sw:0,p:0,lift:0,sx:0,sy:0,tx:0,ty:0}));
function limb(A,B,w1,w2,k){const a=Math.atan2(B[1]-A[1],B[0]-A[0]),L=pt(A[0],A[1],a,0,w1),R=pt(A[0],A[1],a,0,-w1),g=c.createLinearGradient(L[0],L[1],R[0],R[1]),d=-Math.sin(a)*LX+Math.cos(a)*LY;
g.addColorStop(0,hs(k,d>0?56:14));g.addColorStop(.45,hs(k,34));g.addColorStop(1,hs(k,d>0?14:56));poly([L,pt(B[0],B[1],a,0,w2),pt(B[0],B[1],a,0,-w2),R],g,'#160000');
c.fillStyle=hs(k,30);c.beginPath();c.arc(B[0],B[1],w2*1.1,0,7);c.fill()}
function legs(){const spd=Math.hypot(hv[0],hv[1])/.6;
LEGS.forEach((g,n)=>{const b=seg[g.i],a=b.a,s=g.s,sc=.55+rad(g.i)/30,l1=44*sc*(1-.2*alt),l2=48*sc*(1-.2*alt),H=pt(b.x,b.y,a,0,s*rad(g.i)*.7),R=pt(b.x,b.y,a,14*sc,s*50*sc);
if(!g.f||alt>.5){g.f=R.slice();g.sw=0;g.lift=0}
if(alt>.5){}else if(g.sw){g.p=Math.min(1,g.p+.09+spd*.016);const e=g.p*g.p*(3-2*g.p);g.f=[g.sx+(g.tx-g.sx)*e,g.sy+(g.ty-g.sy)*e];g.lift=Math.sin(g.p*Math.PI);if(g.p>=1)g.sw=0}
else{g.lift*=.8;if(Math.hypot(g.f[0]-R[0],g.f[1]-R[1])>58*sc&&!LEGS[3-n].sw){g.sw=1;g.p=0;g.sx=g.f[0];g.sy=g.f[1];const T=pt(R[0],R[1],a,40*sc+spd*3);g.tx=T[0];g.ty=T[1]}}
const e=Math.min(1,alt*1.1),T2=pt(b.x,b.y,a,-(l1+l2)*.7+Math.sin(time*3+n)*4,s*(rad(g.i)+6)),FF=[g.f[0]+(T2[0]-g.f[0])*e,g.f[1]+(T2[1]-g.f[1])*e],dx=FF[0]-H[0],dy=FF[1]-H[1],dd=Math.max(12,Math.min(Math.hypot(dx,dy),l1+l2-2)),base=Math.atan2(dy,dx),A=Math.acos(Math.max(-1,Math.min(1,(l1*l1+dd*dd-l2*l2)/(2*l1*dd))));
const K0=[H[0]+Math.cos(base+s*A)*l1,H[1]+Math.sin(base+s*A)*l1],q=Math.hypot(FF[0]-K0[0],FF[1]-K0[1])||1,F0=[K0[0]+(FF[0]-K0[0])/q*l2,K0[1]+(FF[1]-K0[1])/q*l2],au=a+s*(Math.PI-.55),Kf=[H[0]+Math.cos(au)*l1*.9,H[1]+Math.sin(au)*l1*.9],ab=a+s*(Math.PI-.2+Math.sin(time*2.5+n)*.12),Ff=[Kf[0]+Math.cos(ab)*l2*.85,Kf[1]+Math.sin(ab)*l2*.85],Tg=pt(b.x,b.y,a,-(l1+l2)*.75+Math.sin(time*4+n)*3,s*(rad(g.i)+10)+Math.sin(time*5+n*2)*3);
if(e<.02||!g.P){g.P=Tg.slice();g.V=[0,0]}else{g.V[0]=(g.V[0]+(Tg[0]-g.P[0])*.09)*.88;g.V[1]=(g.V[1]+(Tg[1]-g.P[1])*.09)*.88;g.P[0]+=g.V[0]-hv[0]*.35;g.P[1]+=g.V[1]-hv[1]*.35;const px=g.P[0]-H[0],py=g.P[1]-H[1],pl=Math.hypot(px,py),mx=(l1+l2)*.93;if(pl>mx){g.P[0]=H[0]+px/pl*mx;g.P[1]=H[1]+py/pl*mx}}
const pb=Math.atan2(g.P[1]-H[1],g.P[0]-H[0]),pd=Math.max(14,Math.min(Math.hypot(g.P[0]-H[0],g.P[1]-H[1]),l1+l2-2)),pA=Math.acos(Math.max(-1,Math.min(1,(l1*l1+pd*pd-l2*l2)/(2*l1*pd)))),Kp=[H[0]+Math.cos(pb-s*pA)*l1,H[1]+Math.sin(pb-s*pA)*l1],pq=Math.hypot(g.P[0]-Kp[0],g.P[1]-Kp[1])||1,Fp=[Kp[0]+(g.P[0]-Kp[0])/pq*l2,Kp[1]+(g.P[1]-Kp[1])/pq*l2],
K=[K0[0]+(Kp[0]-K0[0])*e,K0[1]+(Kp[1]-K0[1])*e],F=[F0[0]+(Fp[0]-F0[0])*e,F0[1]+(Fp[1]-F0[1])*e];
c.fillStyle=`rgba(0,0,0,${(.3-g.lift*.15)*(1-alt)})`;c.beginPath();c.ellipse(F[0]+10+g.lift*16,F[1]+14+g.lift*22,13*sc,8*sc,0,0,7);c.fill();
limb(H,K,13*sc*(1+.3*alt),9*sc*(1+.3*alt),.12);limb(K,F,9*sc*(1+.3*alt),5.5*sc*(1+.3*alt),.14);c.strokeStyle='#ff6a2a';c.lineWidth=1.3;c.beginPath();for(let q=0;q<6;q++)strand(K[0],K[1],a+Math.PI+(q-2.5)*.3,22*sc,Math.sin(time*4+q+n)*.4);c.stroke();
const fa=Math.atan2(F[1]-K[1],F[0]-K[0]),ps=1+g.lift*.3;c.fillStyle=hs(.12,26);c.beginPath();c.arc(F[0],F[1],6*sc*ps,0,7);c.fill();
[-.7,-.25,.25,.7].forEach(t=>{const ta=fa+t*.8*(1-.7*alt),T=pt(F[0],F[1],ta,15*sc*ps),C=pt(F[0],F[1],ta,22*sc*ps,t*3-t*7*alt);c.lineCap='round';c.strokeStyle='#2a0505';c.lineWidth=5*sc;c.beginPath();c.moveTo(F[0],F[1]);c.lineTo(T[0],T[1]);c.stroke();c.strokeStyle=hs(.15,38);c.lineWidth=2.8*sc;c.stroke();
poly([pt(T[0],T[1],ta,0,-2.2*sc),C,pt(T[0],T[1],ta,0,2.2*sc)],'#efe2c6','#2a2010')});c.lineCap='butt';
c.fillStyle=hs(.1,24);c.beginPath();c.arc(H[0],H[1],15*sc,0,7);c.fill()})}
// ---- mane along the back + tail tuft ----
function mane(){const cs=['#4a0508','#c3201a','#ff6a2a'];for(let j=0;j<3;j++){c.strokeStyle=cs[j];c.lineWidth=1.3+j*.4;c.beginPath();
for(let i=4;i<N;i++){const s=seg[i],r=rad(i),gr=Math.min(1,(i-3)/9),p=pt(s.x,s.y,s.a,-j*3.5,(j-1)*r*.5);strand(p[0],p[1],s.a+Math.PI+(j-1)*.55,(r*1.4+12)*(1+.25*(j%2))*gr,Math.sin(time*3-i*.25+j)*.3)}c.stroke()}
const t=seg[N-1];[0,1].forEach(w=>{c.strokeStyle=w?'#ff7a30':'#9a1210';c.lineWidth=1.8;c.beginPath();for(let q=0;q<14;q++){const f=q/13-.5;strand(t.x,t.y,t.a+Math.PI+f*1.4,(70-Math.abs(f)*50)*(.8+w*.3),Math.sin(time*4+q)*.3)}c.stroke()})}
// ---- body: lit tube, scales, crystal spines ----
function body(){const E=seg.map((s,i)=>{const r=rad(i)*(1+s.z*.1);return[pt(s.x,s.y,s.a,0,r),pt(s.x,s.y,s.a,0,-r),r]});
for(let i=N-1;i>0;i--){const s=seg[i],k=i/N,[L,R]=E[i],[L2,R2]=E[i-1],d=-Math.sin(s.a)*LX+Math.cos(s.a)*LY,hp=Math.min(.85,Math.max(.15,.5-.3*d)),l=34*(1-k*.55)+s.z*5,g=c.createLinearGradient(L[0],L[1],R[0],R[1]);
g.addColorStop(0,hs(k,l*.45));g.addColorStop(hp,hs(k,l*1.5));g.addColorStop(1,hs(k,l*.3));poly([L,R,R2,L2],g,g)}
c.strokeStyle='rgba(20,0,0,.55)';c.lineWidth=1.2;c.beginPath();
for(let i=1;i<N;i++){const s=seg[i],r=E[i][2];for(const j of[-.62,0,.62]){const p=pt(s.x,s.y,s.a,(i%2)*GAP*.4,r*j),sr=r*.34+1,a0=s.a+Math.PI-1.2;c.moveTo(p[0]+Math.cos(a0)*sr,p[1]+Math.sin(a0)*sr);c.arc(p[0],p[1],sr,a0,a0+2.4)}}c.stroke();
for(let i=N-1;i>0;i--){const s=seg[i],k=i/N,r=E[i][2],y=s.y-s.z*3,d=-Math.sin(s.a)*LX+Math.cos(s.a)*LY;
const gr=Math.min(1,Math.max(0,(i-3)/9));if(i%4==1&&gr>0)[-1,1].forEach(sd=>poly([pt(s.x,s.y,s.a,0,sd*r),pt(s.x,s.y,s.a,-(r*1.2+6)*gr,sd*(r+(r*.9+8)*gr)),pt(s.x,s.y,s.a,-GAP*1.4,sd*r)],hs(k,18),'#100'));
if(i%2==0&&gr>0){const q=(r+9)*gr,F=pt(s.x,y,s.a,q*.25),Lf=pt(s.x,y,s.a,-q*.1,q*.4),Rf=pt(s.x,y,s.a,-q*.1,-q*.4),T=pt(s.x,y,s.a,-q*1.35);
poly([F,Lf,T],hs(k,d>0?60:30),'#200');poly([F,Rf,T],hs(k,d>0?30:60),'#200');poly([F,Lf,Rf],hs(k,52,.9))}}}
// ---- head: realistic top-view dragon head lives in dragonHead.js ----
function head(){const h=seg[0];c.save();c.translate(h.x,h.y);c.rotate(h.a);c.scale(1.2,1.2);
drawHead(c,{time,jaw,breath,a:h.a});c.restore()}
// ---- fire: world-space particle physics -> heat buffer -> cel-shaded flame shader ----
const fc=$('#flame'),fg=fc.getContext('webgl',{premultipliedAlpha:true,alpha:true}),FS=.6,hc=document.createElement('canvas'),hx=hc.getContext('2d');
function fsz(){fc.width=hc.width=W*FS|0;fc.height=hc.height=H*FS|0;fg.viewport(0,0,fc.width,fc.height)}fsz();addEventListener('resize',fsz);
const BL=(()=>{const s=document.createElement('canvas');s.width=s.height=64;const x=s.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return s})();
const ffs=`precision highp float;uniform sampler2D tx;uniform vec2 r;uniform float t;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+7.;a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/r;
vec2 wv=vec2(fbm(uv*vec2(16.,9.)+vec2(0.,t*1.2)),fbm(uv*vec2(16.,9.)+vec2(5.,-t*1.2)))-.5;
float hh=texture2D(tx,uv+wv*.022).r;
if(hh<.01){gl_FragColor=vec4(0);return;}
float tex=fbm(uv*vec2(34.,20.)+vec2(0.,-t*2.));
float f=hh*1.05-.1+(tex-.5)*.5*smoothstep(0.,.35,hh);
float S0=smoothstep(.03,.06,f),S1=smoothstep(.125,.155,f),S2=smoothstep(.245,.275,f);
vec3 col=vec3(.35,.04,.03);float a=.5*S0;a=mix(a,.92,S1);col=mix(col,vec3(.62,.07,.04),S1);a=mix(a,1.,S2);col=mix(col,vec3(.93,.22,.03),S2);
col=mix(col,vec3(1.,.5,.02),smoothstep(.385,.415,f));col=mix(col,vec3(1.,.78,.08),smoothstep(.545,.575,f));col=mix(col,vec3(1.,.95,.55),smoothstep(.74,.77,f));
gl_FragColor=vec4(col*a,a);}`;
const fp=fg.createProgram();[[fg.VERTEX_SHADER,vs],[fg.FRAGMENT_SHADER,ffs]].forEach(([t,s])=>{const o=fg.createShader(t);fg.shaderSource(o,s);fg.compileShader(o);fg.attachShader(fp,o)});fg.linkProgram(fp);fg.useProgram(fp);
fg.bindBuffer(fg.ARRAY_BUFFER,fg.createBuffer());fg.bufferData(fg.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),fg.STATIC_DRAW);
const fpl=fg.getAttribLocation(fp,'p');fg.enableVertexAttribArray(fpl);fg.vertexAttribPointer(fpl,2,fg.FLOAT,false,0,0);fg.enable(fg.BLEND);fg.blendFunc(fg.ONE,fg.ONE_MINUS_SRC_ALPHA);
const tex0=fg.createTexture();fg.bindTexture(fg.TEXTURE_2D,tex0);[[fg.TEXTURE_MIN_FILTER,fg.LINEAR],[fg.TEXTURE_MAG_FILTER,fg.LINEAR],[fg.TEXTURE_WRAP_S,fg.CLAMP_TO_EDGE],[fg.TEXTURE_WRAP_T,fg.CLAMP_TO_EDGE]].forEach(([k,v])=>fg.texParameteri(fg.TEXTURE_2D,k,v));fg.pixelStorei(fg.UNPACK_FLIP_Y_WEBGL,true);
const FU=k=>fg.getUniformLocation(fp,k);let pm=null;
function fire(){const h=seg[0],k=1+.14*alt,M=pt(h.x,h.y,h.a,98*k);if(!pm)pm=M.slice();
const vel=[hv[0]/.6,hv[1]/.6];
if(breath>.15){const nn=Math.ceil(breath*9);for(let i=0;i<nn;i++){const lick=Math.random()<.2,sp=((lick?6:10)+Math.random()*(lick?5:8))*Math.min(1,breath*1.1),an=h.a+(Math.random()-.5)*(lick?.45:.2),f=Math.random();
parts.push({x:pm[0]+(M[0]-pm[0])*f,y:pm[1]+(M[1]-pm[1])*f,vx:Math.cos(an)*sp+vel[0],vy:Math.sin(an)*sp+vel[1],t:0,dec:.016+Math.random()*.016,sz:lick?1.3:.8+Math.random()*.4,ph:Math.random()*6.28})}}
pm=M;
parts=parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;const tb=.25+p.t*1.4;p.vx=p.vx*.968+Math.sin(p.y*.03+time*3+p.ph)*.5*tb;p.vy=p.vy*.968+Math.cos(p.x*.03-time*3+p.ph)*.5*tb-.06-p.t*.12;p.t+=p.dec;
if(p.t<.6&&Math.random()<.012)sparks.push({x:p.x,y:p.y,vx:p.vx*.5+Math.random()*3-1.5,vy:p.vy*.5+Math.random()*3-1.5,l:1,s:1+Math.random()*1.6});return p.t<1});
if(parts.length>700)parts.splice(0,parts.length-700);
fg.clearColor(0,0,0,0);fg.clear(fg.COLOR_BUFFER_BIT);
if(parts.length){hx.globalCompositeOperation='source-over';hx.fillStyle='#000';hx.fillRect(0,0,hc.width,hc.height);hx.globalCompositeOperation='lighter';
parts.forEach(p=>{const r=(10+p.t*24)*p.sz;hx.globalAlpha=Math.min(1,.3*Math.pow(1-p.t,1.2)*(.6+p.sz*.4));hx.drawImage(BL,(p.x-r)*FS,(p.y-r)*FS,r*2*FS,r*2*FS)});hx.globalAlpha=1;
fg.bindTexture(fg.TEXTURE_2D,tex0);fg.texImage2D(fg.TEXTURE_2D,0,fg.RGBA,fg.RGBA,fg.UNSIGNED_BYTE,hc);fg.uniform1i(FU('tx'),0);fg.uniform2f(FU('r'),fc.width,fc.height);fg.uniform1f(FU('t'),time);fg.drawArrays(fg.TRIANGLES,0,3)}
smk=smk.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.97;p.vy=p.vy*.97-.02;p.s+=.5;p.t+=p.dec;return p.t<1});
smk.forEach(p=>{c.globalAlpha=(1-p.t)*.12;c.drawImage(SM,p.x-p.s,p.y-p.s,p.s*2,p.s*2)});c.globalAlpha=1}
function embers(){if(Math.random()<.5)sparks.push({x:Math.random()*W,y:H+10,vx:(Math.random()-.5)*1.5,vy:-1-Math.random()*3,l:1,s:1+Math.random()*2.5});
c.globalCompositeOperation='lighter';sparks=sparks.filter(p=>{p.x+=p.vx+Math.sin(time*3+p.y*.02)*.6;p.y+=p.vy;p.vx*=.99;p.l-=.006;return p.l>0});
sparks.forEach(p=>{c.fillStyle=`rgba(255,${100+p.l*130|0},30,${p.l})`;c.fillRect(p.x,p.y,p.s,p.s)});c.globalCompositeOperation='source-over'}
// ---- main dragon update + render ----
const WS={pat:'cruise',until:0,om:0,ph:0};
function wanderSteer(h){const M=150;if(time>WS.until){const r=Math.random();WS.pat=r<.4?'cruise':r<.75?'arc':'weave';WS.until=time+3+Math.random()*4;WS.om=(Math.random()<.5?-1:1)*(.006+Math.random()*.01);WS.ph=time}
let t=0;if(WS.pat=='cruise')t=Math.sin(time*.5)*.003;else if(WS.pat=='arc')t=WS.om;else t=Math.cos((time-WS.ph)*1.1)*.009;
const pc=Math.min(1,Math.max(0,(M-h.x)/M,(h.x-(W-M))/M,(M-h.y)/M,(h.y-(H-M))/M)),ac=Math.atan2(H/2-h.y,W/2-h.x),da=((ac-h.a+Math.PI*3)%(Math.PI*2))-Math.PI;
return t*(1-pc)+da*pc*.04}
let amp=1;const FP={type:'wander',until:0,wx:0,wy:0,cx:0,cy:0,R:0,dir:1};
function flightTarget(h){const M=90,rp=()=>[M+Math.random()*(W-2*M),M+Math.random()*(H-2*M)];
if(time>FP.until){const r=Math.random();FP.type=r<.3?'line':r<.6?'circle':'wander';FP.until=time+4+Math.random()*5;
if(FP.type=='circle'){FP.R=Math.max(90,Math.min(230,Math.min(W,H)/2-M))*(.6+Math.random()*.4);FP.dir=Math.random()<.5?1:-1;const R=FP.R;FP.cx=Math.max(R+M,Math.min(W-R-M,h.x+Math.cos(h.a+FP.dir*Math.PI/2)*R));FP.cy=Math.max(R+M,Math.min(H-R-M,h.y+Math.sin(h.a+FP.dir*Math.PI/2)*R))}
else if(FP.type=='line'){let ok=0;for(let q=0;q<10&&!ok;q++){const an=h.a+(Math.random()-.5)*.7,L=400+Math.random()*400,x=h.x+Math.cos(an)*L,y=h.y+Math.sin(an)*L;if(x>M&&x<W-M&&y>M&&y<H-M){FP.wx=x;FP.wy=y;ok=1}}if(!ok)[FP.wx,FP.wy]=rp()}
else[FP.wx,FP.wy]=rp()}
if(FP.type=='circle'){const th=Math.atan2(h.y-FP.cy,h.x-FP.cx)+FP.dir*.45;return[FP.cx+Math.cos(th)*FP.R,FP.cy+Math.sin(th)*FP.R]}
if(Math.hypot(FP.wx-h.x,FP.wy-h.y)<(FP.type=='line'?140:120)){if(FP.type=='line')FP.until=0;else[FP.wx,FP.wy]=rp()}
return[FP.wx,FP.wy]}
function drawDragon(){const idle=time-mouse.t>3;if(idle){if(mode!='wander'){mode='wander';FP.until=0}}else if(mode=='wander')mode='approach';
const h=seg[0];let tx=mouse.x,ty=mouse.y;amp+=((mode=='wander'?(WS.pat=='cruise'?.25:WS.pat=='arc'?.6:.9):.9)-amp)*.03;
const dx=tx-h.x,dy=ty-h.y,d=Math.hypot(dx,dy);
if(mode=='approach'&&d<120)mode='walk';if(mode=='walk'&&d>420)mode='approach';
alt+=((mode=='walk'?0:1)-alt)*.04;
let sp;const angd=v=>((v+Math.PI*3)%(Math.PI*2))-Math.PI;
if(mode=='wander'){h.a+=wanderSteer(h);sp=3.4+Math.sin(time*.4)*.7}
else{const da=angd(Math.atan2(dy,dx)-h.a),dead=mode=='walk'?36:14,cap=mode=='walk'?9:6.5+boost;sp=d<dead?0:Math.min(d*.06,cap)*(mode=='walk'?1:Math.max(.3,Math.cos(da)*.7+.3));if(sp>0)h.a+=da*(mode=='walk'?.18:.1)}
h.x+=Math.cos(h.a)*sp;h.y+=Math.sin(h.a)*sp+(sp>0?Math.sin(time*5)*.6*alt:0);hv=[Math.cos(h.a)*sp*.6,Math.sin(h.a)*sp*.6];boost*=.94;dist+=sp;
for(let i=0;i<N;i++){const s=seg[i];s.z=Math.sin(time*2.4-i*.16);if(i){const p=seg[i-1],a=Math.atan2(p.y-s.y,p.x-s.x),w=Math.sin(time*3-i*.3)*alt*amp*1.4;s.a=a;s.x=p.x-Math.cos(a)*GAP-Math.sin(a)*w;s.y=p.y-Math.sin(a)*GAP+Math.cos(a)*w+Math.sin(time*4-i*.3)*.35}}
if(time>nextAuto&&mode=='wander'&&alt>.95){burst=time+.8+Math.random()*1.3;nextAuto=time+1.5+Math.random()*6}
const on=time<burst&&(alt>.95||alt<.03)?1:0;breath+=(on-breath)*.18;jaw+=(on-jaw)*.2;
const ox=34+alt*70,oy=48+alt*100;c.fillStyle=`rgba(0,0,0,${.3-alt*.17})`;c.beginPath();seg.forEach((s,i)=>{if(i%2==0){const r=rad(i)*.9*(1-.35*alt);c.moveTo(s.x+ox-s.z*10+r,s.y+oy);c.arc(s.x+ox-s.z*10,s.y+oy,r,0,7)}});c.fill();
if(pa>.12&&alt<=.12)LEGS.forEach(g=>{for(let q=0;q<6;q++)smk.push({x:g.f[0],y:g.f[1],vx:Math.random()*4-2,vy:Math.random()*4-2,t:.15,dec:.03,s:10})});pa=alt;
c.save();c.translate(h.x,h.y);const k=1+.14*alt;c.scale(k,k);c.translate(-h.x,-h.y);legs();body();mane();head();fire();c.restore()}
// ---------- LOOP ----------
const glow=$('#glow'),T=$('#title');let gx=0,gy=0;
function loop(ms){time=ms/1000;gl.uniform2f(U('r'),lc.width,lc.height);gl.uniform2f(U('m'),mouse.x/W*lc.width,(1-mouse.y/H)*lc.height);gl.uniform1f(U('t'),time);gl.uniform1f(U('b'),Math.min(boost*.04,.6));gl.drawArrays(gl.TRIANGLES,0,3);
c.clearRect(0,0,W,H);embers();drawDragon();
gx+=(mouse.x-gx)*.3;gy+=(mouse.y-gy)*.3;glow.style.transform=`translate(${gx}px,${gy}px) scale(${1+boost*.05})`;
T.style.transform=`translate(${(mouse.x/W-.5)*-30}px,${(mouse.y/H-.5)*-20}px)`;requestAnimationFrame(loop)}
addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.t=time});
addEventListener('pointerdown',()=>{boost=22;document.body.animate([{translate:'0'},{translate:'6px -6px'},{translate:'-6px 6px'},{translate:'0'}],{duration:250})});
requestAnimationFrame(loop);
// ---------- UI ----------
setInterval(()=>{T.classList.add('glitch');setTimeout(()=>T.classList.remove('glitch'),180)},3500);
const target=new Date('2026-12-05T09:00:00').getTime(); // <-- change to your XENIA date
const cd=$('#cd');setInterval(()=>{let d=Math.max(0,target-Date.now())/1000;cd.innerHTML=[['days',86400],['hrs',3600],['min',60],['sec',1]].map(([l,s])=>{const v=Math.floor(d/s);d-=v*s;return `<div><b>${String(v).padStart(2,0)}</b>${l}</div>`}).join('')},500);
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const b=e.target;io.unobserve(b);const n=+b.dataset.n;let v=0;const k=setInterval(()=>{v=Math.min(n,v+Math.ceil(n/40));b.textContent=v;if(v>=n)clearInterval(k)},35)}}));
document.querySelectorAll('[data-n]').forEach(b=>io.observe(b));
