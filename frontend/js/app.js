/* DIMORA app bundle — engine, model, AI, 3D, 2D editor, tour, auth, marketing hero */
(function(){'use strict';
/* ===================== DIMORA 3D ENGINE (WebGL2, zero-dependency) ===================== */
const V3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
const M4 = {
  id() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  ortho(l, r, b, t, n, f) { const o = M4.id(); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); return o; },
  lookAt(e, c, u) {
    const z = V3.norm(V3.sub(e, c)); let x = V3.cross(u, z);
    if (V3.len(x) < 1e-6) x = V3.cross([0, 0, 1], z);
    x = V3.norm(x); const y = V3.cross(z, x);
    const o = new Float32Array(16);
    o[0] = x[0]; o[4] = x[1]; o[8] = x[2]; o[12] = -V3.dot(x, e);
    o[1] = y[0]; o[5] = y[1]; o[9] = y[2]; o[13] = -V3.dot(y, e);
    o[2] = z[0]; o[6] = z[1]; o[10] = z[2]; o[14] = -V3.dot(z, e);
    o[15] = 1; return o;
  },
  inv(m) {
    const a = m, o = new Float32Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return M4.id(); det = 1 / det;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    return o;
  },
  // T * Ry * Rx * Rz * S(1,sy,1)
  trs(tx, ty, tz, ry = 0, sy = 1, rx = 0, rz = 0) {
    let m = M4.id();
    m[12] = tx; m[13] = ty; m[14] = tz;
    if (ry) { const c = Math.cos(ry), s = Math.sin(ry), r = M4.id(); r[0] = c; r[2] = -s; r[8] = s; r[10] = c; m = M4.mul(m, r); }
    if (rx) { const c = Math.cos(rx), s = Math.sin(rx), r = M4.id(); r[5] = c; r[6] = s; r[9] = -s; r[10] = c; m = M4.mul(m, r); }
    if (rz) { const c = Math.cos(rz), s = Math.sin(rz), r = M4.id(); r[0] = c; r[1] = s; r[4] = -s; r[5] = c; m = M4.mul(m, r); }
    if (sy !== 1) { const r = M4.id(); r[5] = sy; m = M4.mul(m, r); }
    return m;
  },
};
function hexToRgb(h) {
  h = (h || '#888888').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join(''); }

/* ---------- shaders: physically-based look, procedural materials with relief, sky, soft shadows ---------- */
// Shared sky model (linear colour): gradient + sun disc/glow + soft clouds + stars at night.
const SKY_GLSL = `
uniform vec3 uZenith, uHorizon, uGroundCol, uSunCol, uSunDir; uniform float uNight, uClouds;
float sh21(vec2 p){ p=fract(p*vec2(233.34,851.73)); p+=dot(p,p+23.45); return fract(p.x*p.y); }
float snoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(sh21(i),sh21(i+vec2(1,0)),f.x), mix(sh21(i+vec2(0,1)),sh21(i+vec2(1,1)),f.x), f.y); }
float sfbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*snoise(p); p=p*2.07+vec2(1.7,9.2); a*=0.5;} return s; }
vec3 skyCol(vec3 d, bool detail){
  float y = d.y;
  vec3 c = y >= 0.0 ? mix(uHorizon, uZenith, pow(clamp(y,0.0,1.0), 0.42)) : mix(uHorizon, uGroundCol, clamp(-y*2.5,0.0,1.0));
  float sd = max(dot(d,uSunDir),0.0);
  float above = smoothstep(-0.02, 0.02, y);
  c += uSunCol*(pow(sd,64.0)*0.18 + pow(sd,6.0)*0.05)*above;
  if(detail){
    c += uSunCol*smoothstep(0.9993,0.9997,sd)*6.0*above;
    if(y>0.0 && uClouds>0.0){
      vec2 cp = d.xz/(y+0.12)*0.9;
      float n = sfbm(cp*1.3 + vec2(3.0,1.0));
      float cl = smoothstep(0.52, 0.78, n)*smoothstep(0.0, 0.25, y)*uClouds;
      vec3 cc = mix(uHorizon*1.05, vec3(1.0)*(0.25+0.75*(1.0-uNight)), 0.75) + uSunCol*0.06*pow(sd,4.0);
      c = mix(c, cc, cl*0.85);
    }
    if(uNight>0.0 && y>0.0){ vec2 sp = floor(d.xz/(y+0.3)*420.0); float st = step(0.9965, sh21(sp)); c += vec3(st)*uNight*0.9*smoothstep(0.05,0.3,y); }
  }
  return c;
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
`;
const VS_MAIN = `#version 300 es
in vec3 aPos; in vec3 aNor;
uniform mat4 uModel, uVP, uLVP;
out vec3 vW; out vec3 vN; out vec4 vL;
void main(){ vec4 w = uModel*vec4(aPos,1.0); vW=w.xyz; vN=mat3(uModel)*aNor; vL=uLVP*w; gl_Position=uVP*w; }`;
const FS_MAIN = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec4 vL;
uniform vec3 uColor, uColor2, uEmissive, uCam;
uniform float uAlpha, uPatScale, uAmb, uFog, uHL, uRough, uMetal, uExposure, uShadowTexel, uBump;
uniform int uPattern, uShadowOn, uNL;
uniform sampler2DShadow uShadow;
uniform vec3 uLP[16]; uniform vec3 uLC[16]; uniform float uLR[16];
${SKY_GLSL}
out vec4 outColor;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5;} return s; }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
const vec2 PD[12] = vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),
  vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));
float shadowF(vec3 N){
  if(uShadowOn==0) return 1.0;
  vec3 p = vL.xyz/vL.w*0.5+0.5;
  if(p.z>1.0||p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0) return 1.0;
  float bias = max(0.0018*(1.0-dot(N,uSunDir)), 0.0005);
  float a = h21(gl_FragCoord.xy)*6.2832; mat2 R = mat2(cos(a),sin(a),-sin(a),cos(a));
  float s=0.0; for(int i=0;i<12;i++) s += texture(uShadow, vec3(p.xy + R*PD[i]*uShadowTexel*1.8, p.z-bias));
  return s/12.0;
}
// bump mapping from a procedural height field (Mikkelsen, surface gradient via screen derivatives)
vec3 bumpN(vec3 N, float h, float k){
  vec3 dpx=dFdx(vW), dpy=dFdy(vW); float dhx=dFdx(h), dhy=dFdy(h);
  vec3 r1=cross(dpy,N), r2=cross(N,dpx); float det=dot(dpx,r1);
  if(abs(det)<1e-12) return N;
  vec3 g=sign(det)*(dhx*r1+dhy*r2);
  return normalize(abs(det)*N - k*g);
}
float gD(float NdH, float a){ float a2=a*a; float d=NdH*NdH*(a2-1.0)+1.0; return a2/(3.14159*d*d); }
float gV(float NdV, float NdL, float a){ float k=(a+1.0)*(a+1.0)/8.0; return 1.0/((NdV*(1.0-k)+k)*(NdL*(1.0-k)+k)); }
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 base = uColor; vec3 c2 = uColor2;
  vec3 an = abs(N);
  bool flat_ = an.y > max(an.x, an.z);
  vec2 uv = flat_ ? vW.xz : (an.x > an.z ? vec2(vW.z, vW.y) : vec2(vW.x, vW.y));
  uv /= max(uPatScale,0.001);
  float h = 0.0, rough = 0.82, bk = 1.0;
  float af = clamp(1.0 - length(fwidth(uv))*2.5, 0.0, 1.0);   // 1 = close-up, 0 = detail smaller than a pixel
  float wa = clamp(1.0 - length(fwidth(vW.xz))*12.0, 0.0, 1.0);
  bool glass = false;
  if(uPattern==1){ // wood planks
    float row=floor(uv.y); float along=uv.x+h21(vec2(row,7.0))*6.0; float seg=floor(along/6.0);
    float t=h21(vec2(row,seg)); base*=0.82+0.3*t; base=mix(base, c2, 0.25*h21(vec2(seg,row*3.1)));
    float grain=fbm(vec2(along*0.6, uv.y*14.0)+t*10.0); base*=0.86+0.24*grain;
    float fy=fract(uv.y), fx=fract(along/6.0);
    float gap = (fy<0.03||fy>0.988||fx<0.004) ? 1.0 : 0.0; base*=1.0-0.38*gap;
    h = -gap*0.0015*uPatScale + grain*0.00025; rough = 0.42 + 0.2*grain;
  } else if(uPattern==2){ // tiles with grout
    vec2 g=fract(uv); float e=min(min(g.x,1.0-g.x),min(g.y,1.0-g.y));
    base*=0.94+0.08*h21(floor(uv)); base*=0.96+0.06*fbm(uv*3.0);
    float gr = (1.0-smoothstep(0.012,0.024,e))*af; base=mix(base, mix(base,c2,0.06), 1.0-af); base=mix(base, c2, gr);
    h = -gr*0.0025*uPatScale; rough = mix(0.22, 0.85, gr);
  } else if(uPattern==3){ // marble
    float n=fbm(uv*1.6); float v=abs(sin(uv.x*2.2+uv.y*1.3+n*7.0));
    base=mix(c2, base, smoothstep(0.0,0.12,v)); base*=0.97+0.05*fbm(uv*9.0);
    vec2 g=fract(uv*0.5); float e=min(min(g.x,1.0-g.x),min(g.y,1.0-g.y)); float j = e<0.004 ? 1.0 : 0.0; base*=1.0-0.1*j;
    h = -j*0.001; rough = 0.14;
  } else if(uPattern==4){ // carpet / fabric
    float f1=h21(floor(vW.xz*160.0)+floor(vW.y*160.0)); base*=0.9+0.2*f1; float f2=fbm((flat_?vW.xz:vec2(vW.x+vW.z,vW.y))*6.0); base*=0.93+0.1*f2;
    h = f2*0.0012; rough = 0.95;
  } else if(uPattern==5){ // herringbone
    vec2 cell=floor(uv); vec2 f=fract(uv); float k=mod(cell.x+cell.y,2.0);
    float l = k<0.5? f.x: f.y; float stripe=floor(l*3.0);
    base*=0.84+0.28*h21(cell*3.1+stripe); float gp = fract(l*3.0)<0.06 ? 1.0 : 0.0; base*=1.0-0.35*gp;
    float ed = min(min(f.x,1.0-f.x),min(f.y,1.0-f.y))<0.02 ? 1.0 : 0.0; base*=1.0-0.3*ed;
    h = -(gp+ed)*0.0008; rough = 0.45;
  } else if(uPattern==6){ // kota / granite / stone slabs
    vec2 g=fract(uv); float e=min(min(g.x,1.0-g.x),min(g.y,1.0-g.y));
    float n = fbm(uv*2.5+h21(floor(uv))*7.0); base=mix(base, c2, n*0.7);
    base *= 0.94 + 0.1*h21(floor(vW.xz*220.0));
    float j = 1.0-smoothstep(0.006,0.012,e); base*=1.0-0.3*j; h = -j*0.0015 + n*0.0002; rough = 0.3;
  } else if(uPattern==7){ // stripes / wallpaper / curtain folds
    float s=step(0.5, fract(uv.x)); base=mix(base, c2, s*0.55); h = sin(uv.x*6.2832)*0.002; rough = 0.9;
  } else if(uPattern==8){ // polished concrete
    float n = fbm(uv*1.5); base*=0.86+0.22*n; base*=0.95+0.08*h21(floor(vW.xz*90.0)); h = n*0.0003; rough = 0.35;
  } else if(uPattern==9){ // brick
    vec2 b = uv*vec2(1.0/0.23, 1.0/0.075); float row=floor(b.y); b.x += mod(row,2.0)*0.5;
    vec2 f = fract(b); vec2 id = floor(b);
    float m = 1.0 - smoothstep(0.04,0.08, min(min(f.x,1.0-f.x)*0.23, min(f.y,1.0-f.y)*0.075)/0.012);
    vec3 bc = base*(0.78+0.35*h21(id)) * (0.9+0.2*fbm(uv*40.0));
    base = mix(bc, c2, m); h = -m*0.006 + fbm(uv*30.0)*0.0006; rough = 0.92;
  } else if(uPattern==10){ // exterior plaster / textured render
    float n1 = fbm(uv*3.0), n2 = vnoise(uv*90.0), n3 = fbm(uv*0.35);
    base *= 0.93 + 0.07*n1 + 0.04*n2; base *= 0.95 + 0.08*n3;
    // grime: slightly darker near the base of the wall
    h = n2*0.0007 + n1*0.0006; rough = 0.93; bk = 1.3;
  } else if(uPattern==11){ // lawn grass
    vec2 p = vW.xz; float n1 = fbm(p*0.35), n2 = mix(0.5, fbm(p*2.2), wa), bl = mix(0.5, h21(floor(p*55.0)), wa*wa);
    base = mix(base, c2, smoothstep(0.35,0.7,n1)); base *= 0.8 + 0.22*n2 + 0.14*bl;
    base = mix(base, base*vec3(1.08,1.04,0.82), smoothstep(0.62,0.8,n1)*0.4);
    h = bl*0.004 + n2*0.002; rough = 0.95; bk = 1.0;
  } else if(uPattern==12){ // paving stones (running bond)
    vec2 b = uv*vec2(1.0/0.6, 1.0/0.3); b.x += mod(floor(b.y),2.0)*0.5; vec2 f=fract(b); vec2 id=floor(b);
    float e = min(min(f.x,1.0-f.x)*0.6, min(f.y,1.0-f.y)*0.3);
    float j = (1.0-smoothstep(0.006,0.014,e))*af;
    base *= 0.84+0.24*mix(0.5,h21(id),af); base *= 0.92+0.12*fbm(uv*6.0); base = mix(base, c2, j);
    h = -j*0.006 + fbm(uv*12.0)*0.0008; rough = 0.82;
  } else if(uPattern==13){ // stacked ledgestone: thin courses, stones of random length, mixed warm and grey tones, deep dark joints
    float rh = 0.072; float course = floor(uv.y/rh); float ry = fract(uv.y/rh);
    float len = 0.16 + 0.44*h21(vec2(course,1.7)); float sx = (uv.x + h21(vec2(course,9.1))*3.0)/len; vec2 id = vec2(floor(sx), course); float fx = fract(sx);
    float e = min(min(fx,1.0-fx)*len, min(ry,1.0-ry)*rh);
    float j = (1.0 - smoothstep(0.002,0.008,e))*af;
    float tone = h21(id); vec3 warm = base*vec3(1.03,0.88,0.72);
    base = tone < 0.38 ? mix(base, c2, tone*1.6) : (tone < 0.72 ? mix(base, warm, 0.85) : mix(c2, warm*0.75, 0.5));
    base *= 0.74 + 0.36*fbm(uv*vec2(9.0,20.0)+id*3.1); base *= 1.0-0.8*j;
    h = (h21(id+7.0)*0.009 + fbm(uv*30.0+id)*0.002)*af - j*0.009; rough = 0.9; bk = 1.0;
  } else if(uPattern==14){ // terrace / roof tiles
    vec2 g=fract(uv); float e=min(min(g.x,1.0-g.x),min(g.y,1.0-g.y)); float j = 1.0-smoothstep(0.015,0.03,e);
    base *= 0.88+0.16*h21(floor(uv)); base *= 0.9+0.15*fbm(uv*4.0); base = mix(base, c2, j); h = -j*0.003; rough = 0.85;
  } else if(uPattern==15){ glass = true; rough = 0.04;
  } else if(uPattern==16){ // foliage (leaf clumps)
    vec3 q = vW*4.0; float n = fbm(q.xz+q.y*1.7); float n2 = fbm(vec2(vW.x+vW.y*0.7, vW.z-vW.y*0.6)*7.0);
    base = mix(base, c2, smoothstep(0.3,0.8,n)); base *= 0.72+0.4*n2; h = n2*0.02; rough = 0.8; bk = 0.6;
  } else if(uPattern==18){ // cobblestone setts (driveways)
    vec2 b = uv/0.13; b.x += mod(floor(b.y),2.0)*0.5; vec2 f = fract(b), id = floor(b);
    vec2 q = abs(f-0.5); float edge = smoothstep(0.37,0.47,max(q.x,q.y))*af;
    base *= 0.78+0.34*h21(id); base *= 0.9+0.16*fbm(uv*22.0+id); base = mix(base, c2, edge);
    float dome = 1.0 - dot(f-0.5,f-0.5)*2.2; h = (dome*0.006 - edge*0.006)*af; rough = 0.78;
  } else if(uPattern==19){ // vertical timber battens
    float sx = uv.x/0.065; float id = floor(sx), f = fract(sx); float gap = smoothstep(0.76,0.84,f)*af;
    base *= 0.82+0.3*h21(vec2(id,3.0)); base *= 0.84+0.26*fbm(vec2(uv.x*28.0, uv.y*1.6)+id);
    base = mix(base, base*0.22, gap); h = -gap*0.01 + (1.0-gap)*0.002; rough = 0.55;
  } else if(uPattern==17){ // water
    float n = fbm(vW.xz*3.0); h = n*0.004; rough = 0.05;
  }
  if(uRough >= 0.0) rough = uRough;
  if(uBump > 0.0 && h != 0.0) N = bumpN(N, h*af, uBump*bk);
  vec3 albedo = lin(base);
  vec3 V = normalize(uCam - vW); float NdV = max(dot(N,V), 1e-3);
  vec3 F0 = mix(vec3(0.04), albedo, uMetal);
  float a = max(rough*rough, 0.002);
  // ambient: hemisphere sky/ground light, scaled
  float hemi = N.y*0.5+0.5;
  vec3 bounce = mix(uGroundCol, uHorizon*0.8, 0.6);  // light bounced up from ground/floors (kept neutral so ceilings stay white)
  vec3 ambL = mix(bounce, mix(uHorizon, uZenith, 0.5)*1.05, hemi)*uAmb;
  vec3 Fa = F0 + (max(vec3(1.0-rough), F0) - F0)*pow(1.0-NdV, 5.0);
  vec3 col = albedo*(1.0-uMetal)*ambL*(1.0-Fa*0.5);
  // sun
  float NdL = max(dot(N,uSunDir),0.0);
  if(NdL > 0.0){
    float sh = shadowF(N);
    vec3 H = normalize(uSunDir+V); float NdH = max(dot(N,H),0.0), VdH = max(dot(V,H),0.0);
    vec3 F = F0 + (1.0-F0)*pow(1.0-VdH, 5.0);
    vec3 spec = gD(NdH,a)*gV(NdV,NdL,a)*F*0.25*3.14159;
    col += (albedo*(1.0-uMetal)*(1.0-F) + spec)*uSunCol*NdL*sh;
  }
  // reflections of the sky (rougher = blurrier, i.e. closer to the average sky colour)
  vec3 R = reflect(-V, N);
  vec3 env = mix(skyCol(R, false), ambL/max(uAmb,0.01), clamp(rough*1.1,0.0,1.0));
  col += env*Fa*(1.0-rough*0.85)*(glass ? 1.0 : 0.55);
  for(int i=0;i<16;i++){ if(i>=uNL) break;
    vec3 L=uLP[i]-vW; float d=length(L); float att=clamp(1.0-d/uLR[i],0.0,1.0); att*=att;
    vec3 Ln = L/max(d,0.001); float nl = max(dot(N,Ln),0.0);
    vec3 Hl = normalize(Ln+V); float sp = gD(max(dot(N,Hl),0.0), max(a,0.05))*0.25*nl;
    col += (albedo*(0.3+0.7*nl) + F0*sp)*uLC[i]*att;
  }
  float alpha = uAlpha;
  if(glass){
    // tinted glass: what you see is mostly reflection at grazing angles, transmission straight on
    float Fg = 0.04 + 0.96*pow(1.0-NdV, 5.0);
    vec3 refl = skyCol(R, true);
    col = albedo*ambL*0.25 + refl*(0.12+0.88*Fg) + (NdL>0.0 ? uSunCol*gD(max(dot(N,normalize(uSunDir+V)),0.0),0.02)*0.02 : vec3(0.0));
    alpha = clamp(uAlpha + 0.55*Fg + 0.12, 0.0, 0.92);
  }
  col += lin(uEmissive)*1.6;
  col += vec3(uHL)*vec3(1.0,0.75,0.35)*0.35;
  float dist=length(vW-uCam); float fog=1.0-exp(-pow(dist*uFog,2.0));
  col = mix(col, skyCol(-V, false), clamp(fog,0.0,1.0));
  col = aces(col*uExposure);
  outColor = vec4(pow(col, vec3(1.0/2.2)), alpha);
}`;
const VS_DEPTH = `#version 300 es
in vec3 aPos; uniform mat4 uModel, uLVP; void main(){ gl_Position = uLVP*uModel*vec4(aPos,1.0); }`;
const FS_DEPTH = `#version 300 es
precision mediump float; out vec4 o; void main(){ o=vec4(1.0); }`;
const VS_FULL = `#version 300 es
out vec2 vUV; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUV = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;
const FS_SKY = `#version 300 es
precision highp float; in vec2 vUV; uniform mat4 uInvVP; uniform float uExposure;
${SKY_GLSL}
out vec4 o;
void main(){ vec2 p = vUV*2.0-1.0; vec4 a = uInvVP*vec4(p,-1.0,1.0), b = uInvVP*vec4(p,1.0,1.0);
  vec3 d = normalize(b.xyz/b.w - a.xyz/a.w); vec3 c = aces(skyCol(d, true)*uExposure); o = vec4(pow(c, vec3(1.0/2.2)), 1.0); }`;
// Screen-space ambient occlusion from the depth buffer (half resolution)
const FS_SSAO = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uDepth; uniform mat4 uProj, uInvProj; uniform vec2 uTexel; uniform float uRadius;
uniform vec3 uKernel[14]; out vec4 o;
vec3 vpos(vec2 uv){ float z = texture(uDepth, uv).r*2.0-1.0; vec4 p = uInvProj*vec4(uv*2.0-1.0, z, 1.0); return p.xyz/p.w; }
float hh(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
void main(){
  float d0 = texture(uDepth, vUV).r; if(d0 >= 0.99999){ o = vec4(1.0); return; }
  vec3 P = vpos(vUV); if(d0 > 0.9996 || P.z > -0.01 || -P.z > 70.0){ o = vec4(1.0); return; }  // far away depth precision is too low
  vec3 pr = vpos(vUV+vec2(uTexel.x,0.0)), pl = vpos(vUV-vec2(uTexel.x,0.0)), pu = vpos(vUV+vec2(0.0,uTexel.y)), pd = vpos(vUV-vec2(0.0,uTexel.y));
  vec3 dx = abs(pr.z-P.z) < abs(P.z-pl.z) ? pr-P : P-pl; vec3 dy = abs(pu.z-P.z) < abs(P.z-pd.z) ? pu-P : P-pd;
  vec3 N = normalize(cross(dx, dy)); if(dot(N, -P) < 0.0) N = -N;
  float an = hh(gl_FragCoord.xy)*6.2832; vec3 rv = vec3(cos(an), sin(an), 0.0);
  vec3 T = normalize(rv - N*dot(rv,N)); vec3 B = cross(N,T);
  float rad = uRadius; float occ = 0.0;
  for(int i=0;i<14;i++){
    vec3 S = P + (T*uKernel[i].x + B*uKernel[i].y + N*uKernel[i].z)*rad;
    vec4 q = uProj*vec4(S,1.0); vec2 suv = q.xy/q.w*0.5+0.5;
    if(suv.x<0.0||suv.x>1.0||suv.y<0.0||suv.y>1.0) continue;
    float sz = vpos(suv).z;
    float range = smoothstep(0.0, 1.0, rad*0.6/abs(P.z-sz));
    occ += (sz >= S.z + 0.025*rad ? 1.0 : 0.0)*range;
  }
  float ao = 1.0 - occ/14.0*(1.0 - smoothstep(35.0, 70.0, -P.z));
  o = vec4(pow(clamp(ao,0.0,1.0), 1.6), 0.0, 0.0, 1.0);
}`;
const FS_COMPOSITE = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uColor, uAO, uDepth; uniform vec2 uAOTexel; uniform int uUseAO; uniform float uAOStrength, uVignette;
uniform mat4 uInvProj; out vec4 o;
float vz(vec2 uv){ float z = texture(uDepth, uv).r*2.0-1.0; vec4 p = uInvProj*vec4(uv*2.0-1.0, z, 1.0); return p.z/p.w; }
void main(){
  vec3 c = texture(uColor, vUV).rgb;
  if(uUseAO==1){
    if(texture(uDepth, vUV).r < 0.9996){
      float z0 = vz(vUV); float tol = 0.04*abs(z0) + 0.03; float s = 0.0, w = 0.0;
      for(int x=-2;x<=1;x++) for(int y=-2;y<=1;y++){ vec2 uv = vUV + (vec2(x,y)+0.5)*uAOTexel; float wz = exp(-abs(vz(uv)-z0)/tol); s += texture(uAO, uv).r*wz; w += wz; }
      float ao = w > 1e-3 ? s/w : texture(uAO, vUV).r;
      c *= mix(1.0, ao, uAOStrength);
    }
  }
  vec2 q = vUV-0.5; c *= 1.0 - uVignette*dot(q,q)*1.6;
  o = vec4(c, 1.0);
}`;

const QUALITY = {
  ultra: { msaa: 4, ssao: true, shadow: 4096, bump: 1, dpr: 2 },
  high: { msaa: 4, ssao: true, shadow: 4096, bump: 1, dpr: 1.5 },
  balanced: { msaa: 0, ssao: false, shadow: 2048, bump: 1, dpr: 1.25 },
  low: { msaa: 0, ssao: false, shadow: 1024, bump: 0, dpr: 1 },
};
const lin3 = hex => hexToRgb(hex).map(v => Math.pow(v, 2.2));

class Engine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas; this.fixed = !!opts.fixed;
    const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true, alpha: false });
    if (!gl) throw new Error('WebGL2 is not available in this browser');
    this.gl = gl;
    this.geoCache = new Map();
    this.groups = new Map();
    this.lights = [];
    this.env = { sunDir: V3.norm([0.4, 0.8, 0.3]), sunCol: [2.2, 2.05, 1.85], zenith: '#5f8fc6', horizon: '#d6e3ec', groundCol: '#6f7a5a', amb: 0.9, fog: 0.006, shadows: true, night: 0, clouds: 0.7, exposure: 0.9 };
    this.bounds = { c: [0, 0, 0], r: 15 };
    this.cam = { pos: [10, 12, 14], target: [0, 0, 0], fov: 50 * Math.PI / 180, near: 0.05, far: 400 };
    this.progMain = this._prog(VS_MAIN, FS_MAIN);
    this.progDepth = this._prog(VS_DEPTH, FS_DEPTH);
    this.progSky = this._prog(VS_FULL, FS_SKY);
    const skyU = ['uZenith', 'uHorizon', 'uGroundCol', 'uSunCol', 'uSunDir', 'uNight', 'uClouds', 'uExposure'];
    this.uMain = this._uniforms(this.progMain, ['uModel', 'uVP', 'uLVP', 'uColor', 'uColor2', 'uEmissive', 'uCam', 'uAlpha', 'uPatScale', 'uAmb', 'uFog', 'uHL', 'uRough', 'uMetal', 'uShadowTexel', 'uBump', 'uPattern', 'uShadowOn', 'uNL', 'uShadow', 'uLP[0]', 'uLC[0]', 'uLR[0]', ...skyU]);
    this.uDepth = this._uniforms(this.progDepth, ['uModel', 'uLVP']);
    this.uSky = this._uniforms(this.progSky, ['uInvVP', ...skyU]);
    try {
      this.progSSAO = this._prog(VS_FULL, FS_SSAO); this.uSSAO = this._uniforms(this.progSSAO, ['uDepth', 'uProj', 'uInvProj', 'uTexel', 'uRadius', 'uKernel[0]']);
      this.progComp = this._prog(VS_FULL, FS_COMPOSITE); this.uComp = this._uniforms(this.progComp, ['uColor', 'uAO', 'uDepth', 'uAOTexel', 'uUseAO', 'uAOStrength', 'uVignette', 'uInvProj']);
      this.postOK = true;
    } catch (e) { this.postOK = false; }
    this.kernel = new Float32Array(42);
    for (let i = 0; i < 14; i++) { // hemisphere samples, denser near the centre
      const u = (i + 0.5) / 14, a = i * 2.39996, r = Math.sqrt(1 - u * u * 0.85);
      let v = [Math.cos(a) * r, Math.sin(a) * r, 0.15 + u * 0.85]; v = V3.norm(v); const s = 0.25 + 0.75 * ((i + 1) / 14) ** 2;
      this.kernel.set(V3.scale(v, s), i * 3);
    }
    this.emptyVAO = gl.createVertexArray();
    this.setQuality(opts.quality || Engine.defaultQuality());
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    this.dirty = true;
  }
  static defaultQuality() {
    try { const q = localStorage.getItem('dimora_gfx'); if (q && QUALITY[q]) return q; } catch (e) { }
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return coarse ? 'balanced' : 'high';
  }
  setQuality(q) {
    const gl = this.gl; this.quality = QUALITY[q] ? q : 'high'; this.Q = QUALITY[this.quality];
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const size = Math.min(this.Q.shadow, maxTex);
    if (size !== this.shadowSize) { this.shadowSize = size; this._initShadow(); }
    this.samples = this.Q.msaa ? Math.min(this.Q.msaa, gl.getParameter(gl.MAX_SAMPLES) || 0) : 0;
    this.usePost = this.postOK && (this.Q.ssao || this.samples > 0);
    this._freePost(); this.dirty = true;
  }
  _prog(vs, fs) {
    const gl = this.gl;
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor');
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  _uniforms(p, names) { const o = {}; names.forEach(n => o[n.replace('[0]', '')] = this.gl.getUniformLocation(p, n)); return o; }
  _initShadow() {
    const gl = this.gl, s = this.shadowSize;
    if (this.shadowTex) { gl.deleteTexture(this.shadowTex); gl.deleteFramebuffer(this.shadowFB); }
    this.shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, s, s, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shadowFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /* ---- offscreen targets for anti-aliasing + ambient occlusion ---- */
  _freePost() {
    const gl = this.gl, P = this.post; if (!P) return;
    [P.msFB, P.resFB, P.aoFB].forEach(f => f && gl.deleteFramebuffer(f));
    [P.msColor, P.msDepth].forEach(r => r && gl.deleteRenderbuffer(r));
    [P.color, P.depth, P.ao].forEach(t => t && gl.deleteTexture(t));
    this.post = null;
  }
  _tex(w, h, ifmt, fmt, type, filter) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  _ensurePost(w, h) {
    if (!this.usePost) return false;
    if (this.post && this.post.w === w && this.post.h === h) return true;
    this._freePost();
    const gl = this.gl, P = { w, h };
    try {
      P.color = this._tex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      P.depth = this._tex(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST);
      P.resFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, P.resFB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, P.color, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, P.depth, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('resolve FB');
      if (this.samples > 0) {
        P.msColor = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, P.msColor); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, w, h);
        P.msDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, P.msDepth); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, w, h);
        P.msFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, P.msFB);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, P.msColor);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, P.msDepth);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('msaa FB');
      }
      if (this.Q.ssao) {
        P.aw = Math.max(1, w >> 1); P.ah = Math.max(1, h >> 1);
        P.ao = this._tex(P.aw, P.ah, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
        P.aoFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, P.aoFB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, P.ao, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('ao FB');
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.post = P; return true;
    } catch (e) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.post = P; this._freePost(); this.usePost = false; return false;
    }
  }
  _upload(pos, nor) {
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const data = new Float32Array(pos.length * 2);
    for (let i = 0; i < pos.length / 3; i++) { data.set(pos.slice(i * 3, i * 3 + 3), i * 6); data.set(nor.slice(i * 3, i * 3 + 3), i * 6 + 3); }
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindVertexArray(null);
    return { vao, count: pos.length / 3 };
  }
  geo(kind, a = 1, b = 1, c = 1, seg = 18) {
    const key = kind + ':' + [a, b, c, seg].map(v => (+v).toFixed(3)).join(':');
    if (this.geoCache.has(key)) return this.geoCache.get(key);
    let g;
    if (kind === 'box') g = this._box(a, b, c);
    else if (kind === 'cyl') g = this._cyl(a, b, seg, c);
    else if (kind === 'sph') g = this._sph(a, seg);
    this.geoCache.set(key, g); return g;
  }
  // box: width a (x), height b (y, from 0), depth c (z), centered on x/z
  _box(w, h, d) {
    const x = w / 2, z = d / 2, P = [], N = [];
    const f = (v, n) => { [0, 1, 2, 0, 2, 3].forEach(i => { P.push(...v[i]); N.push(...n); }); };
    f([[-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z]], [0, 0, 1]);
    f([[x, 0, -z], [-x, 0, -z], [-x, h, -z], [x, h, -z]], [0, 0, -1]);
    f([[x, 0, z], [x, 0, -z], [x, h, -z], [x, h, z]], [1, 0, 0]);
    f([[-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z]], [-1, 0, 0]);
    f([[-x, h, z], [x, h, z], [x, h, -z], [-x, h, -z]], [0, 1, 0]);
    f([[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]], [0, -1, 0]);
    return this._upload(P, N);
  }
  // cylinder: radius r, height h from 0; r2 = top radius ratio (c)
  _cyl(r, h, seg, topRatio = 1) {
    const P = [], N = [], rt = r * (topRatio || 1);
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const slope = (r - rt) / h;
      const n0 = V3.norm([c0, slope, s0]), n1 = V3.norm([c1, slope, s1]);
      // CCW seen from outside
      const A = [c0 * r, 0, s0 * r], B = [c1 * r, 0, s1 * r], C = [c1 * rt, h, s1 * rt], D = [c0 * rt, h, s0 * rt];
      [[A, n0], [C, n1], [B, n1], [A, n0], [D, n0], [C, n1]].forEach(([p, n]) => { P.push(...p); N.push(...n); });
      P.push(0, h, 0, ...D, ...C); N.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      P.push(0, 0, 0, ...B, ...A); N.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
    }
    return this._upload(P, N);
  }
  _sph(r, seg) {
    const P = [], N = [], st = Math.max(6, seg >> 1);
    const pt = (i, j) => { const th = i / st * Math.PI, ph = j / seg * Math.PI * 2; const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; return [n.map(v => v * r), n]; };
    for (let i = 0; i < st; i++) for (let j = 0; j < seg; j++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      [a, d, c, a, c, b].forEach(([p, n]) => { P.push(...p); N.push(...n); });
    }
    return this._upload(P, N);
  }
  // ---------- scene graph ----------
  clear() { this.groups.clear(); this.lights = []; this.dirty = true; }
  addGroup(id, opts = {}) {
    const g = Object.assign({ id, x: 0, y: 0, z: 0, rot: 0, sy: 1, visible: true, items: [], kind: 'misc', hl: 0, mat: null, pick: null }, opts);
    this.groups.set(id, g); g.dirtyM = true; this.dirty = true; return g;
  }
  removeGroup(id) { this.groups.delete(id); this.dirty = true; }
  // add drawable to group. p: {geo,x,y,z,ry,rx,rz,color,color2,pattern,patScale,emissive,alpha,rough,metal,shadowOnly,cast,hideWhen}
  part(g, p) {
    const d = Object.assign({ x: 0, y: 0, z: 0, ry: 0, rx: 0, rz: 0, sy: 1, color: '#cccccc', color2: '#999999', pattern: 0, patScale: 1, emissive: '#000000', alpha: 1, rough: -1, metal: 0, cast: true, shadowOnly: false }, p);
    d.local = M4.trs(d.x, d.y, d.z, d.ry, d.sy, d.rx, d.rz);
    d.rgb = hexToRgb(d.color); d.rgb2 = hexToRgb(d.color2); d.erg = hexToRgb(d.emissive);
    g.items.push(d); g.dirtyM = true; this.dirty = true; return d;
  }
  _groupMat(g) {
    if (g.dirtyM || !g.mat) {
      g.mat = M4.trs(g.x, g.y, g.z, g.rot, g.sy);
      g.items.forEach(d => d.world = M4.mul(g.mat, d.local));
      g.dirtyM = false;
    }
  }
  setLights(list) { this.lights = list.slice(0, 16); this.dirty = true; }
  proj() { const c = this.cam, asp = this.canvas.width / Math.max(1, this.canvas.height); return M4.persp(c.fov, asp, c.near, c.far); }
  viewProj() { return M4.mul(this.proj(), M4.lookAt(this.cam.pos, this.cam.target, [0, 1, 0])); }
  resize() {
    if (this.fixed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.Q.dpr);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.dirty = true; }
  }
  _skyUniforms(U) {
    const gl = this.gl, env = this.env;
    gl.uniform3fv(U.uZenith, lin3(env.zenith)); gl.uniform3fv(U.uHorizon, lin3(env.horizon)); gl.uniform3fv(U.uGroundCol, lin3(env.groundCol));
    gl.uniform3fv(U.uSunCol, env.sunCol); gl.uniform3fv(U.uSunDir, env.sunDir); gl.uniform1f(U.uNight, env.night || 0);
    gl.uniform1f(U.uClouds, env.clouds ?? 0.7); gl.uniform1f(U.uExposure, env.exposure || 0.9);
  }
  render() {
    const gl = this.gl, env = this.env;
    this.resize();
    const W = this.canvas.width, H = this.canvas.height;
    this.groups.forEach(g => this._groupMat(g));
    const camY = this.cam.pos[1];
    const visible = (g, d) => g.visible && !(d.hideAbove != null && camY > d.hideAbove) && !(d.showBelow != null && camY > d.showBelow);
    // shadow pass
    const bc = this.bounds.c, R = this.bounds.r;
    const sd = env.sunDir;
    const up = Math.abs(sd[1]) > 0.98 ? [0, 0, 1] : [0, 1, 0];
    const lvp = M4.mul(M4.ortho(-R, R, -R, R, 0.1, R * 4), M4.lookAt(V3.add(bc, V3.scale(sd, R * 2)), bc, up));
    const shadowsOn = env.shadows && sd[1] > 0.02;
    if (shadowsOn) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFB);
      gl.viewport(0, 0, this.shadowSize, this.shadowSize);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.progDepth);
      gl.uniformMatrix4fv(this.uDepth.uLVP, false, lvp);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2.0);
      this.groups.forEach(g => { if (!g.visible) return; g.items.forEach(d => {
        if (!d.cast || d.alpha < 0.6 || d.pattern === 15) return;
        if (d.hideAbove != null && !d.shadowOnly) return;
        gl.uniformMatrix4fv(this.uDepth.uModel, false, d.world);
        gl.bindVertexArray(d.geo.vao); gl.drawArrays(gl.TRIANGLES, 0, d.geo.count);
      }); });
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.enable(gl.CULL_FACE);
    }
    const post = this._ensurePost(W, H) ? this.post : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, post ? (post.msFB || post.resFB) : null);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = this.proj(), view = M4.lookAt(this.cam.pos, this.cam.target, [0, 1, 0]), vp = M4.mul(proj, view);
    // sky
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.useProgram(this.progSky); this._skyUniforms(this.uSky);
    gl.uniformMatrix4fv(this.uSky.uInvVP, false, M4.inv(vp));
    gl.bindVertexArray(this.emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    // scene
    gl.useProgram(this.progMain);
    const U = this.uMain;
    this._skyUniforms(U);
    gl.uniformMatrix4fv(U.uVP, false, vp);
    gl.uniformMatrix4fv(U.uLVP, false, lvp);
    gl.uniform3fv(U.uSunCol, shadowsOn || sd[1] > 0 ? env.sunCol : [0, 0, 0]);
    gl.uniform1f(U.uFog, env.fog);
    gl.uniform3fv(U.uCam, this.cam.pos); gl.uniform1f(U.uAmb, env.amb);
    gl.uniform1i(U.uShadowOn, shadowsOn ? 1 : 0); gl.uniform1f(U.uShadowTexel, 1 / this.shadowSize);
    gl.uniform1f(U.uBump, this.Q.bump);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); gl.uniform1i(U.uShadow, 0);
    const L = this.lights, lp = new Float32Array(48), lc = new Float32Array(48), lr = new Float32Array(16);
    L.forEach((l, i) => { lp.set(l.p, i * 3); lc.set(l.c, i * 3); lr[i] = l.r; });
    gl.uniform1i(U.uNL, L.length); gl.uniform3fv(U.uLP, lp); gl.uniform3fv(U.uLC, lc); gl.uniform1fv(U.uLR, lr);
    const trans = [];
    const draw = (g, d) => {
      gl.uniformMatrix4fv(U.uModel, false, d.world);
      gl.uniform3fv(U.uColor, d.rgb); gl.uniform3fv(U.uColor2, d.rgb2); gl.uniform3fv(U.uEmissive, d.erg);
      gl.uniform1f(U.uAlpha, d.alpha); gl.uniform1i(U.uPattern, d.pattern); gl.uniform1f(U.uPatScale, d.patScale);
      gl.uniform1f(U.uRough, d.rough); gl.uniform1f(U.uMetal, d.metal);
      gl.uniform1f(U.uHL, g.hl || 0);
      gl.bindVertexArray(d.geo.vao); gl.drawArrays(gl.TRIANGLES, 0, d.geo.count);
    };
    this.groups.forEach(g => g.items.forEach(d => {
      if (d.shadowOnly || !visible(g, d)) return;
      if (d.alpha < 1 || d.pattern === 15) { trans.push([g, d]); return; }
      if (d.noCull) gl.disable(gl.CULL_FACE);
      draw(g, d);
      if (d.noCull) gl.enable(gl.CULL_FACE);
    }));
    if (trans.length) {
      const cp = this.cam.pos;
      trans.forEach(t => t[2] = V3.len(V3.sub([t[1].world[12], t[1].world[13], t[1].world[14]], cp)));
      trans.sort((a, b) => b[2] - a[2]);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      trans.forEach(([g, d]) => draw(g, d));
      gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE);
    }
    gl.bindVertexArray(null);
    if (post) this._post(post, proj);
    this.dirty = false;
  }
  _post(P, proj) {
    const gl = this.gl, W = P.w, H = P.h;
    if (P.msFB) { // resolve MSAA colour + depth into textures
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, P.msFB); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, P.resFB);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.bindVertexArray(this.emptyVAO);
    const inv = M4.inv(proj);
    if (P.ao) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, P.aoFB); gl.viewport(0, 0, P.aw, P.ah);
      gl.useProgram(this.progSSAO); const S = this.uSSAO;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, P.depth); gl.uniform1i(S.uDepth, 0);
      gl.uniformMatrix4fv(S.uProj, false, proj); gl.uniformMatrix4fv(S.uInvProj, false, inv);
      gl.uniform2f(S.uTexel, 1 / P.aw, 1 / P.ah); gl.uniform1f(S.uRadius, this.aoRadius || 0.42); gl.uniform3fv(S.uKernel, this.kernel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(this.progComp); const C = this.uComp;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, P.color); gl.uniform1i(C.uColor, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, P.ao || P.color); gl.uniform1i(C.uAO, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, P.depth); gl.uniform1i(C.uDepth, 2);
    gl.uniform2f(C.uAOTexel, 1 / (P.aw || W), 1 / (P.ah || H)); gl.uniform1i(C.uUseAO, P.ao ? 1 : 0);
    gl.uniform1f(C.uAOStrength, 0.75); gl.uniform1f(C.uVignette, this.env.vignette ?? 0.22); gl.uniformMatrix4fv(C.uInvProj, false, inv);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.bindVertexArray(null);
  }
  // world point -> screen px (css)
  project(p) {
    const m = this.viewProj();
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    if (w <= 0.01) return null;
    return [(x / w * 0.5 + 0.5) * this.canvas.clientWidth, (1 - (y / w * 0.5 + 0.5)) * this.canvas.clientHeight, w];
  }
  ray(px, py) {
    const c = this.cam, W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const nx = px / W * 2 - 1, ny = 1 - py / H * 2;
    const f = V3.norm(V3.sub(c.target, c.pos)); let r = V3.cross(f, [0, 1, 0]); if (V3.len(r) < 1e-6) r = [1, 0, 0]; r = V3.norm(r);
    const u = V3.cross(r, f), t = Math.tan(c.fov / 2), asp = W / H;
    return { o: c.pos.slice(), d: V3.norm(V3.add(f, V3.add(V3.scale(r, nx * t * asp), V3.scale(u, ny * t)))) };
  }
  // ray vs oriented box (center x,z, base y0, height h, half w/d, rot)
  static rayOBB(ray, b) {
    const ca = Math.cos(b.rot || 0), sa = Math.sin(b.rot || 0);
    const ox = ray.o[0] - b.x, oy = ray.o[1] - (b.y0 + b.h / 2), oz = ray.o[2] - b.z;
    const o = [ox * ca - oz * sa, oy, ox * sa + oz * ca];
    const d = [ray.d[0] * ca - ray.d[2] * sa, ray.d[1], ray.d[0] * sa + ray.d[2] * ca];
    const hx = [b.w / 2, b.h / 2, b.d / 2]; let tmin = -1e9, tmax = 1e9;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (Math.abs(o[i]) > hx[i]) return null; continue; }
      let t1 = (-hx[i] - o[i]) / d[i], t2 = (hx[i] - o[i]) / d[i]; if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
    }
    return tmax < 0 ? null : Math.max(tmin, 0);
  }
  snapshot(w = 480, h = 300) {
    this.render();
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); const sw = this.canvas.width, sh = this.canvas.height;
    const s = Math.max(w / sw, h / sh); const dw = sw * s, dh = sh * s;
    ctx.drawImage(this.canvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return c.toDataURL('image/jpeg', 0.85);
  }
}

/* ---------- camera controllers ---------- */
class Controls {
  constructor(engine, el) {
    this.e = engine; this.el = el; this.mode = 'orbit';
    this.orbit = { theta: -0.75, phi: 0.95, r: 22, target: [0, 0, 0] };
    this.walk = { pos: [0, 1.6, 0], yaw: 0, pitch: -0.05 };
    this.keys = {}; this.enabled = true; this.anim = null; this.collide = null;
    this.onClick = null; this.onDragStart = null; this.onDrag = null; this.onDragEnd = null; this.onChange = null;
    let down = null, pinch = null;
    const pts = new Map();
    el.addEventListener('pointerdown', e => {
      if (!this.enabled) return;
      el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      const r = el.getBoundingClientRect();
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, btn: e.button, shift: e.shiftKey, moved: false, custom: false, px: e.clientX - r.left, py: e.clientY - r.top };
      if (pts.size === 2) { const a = [...pts.values()]; pinch = { d: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), r: this.orbit.r }; }
      if (this.onDragStart && e.button === 0 && pts.size === 1 && this.onDragStart(down.px, down.py)) down.custom = true;
    });
    el.addEventListener('pointermove', e => {
      if (!down || !this.enabled) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const dx = e.clientX - down.lx, dy = e.clientY - down.ly; down.lx = e.clientX; down.ly = e.clientY;
      if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 4) down.moved = true;
      if (!down.moved) return;
      const r = el.getBoundingClientRect();
      if (down.custom) { this.onDrag && this.onDrag(e.clientX - r.left, e.clientY - r.top); return; }
      if (pinch && pts.size === 2) { const a = [...pts.values()]; const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); this.orbit.r = Math.max(2, Math.min(80, pinch.r * pinch.d / d)); this.apply(); return; }
      this.stopAnim();
      if (this.mode === 'orbit') {
        if (down.btn === 2 || down.shift || down.btn === 1) this.pan(dx, dy);
        else { this.orbit.theta -= dx * 0.006; this.orbit.phi = Math.max(0.05, Math.min(1.52, this.orbit.phi - dy * 0.005)); }
      } else { this.walk.yaw -= dx * 0.004; this.walk.pitch = Math.max(-1.2, Math.min(1.2, this.walk.pitch - dy * 0.004)); }
      this.apply();
    });
    const up = e => {
      if (!down) return; pts.delete(e.pointerId);
      const r = el.getBoundingClientRect();
      if (down.custom && down.moved) this.onDragEnd && this.onDragEnd();
      else if (!down.moved && this.onClick) this.onClick(e.clientX - r.left, e.clientY - r.top, e);
      else if (down.custom) this.onDragEnd && this.onDragEnd(true);
      if (pts.size < 2) pinch = null;
      if (!pts.size) down = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => {
      if (!this.enabled) return; e.preventDefault(); this.stopAnim();
      if (this.mode === 'orbit') { this.orbit.r = Math.max(2, Math.min(90, this.orbit.r * (1 + Math.sign(e.deltaY) * 0.1))); }
      else { this.move(-Math.sign(e.deltaY) * 0.4, 0); }
      this.apply();
    }, { passive: false });
    window.addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,textarea,select')) return; if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(); this.keys[k] = true;
      if (this.kbd && this.kbd() && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault(); });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
  }
  pan(dx, dy) {
    const o = this.orbit, s = o.r * 0.0016, c = Math.cos(o.theta), n = Math.sin(o.theta);
    o.target[0] += -c * dx * s - n * dy * s;
    o.target[2] += n * dx * s - c * dy * s;
    this.apply();
  }
  move(fwd, side) {
    const w = this.walk; const f = [-Math.sin(w.yaw), 0, -Math.cos(w.yaw)], r = [Math.cos(w.yaw), 0, -Math.sin(w.yaw)];
    const np = [w.pos[0] + f[0] * fwd + r[0] * side, w.pos[1], w.pos[2] + f[2] * fwd + r[2] * side];
    if (this.collide) { const ok = this.collide(w.pos, np); if (!ok) { const nx = [np[0], w.pos[1], w.pos[2]], nz = [w.pos[0], w.pos[1], np[2]]; if (this.collide(w.pos, nx)) w.pos = nx; else if (this.collide(w.pos, nz)) w.pos = nz; this.onMoved && this.onMoved(w.pos); return; } }
    w.pos = np; this.onMoved && this.onMoved(w.pos);
  }
  tick(dt) {
    if (this.anim) {
      const a = this.anim; a.t += dt / a.dur; const t = Math.min(1, a.t); const k = a.ease ? a.ease(t) : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      a.step(k); this.e.dirty = true; if (t >= 1) { this.anim = null; a.done && a.done(); }
      return true;
    }
    if (this.mode === 'walk' && this.enabled) {
      const k = this.keys, sp = (k.shift ? 3.2 : 1.8) * dt;
      let f = 0, s = 0;
      if (k.w || k.arrowup) f += sp; if (k.s || k.arrowdown) f -= sp; if (k.a) s -= sp; if (k.d) s += sp;
      if (k.arrowleft) this.walk.yaw += dt * 1.6; if (k.arrowright) this.walk.yaw -= dt * 1.6;
      if (f || s || k.arrowleft || k.arrowright) { this.move(f, s); this.apply(); return true; }
    }
    if (this.mode === 'orbit' && this.enabled && (!this.kbd || this.kbd())) {
      // keyboard flying around the house: W A S D / arrows glide, Q E circle, Z X zoom, T G tilt, Shift = faster
      const k = this.keys, o = this.orbit, boost = k.shift ? 2.6 : 1;
      const f = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0), sd = (k.d ? 1 : 0) - (k.a ? 1 : 0);
      const rot = (k.q || k.arrowleft ? 1 : 0) - (k.e || k.arrowright ? 1 : 0), zoom = (k.x ? 1 : 0) - (k.z ? 1 : 0), tilt = (k.g ? 1 : 0) - (k.t ? 1 : 0);
      if (f || sd || rot || zoom || tilt) {
        this.stopAnim();
        const sp = Math.max(1.8, o.r * 0.22) * boost * dt, c = Math.cos(o.theta), n = Math.sin(o.theta);
        o.target[0] += (-n * f + c * sd) * sp; o.target[2] += (-c * f - n * sd) * sp;
        const b = this.e.bounds, lim = b.r * 1.6; // don't wander off into the fog
        o.target[0] = Math.max(b.c[0] - lim, Math.min(b.c[0] + lim, o.target[0])); o.target[2] = Math.max(b.c[2] - lim, Math.min(b.c[2] + lim, o.target[2]));
        o.theta += rot * 0.9 * boost * dt;
        o.r = Math.max(2, Math.min(90, o.r * (1 + zoom * 0.6 * boost * dt)));
        o.phi = Math.max(0.08, Math.min(1.5, o.phi + tilt * 0.7 * dt));
        this.apply(); return true;
      }
    }
    return false;
  }
  stopAnim() { if (this.anim && !this.anim.locked) this.anim = null; }
  apply() {
    const c = this.e.cam;
    if (this.mode === 'orbit') {
      const o = this.orbit;
      c.pos = [o.target[0] + o.r * Math.sin(o.phi) * Math.sin(o.theta), o.target[1] + o.r * Math.cos(o.phi), o.target[2] + o.r * Math.sin(o.phi) * Math.cos(o.theta)];
      c.target = o.target.slice();
    } else {
      const w = this.walk;
      c.pos = w.pos.slice();
      c.target = [w.pos[0] - Math.sin(w.yaw) * Math.cos(w.pitch), w.pos[1] + Math.sin(w.pitch), w.pos[2] - Math.cos(w.yaw) * Math.cos(w.pitch)];
    }
    this.e.dirty = true; this.onChange && this.onChange();
  }
  // animate camera from current pos/target to given pos/target (free camera), then set controller state
  flyTo(pos, target, dur = 1.4, opts = {}) {
    const c = this.e.cam, p0 = c.pos.slice(), t0 = c.target.slice();
    return new Promise(res => {
      this.anim = {
        t: 0, dur, locked: !!opts.locked, ease: opts.ease,
        step: k => { c.pos = V3.lerp(p0, pos, k); c.target = V3.lerp(t0, target, k); this.onChange && this.onChange(); },
        done: () => { this.syncFromCam(opts.mode); res(); }
      };
    });
  }
  flyPath(points, targets, dur, opts = {}) { // smooth catmull-rom through positions
    const c = this.e.cam; const P = [c.pos.slice(), ...points], T = [c.target.slice(), ...targets];
    const cr = (arr, k) => {
      const n = arr.length - 1, f = k * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
      const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(n, i + 2)];
      return [0, 1, 2].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t * t * t));
    };
    return new Promise(res => {
      this.anim = { t: 0, dur, locked: true, ease: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
        step: k => { c.pos = cr(P, k); c.target = cr(T, k); this.onChange && this.onChange(); },
        done: () => { this.syncFromCam(opts.mode); res(); } };
    });
  }
  syncFromCam(mode) {
    const c = this.e.cam;
    if (mode) this.mode = mode;
    if (this.mode === 'orbit') {
      const d = V3.sub(c.pos, c.target), r = V3.len(d);
      this.orbit = { target: c.target.slice(), r, phi: Math.acos(Math.max(-1, Math.min(1, d[1] / r))), theta: Math.atan2(d[0], d[2]) };
    } else {
      const d = V3.norm(V3.sub(c.target, c.pos));
      this.walk = { pos: c.pos.slice(), yaw: Math.atan2(-d[0], -d[2]), pitch: Math.asin(Math.max(-1, Math.min(1, d[1]))) };
    }
  }
}

/* ===================== DIMORA DATA MODEL, CATALOGS & COSTS ===================== */
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = v => Math.round(v * 100) / 100;
const snap = (v, s = 0.05) => Math.round(v / s) * s;
const deep = o => JSON.parse(JSON.stringify(o));
const inr = v => '₹' + Math.round(v).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WALL_T = 0.12, DOOR_H = 2.1, FLOOR_TOP = 0.04;

const ROOM_TYPES = {
  living: { label: 'Living Room', tint: '#f3d9b1', min: 9.5, icon: '🛋️' },
  bedroom: { label: 'Bedroom', tint: '#c9dccb', min: 9.5, icon: '🛏️' },
  master: { label: 'Master Bedroom', tint: '#b9d3c0', min: 12, icon: '🛏️' },
  kitchen: { label: 'Kitchen', tint: '#f2c6a7', min: 5, icon: '🍳' },
  dining: { label: 'Dining', tint: '#ead1b8', min: 7.5, icon: '🍽️' },
  bathroom: { label: 'Bathroom', tint: '#bcd7e6', min: 1.8, icon: '🚿' },
  balcony: { label: 'Balcony', tint: '#d4e5c2', min: 2.5, icon: '🌿' },
  study: { label: 'Study', tint: '#d9cfe8', min: 6, icon: '📚' },
  office: { label: 'Home Office', tint: '#cfd6ea', min: 6.5, icon: '💼' },
  gaming: { label: 'Gaming Room', tint: '#cbc4ea', min: 8, icon: '🎮' },
  reading: { label: 'Reading Corner', tint: '#e8dcc0', min: 4, icon: '📖' },
  closet: { label: 'Walk-in Closet', tint: '#e6d3dc', min: 3.5, icon: '👗' },
  nursery: { label: 'Nursery', tint: '#f3d3d8', min: 7, icon: '🧸' },
  gym: { label: 'Home Gym', tint: '#d2e0dc', min: 8, icon: '🏋️' },
  guest: { label: 'Guest Room', tint: '#d8e2c8', min: 9, icon: '🛏️' },
  pooja: { label: 'Pooja Room', tint: '#f5dfb0', min: 1.5, icon: '🪔' },
  utility: { label: 'Utility', tint: '#d6d6d6', min: 2, icon: '🧺' },
  hall: { label: 'Passage', tint: '#e5e1da', min: 2, icon: '🚪' },
  empty: { label: 'Empty Room', tint: '#e8e8e8', min: 4, icon: '⬜' },
  parking: { label: 'Car Parking', tint: '#cfd4d8', min: 12.5, icon: '🚗' },
  garden: { label: 'Garden', tint: '#bfe0a8', min: 4, icon: '🌳' },
  garage: { label: 'Garage', tint: '#d3d7dc', min: 15, icon: '🚘' },
};
/* open-air spaces: no full walls to the outside and no ceiling; a balcony gets a railing */
const OPEN_AIR = new Set(['balcony', 'parking', 'garden']);
const isOpenAir = r => !!r && OPEN_AIR.has(r.type);
const isYard = r => !!r && (r.type === 'parking' || r.type === 'garden');
const TRANSFORMS = [
  { to: 'office', label: 'Home Office' }, { to: 'gaming', label: 'Gaming Room' }, { to: 'reading', label: 'Reading Corner' },
  { to: 'study', label: 'Study Room' }, { to: 'closet', label: 'Walk-in Closet' }, { to: 'nursery', label: 'Nursery' },
  { to: 'gym', label: 'Home Gym' }, { to: 'guest', label: 'Guest Room' }, { to: 'pooja', label: 'Pooja Room' }, { to: 'bedroom', label: 'Bedroom' }, { to: 'garage', label: 'Garage (car + bike)' },
];

/* Floor materials: ₹ per sq ft incl. laying (illustrative) */
const FLOORS = {
  vitrified: { label: 'Vitrified Tiles', color: '#e7e3dc', c2: '#cdc7bd', pattern: 2, scale: 0.6, rate: 85, fam: 'tile' },
  ceramic: { label: 'Ceramic Matte Tiles', color: '#cdbba5', c2: '#a8998a', pattern: 2, scale: 0.45, rate: 55, fam: 'tile' },
  antiskid: { label: 'Anti-skid Tiles', color: '#cdd3d5', c2: '#9ea6aa', pattern: 2, scale: 0.3, rate: 60, fam: 'tile' },
  marble: { label: 'Italian Marble', color: '#f0ede7', c2: '#a9a49b', pattern: 3, scale: 0.9, rate: 380, fam: 'stone' },
  indian_marble: { label: 'Indian Marble (Makrana)', color: '#ece8e0', c2: '#b9b2a4', pattern: 3, scale: 0.8, rate: 180, fam: 'stone' },
  granite: { label: 'Black Granite', color: '#38383a', c2: '#56565a', pattern: 6, scale: 0.6, rate: 150, fam: 'stone' },
  kota: { label: 'Kota Stone', color: '#7f8b74', c2: '#66705c', pattern: 6, scale: 0.6, rate: 60, fam: 'stone' },
  oak: { label: 'Oak Laminate', color: '#c39a6b', c2: '#8a6644', pattern: 1, scale: 0.19, rate: 110, fam: 'wood' },
  walnut: { label: 'Walnut Engineered Wood', color: '#6f4c35', c2: '#4a3020', pattern: 1, scale: 0.19, rate: 260, fam: 'wood' },
  herringbone: { label: 'Herringbone Oak', color: '#b8895a', c2: '#7d5a3a', pattern: 5, scale: 0.42, rate: 340, fam: 'wood' },
  vinyl: { label: 'Wood-look Vinyl (LVT)', color: '#b79471', c2: '#8a6d50', pattern: 1, scale: 0.18, rate: 75, fam: 'wood' },
  carpet: { label: 'Carpet Tiles', color: '#8d9198', c2: '#6f737a', pattern: 4, scale: 1, rate: 90, fam: 'soft' },
  concrete: { label: 'Polished Concrete', color: '#a7a6a2', c2: '#8a8985', pattern: 8, scale: 1.2, rate: 95, fam: 'stone' },
  deck: { label: 'Outdoor Deck (WPC)', color: '#8d6a4c', c2: '#5c4330', pattern: 1, scale: 0.14, rate: 160, fam: 'wood' },
  pavers: { label: 'Interlocking Pavers', color: '#b2a593', c2: '#7f7466', pattern: 12, scale: 0.42, rate: 70, fam: 'stone' },
  cobble: { label: 'Cobblestone Setts', color: '#a3a09a', c2: '#5d5a55', pattern: 18, scale: 1, rate: 95, fam: 'stone' },
  lawn: { label: 'Lawn (natural grass)', color: '#4f7034', c2: '#6b7c3d', pattern: 11, scale: 1, rate: 35, fam: 'soft' },
};
const FLOOR_CHEAPER = { marble: 'indian_marble', indian_marble: 'vitrified', herringbone: 'oak', walnut: 'oak', oak: 'vinyl', granite: 'kota', vitrified: 'ceramic', carpet: 'vinyl', concrete: 'kota', deck: 'ceramic', antiskid: 'ceramic' };
/* Paint tiers ₹ per sq ft of wall */
const PAINT = { budget: { label: 'Economy emulsion', rate: 14 }, standard: { label: 'Premium emulsion', rate: 26 }, premium: { label: 'Luxury / texture finish', rate: 48 } };
const CEILINGS = {
  flat: { label: 'Plain ceiling', rate: 0 }, peripheral: { label: 'Peripheral false ceiling', rate: 95 },
  cove: { label: 'Cove-lit false ceiling', rate: 125 }, tray: { label: 'Tray ceiling with downlights', rate: 150 },
};
const LIGHT_COST = { ambient: 220 /* per m² */, task: 3500, accent: 5000 };
const SQFT = 10.7639;

/* Themes */
const THEMES = {
  Modern: { walls: ['#e9e6e1', '#d8d3cb', '#cfd6d8'], accent: '#2f4858', wood: '#4a4440', fabric: '#8e9aaf', metal: '#2a2a2a', rug: '#6b7a8f', curtain: '#c9c3b8', floor: 'vitrified', wet: 'antiskid', ceiling: 'peripheral', desc: 'Clean lines, neutral greys and a slate accent.' },
  Minimalist: { walls: ['#f4f2ee', '#ebe8e2'], accent: '#9a9187', wood: '#d6c2a6', fabric: '#e2ddd5', metal: '#bdbdbd', rug: '#d9d3c9', curtain: '#efebe4', floor: 'concrete', wet: 'antiskid', ceiling: 'flat', desc: 'Less, but better — airy whites and pale timber.' },
  Japandi: { walls: ['#e7ddcf', '#ddd2c1', '#d3cbbb'], accent: '#5b6650', wood: '#a47e5a', fabric: '#c8bba6', metal: '#3b3631', rug: '#b7a78e', curtain: '#e0d6c6', floor: 'oak', wet: 'ceramic', ceiling: 'cove', desc: 'Japanese calm meets Nordic warmth: oak, linen, olive.' },
  Scandinavian: { walls: ['#f3f3ef', '#e6ebea', '#eef0ea'], accent: '#7f9c96', wood: '#d9b98f', fabric: '#b9c4c2', metal: '#555', rug: '#c8cdc9', curtain: '#f2f1ec', floor: 'oak', wet: 'antiskid', ceiling: 'flat', desc: 'Bright, cosy and practical with light woods.' },
  Industrial: { walls: ['#a29d97', '#8f8a84', '#b9b2a8'], accent: '#b5651d', wood: '#5a3e2b', fabric: '#6b4f3a', metal: '#1e1e1e', rug: '#5d5650', curtain: '#7d756c', floor: 'concrete', wet: 'granite', ceiling: 'flat', desc: 'Raw concrete, dark metal and leather tones.' },
  'Indian Contemporary': { walls: ['#f3e3c8', '#efd7b5', '#e9dcc5'], accent: '#b5452f', wood: '#7a4a2a', fabric: '#c2563b', metal: '#a8843d', rug: '#9e3d2b', curtain: '#d9a441', floor: 'indian_marble', wet: 'antiskid', ceiling: 'cove', desc: 'Sheesham wood, terracotta and brass on marble.' },
  Luxury: { walls: ['#ede6da', '#e3d9c9', '#d9d2c7'], accent: '#1f2a44', wood: '#4a3426', fabric: '#2c3a5c', metal: '#b8975a', rug: '#3a4562', curtain: '#cdbfa6', floor: 'marble', wet: 'marble', ceiling: 'tray', desc: 'Italian marble, deep navy velvet and brushed gold.' },
  Bohemian: { walls: ['#f0d9c0', '#e8c9a8', '#efe0c9'], accent: '#c86b4a', wood: '#8b5e3c', fabric: '#d08a5e', metal: '#7a6a4a', rug: '#b0503a', curtain: '#e3b77c', floor: 'walnut', wet: 'ceramic', ceiling: 'flat', desc: 'Layered textures, warm earth tones and plants.' },
};
const WOOD_FINISHES = { 'Light Oak': '#d2b48c', 'Teak': '#9a6a3a', 'Walnut': '#5d4030', 'Sheesham': '#7a4a2a', 'White Laminate': '#efeeea', 'Matte Black': '#262626', 'Grey Ash': '#9b958c' };
const NAMED_COLORS = {
  white: '#f4f3ef', 'off white': '#efe9de', ivory: '#f2ecd9', cream: '#efe4cc', beige: '#e3d4b8', sand: '#d9c4a0', taupe: '#b5a593', grey: '#bfbfbb', gray: '#bfbfbb', 'light grey': '#d8d8d4', charcoal: '#4a4a4a',
  black: '#2a2a2a', blue: '#9fb8d4', 'sky blue': '#b8d6ea', 'powder blue': '#c4d6e4', navy: '#2e3f5c', teal: '#4f8a8b', turquoise: '#7cc6c0', green: '#a9c4a0', 'sage green': '#b5c4a8', sage: '#b5c4a8', mint: '#c6e3d1', olive: '#8a8f5c', 'emerald': '#3f7d5f', 'forest green': '#3f5e46',
  yellow: '#f1dc8f', mustard: '#d4a73a', peach: '#f3c8a8', coral: '#ee9a85', pink: '#efc2c8', 'blush': '#efd1cf', 'dusty pink': '#d9a7a7', red: '#c75a4a', maroon: '#7a2e2e', terracotta: '#c56c4b', orange: '#e59a5b',
  lavender: '#cfc3e3', lilac: '#d6c7e3', purple: '#8e6fae', brown: '#8b6447', 'warm white': '#f3eee3', greige: '#cdc5b8', 'pastel green': '#cfe5c9', 'pastel blue': '#cfe0ee',
};

/* ---------- furniture catalog ---------- */
const B = (w, h, d, x, y, z, role, o = {}) => Object.assign({ k: 'box', w, h, d, x, y, z, role }, o);
const C = (r, h, x, y, z, role, o = {}) => Object.assign({ k: 'cyl', r, h, x, y, z, role }, o);
const SP = (r, x, y, z, role, o = {}) => Object.assign({ k: 'sph', r, x, y, z, role }, o);
const legs4 = (W, D, h, t = 0.04, inset = 0.04, role = 'wood') => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => B(t, h, t, a * (W / 2 - inset), 0, b * (D / 2 - inset), role));
const chairParts = (x, z, ry, role = 'wood', seat = 'fabric') => {
  const rot = (px, pz) => [x + px * Math.cos(ry) + pz * Math.sin(ry), z - px * Math.sin(ry) + pz * Math.cos(ry)];
  const P = []; const add = (p, lx, lz) => { const [a, b] = rot(lx, lz); p.x = a; p.z = b; p.ry = ry; P.push(p); };
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([a, b]) => add(B(0.035, 0.45, 0.035, 0, 0, 0, role), a, b));
  add(B(0.44, 0.05, 0.44, 0, 0.45, 0, seat), 0, 0); add(B(0.42, 0.42, 0.04, 0, 0.5, 0, role), 0, -0.2);
  return P;
};
const CATALOG = {
  bed_double: { label: 'Double Bed', icon: '🛏️', w: 1.6, d: 2.05, h: 1.0, cat: 'Bedroom', price: [11000, 32000, 78000], tall: false,
    build: (W, D) => [B(W, 0.32, D, 0, 0.06, 0, 'wood'), ...legs4(W, D, 0.06, 0.06, 0.06), B(W - 0.06, 0.22, D - 0.12, 0, 0.36, 0.04, 'mattress'),
      B(W + 0.04, 1.0, 0.08, 0, 0, -D / 2 + 0.04, 'headboard'), B(W * 0.38, 0.12, 0.34, -W * 0.24, 0.58, -D / 2 + 0.3, 'white'), B(W * 0.38, 0.12, 0.34, W * 0.24, 0.58, -D / 2 + 0.3, 'white'),
      B(W - 0.02, 0.06, D * 0.52, 0, 0.56, D * 0.22, 'fabric')] },
  bed_single: { label: 'Single Bed', icon: '🛏️', w: 1.0, d: 2.0, h: 0.9, cat: 'Bedroom', price: [9000, 19000, 42000],
    build: (W, D) => [B(W, 0.3, D, 0, 0.06, 0, 'wood'), ...legs4(W, D, 0.06, 0.06, 0.06), B(W - 0.05, 0.2, D - 0.1, 0, 0.34, 0.03, 'mattress'), B(W + 0.02, 0.9, 0.07, 0, 0, -D / 2 + 0.035, 'headboard'),
      B(W * 0.6, 0.11, 0.32, 0, 0.54, -D / 2 + 0.28, 'white'), B(W - 0.02, 0.05, D * 0.5, 0, 0.54, D * 0.22, 'fabric')] },
  bunk_bed: { label: 'Bunk Bed', icon: '🪜', w: 1.0, d: 2.0, h: 1.75, cat: 'Kids', price: [18000, 32000, 60000],
    build: (W, D) => [...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => B(0.06, 1.75, 0.06, a * (W / 2 - 0.03), 0, b * (D / 2 - 0.03), 'wood')),
      B(W - 0.04, 0.08, D - 0.04, 0, 0.2, 0, 'wood'), B(W - 0.1, 0.16, D - 0.12, 0, 0.28, 0, 'mattress'), B(W - 0.04, 0.08, D - 0.04, 0, 1.05, 0, 'wood'), B(W - 0.1, 0.15, D - 0.12, 0, 1.13, 0, 'fabric'),
      B(W - 0.04, 0.05, 0.04, 0, 1.45, D / 2 - 0.03, 'wood'), ...[0.4, 0.65, 0.9].map(y => B(0.04, 0.04, 0.4, W / 2 - 0.02, y, D / 2 - 0.35, 'accent'))] },
  wardrobe: { label: 'Wardrobe', icon: '🚪', w: 1.8, d: 0.6, h: 2.1, cat: 'Storage', price: [12000, 40000, 98000], tall: true, storage: 2.2, perW: true,
    build: (W, D, H) => { const n = Math.max(2, Math.round(W / 0.6)); const P = [B(W, H, D, 0, 0, 0, 'wood')];
      for (let i = 1; i < n; i++) P.push(B(0.008, H - 0.06, 0.01, -W / 2 + W * i / n, 0.03, D / 2, 'metal'));
      for (let i = 0; i < n; i++) P.push(B(0.02, 0.22, 0.02, -W / 2 + W * (i + 0.5) / n + (i % 2 ? -1 : 1) * (W / n / 2 - 0.06), H * 0.45, D / 2 + 0.012, 'metal'));
      P.push(B(W, 0.04, D + 0.01, 0, H - 0.04, 0, 'accent')); return P; } },
  side_table: { label: 'Bedside Table', icon: '◻️', w: 0.45, d: 0.4, h: 0.55, cat: 'Bedroom', price: [2500, 6500, 16000],
    build: (W, D, H) => [B(W, H - 0.06, D, 0, 0.06, 0, 'wood'), ...legs4(W, D, 0.06, 0.03, 0.03, 'metal'), B(W * 0.7, 0.02, 0.02, 0, H * 0.55, D / 2 + 0.01, 'metal'), C(0.07, 0.03, 0.08, H, -0.05, 'metal'), C(0.015, 0.25, 0.08, H + 0.03, -0.05, 'metal'), C(0.11, 0.16, 0.08, H + 0.26, -0.05, 'lamp', { c: 0.7 })] },
  dresser: { label: 'Dresser + Mirror', icon: '🪞', w: 1.0, d: 0.45, h: 1.7, cat: 'Bedroom', price: [8000, 18000, 45000], storage: 0.4,
    build: (W, D) => [B(W, 0.78, D, 0, 0, 0, 'wood'), B(W - 0.04, 0.008, 0.01, 0, 0.4, D / 2, 'metal'), B(W * 0.62, 0.8, 0.03, 0, 0.82, -D / 2 + 0.05, 'mirror'), B(W * 0.66, 0.84, 0.02, 0, 0.8, -D / 2 + 0.03, 'wood')] },
  desk: { label: 'Work Desk', icon: '🖥️', w: 1.2, d: 0.6, h: 0.75, cat: 'Office', price: [5000, 14000, 38000],
    build: (W, D) => [B(W, 0.04, D, 0, 0.71, 0, 'wood'), ...legs4(W, D, 0.71, 0.04, 0.04, 'metal'), B(0.4, 0.5, D - 0.06, W / 2 - 0.24, 0.2, 0, 'wood'),
      B(0.55, 0.32, 0.03, 0, 0.9, -D / 2 + 0.12, 'screen'), B(0.05, 0.15, 0.05, 0, 0.75, -D / 2 + 0.12, 'metal'), B(0.4, 0.015, 0.14, 0, 0.75, 0.06, 'metal')] },
  office_chair: { label: 'Ergonomic Chair', icon: '🪑', w: 0.6, d: 0.6, h: 1.1, cat: 'Office', price: [4500, 12000, 32000],
    build: () => [C(0.3, 0.05, 0, 0.03, 0, 'metal'), C(0.03, 0.42, 0, 0.05, 0, 'metal'), B(0.5, 0.08, 0.48, 0, 0.46, 0.02, 'seat'), B(0.46, 0.55, 0.06, 0, 0.56, -0.22, 'seat', { rx: -0.12 }), B(0.06, 0.2, 0.3, -0.26, 0.5, 0, 'metal'), B(0.06, 0.2, 0.3, 0.26, 0.5, 0, 'metal')] },
  sofa_3: { label: '3-Seater Sofa', icon: '🛋️', w: 2.1, d: 0.92, h: 0.85, cat: 'Living', price: [18000, 46000, 125000],
    build: (W, D) => [B(W, 0.08, D, 0, 0.06, 0, 'wood'), B(W - 0.36, 0.2, D - 0.24, 0, 0.14, 0.08, 'fabric'), ...[0, 1, 2].map(i => B((W - 0.4) / 3 - 0.02, 0.14, D - 0.28, -W / 2 + 0.2 + (W - 0.4) / 6 * (2 * i + 1), 0.34, 0.09, 'fabric2')),
      B(W, 0.5, 0.22, 0, 0.14, -D / 2 + 0.11, 'fabric'), B(0.18, 0.46, D, -W / 2 + 0.09, 0.14, 0, 'fabric'), B(0.18, 0.46, D, W / 2 - 0.09, 0.14, 0, 'fabric'),
      B(0.4, 0.36, 0.12, -W / 2 + 0.45, 0.46, -D / 2 + 0.28, 'accent', { rx: -0.25 }), B(0.4, 0.36, 0.12, W / 2 - 0.45, 0.46, -D / 2 + 0.28, 'accent', { rx: -0.25 }), ...legs4(W, D, 0.06, 0.04, 0.08, 'metal')] },
  sofa_l: { label: 'L-shaped Sofa', icon: '🛋️', w: 2.5, d: 1.65, h: 0.85, cat: 'Living', price: [32000, 72000, 185000],
    build: (W, D) => [B(W, 0.2, 0.92, 0, 0.06, -D / 2 + 0.46, 'fabric'), B(0.92, 0.2, D - 0.92, W / 2 - 0.46, 0.06, 0.46, 'fabric'), B(W - 0.2, 0.13, 0.66, 0, 0.26, -D / 2 + 0.55, 'fabric2'), B(0.7, 0.13, D - 0.92, W / 2 - 0.46, 0.26, 0.46, 'fabric2'),
      B(W, 0.55, 0.22, 0, 0.06, -D / 2 + 0.11, 'fabric'), B(0.2, 0.42, 0.92, -W / 2 + 0.1, 0.06, -D / 2 + 0.46, 'fabric'), B(0.22, 0.55, D, W / 2 - 0.11, 0.06, 0, 'fabric'), B(0.4, 0.36, 0.12, -W / 2 + 0.5, 0.4, -D / 2 + 0.3, 'accent', { rx: -0.25 })] },
  armchair: { label: 'Armchair', icon: '💺', w: 0.85, d: 0.85, h: 0.85, cat: 'Living', price: [7000, 18000, 52000],
    build: (W, D) => [...legs4(W, D, 0.12, 0.035, 0.08, 'wood'), B(W, 0.18, D, 0, 0.12, 0, 'fabric'), B(W - 0.3, 0.12, D - 0.24, 0, 0.3, 0.06, 'fabric2'), B(W, 0.5, 0.18, 0, 0.3, -D / 2 + 0.09, 'fabric'), B(0.15, 0.3, D, -W / 2 + 0.075, 0.3, 0, 'fabric'), B(0.15, 0.3, D, W / 2 - 0.075, 0.3, 0, 'fabric')] },
  coffee_table: { label: 'Coffee Table', icon: '☕', w: 1.1, d: 0.6, h: 0.42, cat: 'Living', price: [4000, 11000, 34000],
    build: (W, D) => [B(W, 0.05, D, 0, 0.37, 0, 'wood'), B(W - 0.1, 0.03, D - 0.1, 0, 0.12, 0, 'wood'), ...legs4(W, D, 0.37, 0.035, 0.05, 'metal'), C(0.06, 0.1, 0.25, 0.42, 0, 'accent'), B(0.22, 0.04, 0.16, -0.25, 0.42, 0.05, 'white')] },
  tv_unit: { label: 'TV Unit + TV', icon: '📺', w: 1.8, d: 0.42, h: 1.4, cat: 'Living', price: [9000, 24000, 70000],
    build: (W, D) => [B(W, 0.45, D, 0, 0.08, 0, 'wood'), B(W, 0.08, D - 0.04, 0, 0, 0, 'metal'), B(Math.min(1.4, W * 0.75), 0.78, 0.05, 0, 0.75, -D / 2 + 0.05, 'screen'), B(W * 0.32, 0.12, 0.25, -W * 0.3, 0.53, -0.02, 'accent'), SP(0.08, W * 0.38, 0.62, 0, 'plant')] },
  dining_set: { label: 'Dining Set (6)', icon: '🍽️', w: 1.7, d: 1.9, h: 0.9, cat: 'Dining', price: [22000, 52000, 140000],
    build: (W, D) => { const tw = W - 0.1, td = D - 1.0; const P = [B(tw, 0.05, td, 0, 0.71, 0, 'wood'), ...legs4(tw, td, 0.71, 0.06, 0.08, 'wood'), C(0.08, 0.2, 0, 0.76, 0, 'accent', { c: 0.6 })];
      [-1, 0, 1].forEach(i => { P.push(...chairParts(i * tw / 3.2, -td / 2 - 0.22, 0)); P.push(...chairParts(i * tw / 3.2, td / 2 + 0.22, Math.PI)); }); return P; } },
  dining_4: { label: 'Dining Set (4)', icon: '🍽️', w: 1.25, d: 1.75, h: 0.9, cat: 'Dining', price: [14000, 32000, 85000],
    build: (W, D) => { const tw = W - 0.05, td = D - 0.95; const P = [B(tw, 0.05, td, 0, 0.71, 0, 'wood'), ...legs4(tw, td, 0.71, 0.05, 0.06, 'wood')];
      [-1, 1].forEach(i => { P.push(...chairParts(i * tw / 4.5, -td / 2 - 0.22, 0)); P.push(...chairParts(i * tw / 4.5, td / 2 + 0.22, Math.PI)); }); return P; } },
  kitchen_counter: { label: 'Kitchen Counter', icon: '🍳', w: 2.4, d: 0.62, h: 2.2, cat: 'Kitchen', price: [45000, 110000, 260000], tall: true, storage: 1.2, perW: true,
    build: (W, D) => { const P = [B(W, 0.1, D - 0.06, 0, 0, -0.03, 'metal'), B(W, 0.76, D - 0.02, 0, 0.1, 0, 'cabinet'), B(W + 0.02, 0.04, D + 0.02, 0, 0.86, 0, 'stone'),
      B(W, 0.7, 0.34, 0, 1.45, -D / 2 + 0.17, 'cabinet'), B(0.6, 0.45, 0.42, -W / 2 + 0.6, 1.5, -D / 2 + 0.21, 'metal'), B(0.55, 0.04, 0.4, W * 0.18, 0.88, 0, 'metal'), B(0.5, 0.02, 0.36, W * 0.18, 0.9, 0, 'dark'),
      C(0.08, 0.02, -W / 2 + 0.45, 0.9, -0.08, 'dark'), C(0.08, 0.02, -W / 2 + 0.75, 0.9, -0.08, 'dark'), C(0.07, 0.02, -W / 2 + 0.45, 0.9, 0.14, 'dark'), C(0.07, 0.02, -W / 2 + 0.75, 0.9, 0.14, 'dark'), B(0.02, 0.3, 0.02, W * 0.18, 0.9, -D / 2 + 0.08, 'metal')];
      const n = Math.max(2, Math.round(W / 0.6)); for (let i = 1; i < n; i++) { P.push(B(0.006, 0.7, 0.01, -W / 2 + W * i / n, 0.12, D / 2 - 0.01, 'dark')); P.push(B(0.006, 0.66, 0.01, -W / 2 + W * i / n, 1.47, -D / 2 + 0.345, 'dark')); }
      return P; } },
  fridge: { label: 'Refrigerator', icon: '🧊', w: 0.72, d: 0.72, h: 1.8, cat: 'Kitchen', price: [22000, 38000, 95000], tall: true,
    build: (W, D, H) => [B(W, H, D, 0, 0, 0, 'appliance'), B(W - 0.02, 0.006, 0.01, 0, H * 0.62, D / 2, 'dark'), B(0.025, 0.4, 0.03, -W / 2 + 0.07, H * 0.68, D / 2 + 0.015, 'metal'), B(0.025, 0.3, 0.03, -W / 2 + 0.07, H * 0.25, D / 2 + 0.015, 'metal')] },
  toilet: { label: 'Western Toilet', icon: '🚽', w: 0.42, d: 0.68, h: 0.8, cat: 'Bath', price: [6000, 14000, 38000],
    build: () => [B(0.26, 0.32, 0.4, 0, 0, 0.08, 'ceramic'), C(0.19, 0.08, 0, 0.32, 0.12, 'ceramic'), B(0.4, 0.4, 0.18, 0, 0.38, -0.25, 'ceramic'), B(0.38, 0.02, 0.4, 0, 0.405, 0.1, 'white')] },
  wash_basin: { label: 'Wash Basin + Mirror', icon: '🚰', w: 0.6, d: 0.45, h: 1.7, cat: 'Bath', price: [4000, 11000, 30000],
    build: (W, D) => [B(W, 0.5, D - 0.05, 0, 0.3, -0.02, 'cabinet'), B(W, 0.08, D, 0, 0.8, 0, 'ceramic'), B(0.04, 0.12, 0.04, 0, 0.88, -D / 2 + 0.08, 'metal'), B(W * 0.9, 0.7, 0.03, 0, 1.05, -D / 2 + 0.02, 'mirror')] },
  shower: { label: 'Shower Enclosure', icon: '🚿', w: 0.95, d: 0.95, h: 2.0, cat: 'Bath', price: [9000, 24000, 65000], tall: true,
    build: (W, D) => [B(W, 0.05, D, 0, 0, 0, 'ceramic'), B(W, 1.95, 0.01, 0, 0.05, D / 2 - 0.01, 'glass'), B(0.01, 1.95, D, W / 2 - 0.01, 0.05, 0, 'glass'), C(0.1, 0.02, 0, 1.95, -D / 2 + 0.25, 'metal'), B(0.03, 0.03, 0.25, 0, 1.97, -D / 2 + 0.12, 'metal')] },
  bookshelf: { label: 'Bookshelf', icon: '📚', w: 0.9, d: 0.35, h: 1.9, cat: 'Storage', price: [4500, 12000, 36000], tall: true, storage: 0.5,
    build: (W, D, H) => { const P = [B(0.03, H, D, -W / 2 + 0.015, 0, 0, 'wood'), B(0.03, H, D, W / 2 - 0.015, 0, 0, 'wood'), B(W, H, 0.02, 0, 0, -D / 2 + 0.01, 'wood')];
      const cols = ['#a64b2a', '#2e5e7e', '#d4a73a', '#3f6e4a', '#7a3e6e', '#e6dcc8', '#444'];
      for (let i = 0; i <= 4; i++) { const y = i * (H - 0.03) / 4; P.push(B(W - 0.04, 0.025, D, 0, y, 0, 'wood'));
        if (i < 4) { let x = -W / 2 + 0.05; let k = i * 3; while (x < W / 2 - 0.12) { const bw = 0.03 + ((k * 7) % 5) * 0.008, bh = 0.2 + ((k * 13) % 7) * 0.015; P.push(B(bw, bh, D * 0.75, x + bw / 2, y + 0.025, 0.01, 'c:' + cols[k % cols.length])); x += bw + 0.004; k++; if (k % 9 === 0) x += 0.12; } } }
      return P; } },
  plant: { label: 'Indoor Plant', icon: '🪴', w: 0.45, d: 0.45, h: 1.15, cat: 'Decor', price: [800, 2500, 7500], decor: true,
    build: () => [C(0.16, 0.34, 0, 0, 0, 'pot', { c: 1.25 }), C(0.012, 0.4, 0, 0.3, 0, 'wood'), SP(0.24, 0, 0.75, 0, 'plant'), SP(0.18, 0.11, 0.92, 0.05, 'plant2'), SP(0.16, -0.1, 0.62, -0.06, 'plant')] },
  rug: { label: 'Area Rug', icon: '🟫', w: 2.0, d: 1.4, h: 0.012, cat: 'Decor', price: [3000, 9000, 32000], flat: true, decor: true,
    build: (W, D) => [B(W, 0.012, D, 0, 0.002, 0, 'rug', { pattern: 7, patScale: 0.25 }), B(W - 0.2, 0.013, D - 0.2, 0, 0.002, 0, 'rug2')] },
  floor_lamp: { label: 'Floor Lamp', icon: '💡', w: 0.4, d: 0.4, h: 1.65, cat: 'Lighting', price: [2200, 6500, 22000], decor: true,
    build: () => [C(0.16, 0.03, 0, 0, 0, 'metal'), C(0.015, 1.35, 0, 0.03, 0, 'metal'), C(0.2, 0.3, 0, 1.33, 0, 'lamp', { c: 0.65 })] },
  gaming_desk: { label: 'Gaming Setup', icon: '🎮', w: 1.5, d: 0.72, h: 1.2, cat: 'Gaming', price: [35000, 85000, 220000],
    build: (W, D) => [B(W, 0.045, D, 0, 0.72, 0, 'dark'), B(0.06, 0.72, D - 0.1, -W / 2 + 0.05, 0, 0, 'dark'), B(0.06, 0.72, D - 0.1, W / 2 - 0.05, 0, 0, 'dark'), B(W, 0.012, 0.012, 0, 0.71, D / 2 - 0.006, 'led'),
      B(0.62, 0.36, 0.03, -0.33, 0.92, -D / 2 + 0.16, 'screen', { ry: 0.25 }), B(0.62, 0.36, 0.03, 0.33, 0.92, -D / 2 + 0.16, 'screen', { ry: -0.25 }), B(0.06, 0.18, 0.06, -0.3, 0.765, -D / 2 + 0.16, 'metal'), B(0.06, 0.18, 0.06, 0.3, 0.765, -D / 2 + 0.16, 'metal'),
      B(0.22, 0.48, 0.45, W / 2 - 0.25, 0.765, -0.05, 'dark'), B(0.012, 0.44, 0.4, W / 2 - 0.36, 0.785, -0.05, 'led'), B(0.45, 0.02, 0.15, 0, 0.765, 0.12, 'dark')] },
  gaming_chair: { label: 'Gaming Chair', icon: '🪑', w: 0.65, d: 0.65, h: 1.3, cat: 'Gaming', price: [9000, 22000, 48000],
    build: () => [C(0.32, 0.05, 0, 0.03, 0, 'metal'), C(0.035, 0.42, 0, 0.05, 0, 'metal'), B(0.52, 0.1, 0.5, 0, 0.46, 0.02, 'dark'), B(0.5, 0.8, 0.08, 0, 0.56, -0.24, 'dark', { rx: -0.14 }), B(0.3, 0.6, 0.085, 0, 0.62, -0.235, 'accent', { rx: -0.14 }), B(0.06, 0.18, 0.32, -0.28, 0.52, 0, 'dark'), B(0.06, 0.18, 0.32, 0.28, 0.52, 0, 'dark')] },
  beanbag: { label: 'Bean Bag', icon: '🫘', w: 0.85, d: 0.85, h: 0.6, cat: 'Living', price: [2500, 5500, 14000], decor: true,
    build: () => [SP(0.42, 0, 0.27, 0, 'accent', { sy: 0.65 }), SP(0.3, 0, 0.42, -0.18, 'accent', { sy: 0.8 })] },
  shoe_rack: { label: 'Shoe Rack', icon: '👟', w: 0.9, d: 0.35, h: 0.95, cat: 'Storage', price: [2500, 7000, 18000], storage: 0.25,
    build: (W, D, H) => [B(W, H, D, 0, 0, 0, 'wood'), B(W - 0.02, 0.006, 0.01, 0, H / 2, D / 2, 'dark'), B(W, 0.03, D + 0.01, 0, H - 0.03, 0, 'accent')] },
  storage_cabinet: { label: 'Storage Cabinet', icon: '🗄️', w: 0.9, d: 0.45, h: 1.85, cat: 'Storage', price: [6000, 15000, 42000], tall: true, storage: 0.7,
    build: (W, D, H) => [B(W, H, D, 0, 0, 0, 'wood'), B(0.006, H - 0.04, 0.01, 0, 0.02, D / 2, 'dark'), B(0.02, 0.18, 0.02, -0.05, H * 0.5, D / 2 + 0.01, 'metal'), B(0.02, 0.18, 0.02, 0.05, H * 0.5, D / 2 + 0.01, 'metal')] },
  closet_rack: { label: 'Open Closet System', icon: '👔', w: 1.6, d: 0.55, h: 2.1, cat: 'Storage', price: [12000, 30000, 85000], tall: true, storage: 1.8, perW: true,
    build: (W, D, H) => { const P = [B(0.03, H, D, -W / 2 + 0.015, 0, 0, 'wood'), B(0.03, H, D, W / 2 - 0.015, 0, 0, 'wood'), B(0.03, H, D, 0, 0, 0, 'wood'), B(W, 0.03, D, 0, H - 0.03, 0, 'wood'), B(W, 0.03, D, 0, 0.35, 0, 'wood'), B(W, 0.02, D, 0, H - 0.4, 0, 'wood'), C(0.012, W - 0.06, -W / 2 + 0.03, 1.6, 0, 'metal', { rz: -Math.PI / 2 })];
      const cols = ['#c9b79c', '#5d6d7e', '#e8e2d6', '#9e3d2b', '#2f3e46', '#d4a73a', '#7f9c96'];
      for (let i = 0; i < Math.floor((W - 0.1) / 0.09); i++) { const x = -W / 2 + 0.08 + i * 0.09; if (Math.abs(x) < 0.05) continue; P.push(B(0.03, 0.75 + (i % 3) * 0.12, D * 0.8, x, 1.55 - 0.75 - (i % 3) * 0.12, 0, 'c:' + cols[i % cols.length])); }
      for (let i = 0; i < 5; i++) P.push(B(0.12, 0.1, 0.25, -W / 2 + 0.15 + i * (W - 0.3) / 4, 0.03, 0.05, 'dark'));
      return P; } },
  washing_machine: { label: 'Washing Machine', icon: '🧺', w: 0.62, d: 0.62, h: 0.86, cat: 'Utility', price: [16000, 28000, 60000],
    build: (W, D, H) => [B(W, H, D, 0, 0, 0, 'appliance'), C(0.2, 0.02, 0, H * 0.45, D / 2, 'dark', { rx: Math.PI / 2 }), C(0.14, 0.025, 0, H * 0.45, D / 2, 'glass2', { rx: Math.PI / 2 }), B(W - 0.04, 0.08, 0.01, 0, H - 0.12, D / 2, 'dark')] },
  crib: { label: 'Baby Crib', icon: '🧸', w: 0.75, d: 1.3, h: 1.0, cat: 'Kids', price: [7000, 16000, 40000],
    build: (W, D) => { const P = [...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => B(0.05, 1.0, 0.05, a * (W / 2 - 0.025), 0, b * (D / 2 - 0.025), 'white')), B(W - 0.04, 0.05, D - 0.04, 0, 0.3, 0, 'white'), B(W - 0.08, 0.1, D - 0.08, 0, 0.35, 0, 'mattress'), B(W, 0.04, 0.04, 0, 0.92, -D / 2 + 0.02, 'white'), B(W, 0.04, 0.04, 0, 0.92, D / 2 - 0.02, 'white'), B(0.04, 0.04, D, -W / 2 + 0.02, 0.92, 0, 'white'), B(0.04, 0.04, D, W / 2 - 0.02, 0.92, 0, 'white')];
      for (let i = 1; i < 9; i++) { P.push(B(0.02, 0.58, 0.02, -W / 2 + 0.02, 0.35, -D / 2 + D * i / 9, 'white')); P.push(B(0.02, 0.58, 0.02, W / 2 - 0.02, 0.35, -D / 2 + D * i / 9, 'white')); }
      return P; } },
  treadmill: { label: 'Treadmill', icon: '🏃', w: 0.8, d: 1.85, h: 1.35, cat: 'Gym', price: [28000, 55000, 140000],
    build: (W, D) => [B(W, 0.18, D, 0, 0, 0.05, 'dark'), B(W - 0.24, 0.02, D - 0.3, 0, 0.18, 0.1, 'rubber'), B(0.05, 1.2, 0.06, -W / 2 + 0.06, 0.1, -D / 2 + 0.2, 'metal', { rx: 0.12 }), B(0.05, 1.2, 0.06, W / 2 - 0.06, 0.1, -D / 2 + 0.2, 'metal', { rx: 0.12 }), B(W - 0.05, 0.2, 0.3, 0, 1.2, -D / 2 + 0.22, 'dark', { rx: -0.4 }), B(0.3, 0.14, 0.01, 0, 1.28, -D / 2 + 0.32, 'led', { rx: -0.4 })] },
  pet_bed: { label: 'Pet Bed', icon: '🐾', w: 0.75, d: 0.6, h: 0.22, cat: 'Pets', price: [1500, 3500, 9000], decor: true,
    build: () => [C(0.34, 0.2, 0, 0, 0, 'fabric', { sy: 1 }), C(0.27, 0.12, 0, 0.06, 0, 'mattress')] },
  pooja_unit: { label: 'Pooja Mandir', icon: '🪔', w: 0.75, d: 0.45, h: 1.6, cat: 'Living', price: [8000, 22000, 65000],
    build: (W, D) => [B(W, 0.75, D, 0, 0, 0, 'wood'), B(W, 0.05, D, 0, 0.75, 0, 'metal'), B(0.05, 0.7, 0.05, -W / 2 + 0.05, 0.8, D / 2 - 0.05, 'wood'), B(0.05, 0.7, 0.05, W / 2 - 0.05, 0.8, D / 2 - 0.05, 'wood'), B(W, 0.18, D, 0, 1.42, 0, 'wood'), B(W * 0.5, 0.12, D * 0.6, 0, 1.6, 0, 'metal'), B(W - 0.1, 0.65, 0.02, 0, 0.8, -D / 2 + 0.02, 'accent'), SP(0.035, 0, 0.83, 0.1, 'diya'), SP(0.035, -0.18, 0.83, 0.1, 'diya'), SP(0.035, 0.18, 0.83, 0.1, 'diya')] },
  outdoor_chair: { label: 'Rattan Chair', icon: '🪑', w: 0.65, d: 0.65, h: 0.8, cat: 'Outdoor', price: [3500, 8500, 22000],
    build: (W, D) => [B(W, 0.08, D, 0, 0.35, 0, 'rattan'), B(W, 0.4, 0.06, 0, 0.42, -D / 2 + 0.03, 'rattan', { rx: -0.15 }), ...legs4(W, D, 0.35, 0.04, 0.04, 'rattan'), B(W - 0.1, 0.08, D - 0.15, 0, 0.43, 0.05, 'fabric2')] },
  side_table_round: { label: 'Round Side Table', icon: '⚪', w: 0.55, d: 0.55, h: 0.55, cat: 'Outdoor', price: [1800, 4500, 12000], decor: true,
    build: () => [C(0.27, 0.035, 0, 0.5, 0, 'wood'), C(0.025, 0.5, 0, 0, 0, 'metal'), C(0.16, 0.02, 0, 0, 0, 'metal')] },
  bathtub: { label: 'Bathtub', icon: '🛁', w: 0.8, d: 1.7, h: 0.6, cat: 'Bath', price: [18000, 45000, 140000],
    build: (W, D) => [B(W, 0.5, D, 0, 0, 0, 'ceramic'), B(W - 0.14, 0.03, D - 0.14, 0, 0.49, 0, 'water'), C(0.025, 0.2, 0, 0.5, -D / 2 + 0.05, 'metal')] },
};
const CAT_ORDER = ['Bedroom', 'Living', 'Dining', 'Kitchen', 'Bath', 'Office', 'Storage', 'Gaming', 'Kids', 'Gym', 'Outdoor', 'Utility', 'Decor', 'Lighting', 'Pets'];
const TIER_IX = { budget: 0, standard: 1, premium: 2 };
const TIERS = ['budget', 'standard', 'premium'];

/* ---------- application state ---------- */
const S = {
  prefs: { style: 'Japandi', budget: 1000000, colors: ['#b5c4a8', '#e3d4b8'], family: 4, pets: false, kids: false, wfh: true, storage: 'medium', furniture: 'standard', onboarded: false },
  backendUrl: '', aiProvider: 'auto', orKey: '', orModel: 'qwen/qwen3.5-27b', ollamaModel: 'qwen3.5:9b', backend: null, backendOK: false, backendAt: 0,
  project: null, sel: null, view: '3d', panel: 'design', history: [], future: [], variants: [], original: null,
  hour: 10, cutaway: false, roof: false, labels: true, overlay: 'none', projects: [], structuralLog: [],
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('dimora_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('dimora_' + k, JSON.stringify(v)); } catch (e) { } },
};

/* ---------- cloud accounts & sync (DIMORA server) ---------- */
const CLOUD = { token: store.get('token', null), list: null, timers: new Map(), warned: false };
const isCloud = () => !!(CLOUD.token && currentUser()?.method === 'cloud');
const projOwner = () => { const u = currentUser(); return u && u.method === 'cloud' ? u.id : 'device'; };
function cloudSummary(pj, thumb) { return { thumb, rooms: pj.floors.reduce((s, f) => s + f.rooms.length, 0), cost: (() => { try { return withProjectSync(pj, () => homeCost().total); } catch (e) { return 0; } })(), theme: pj.theme, floors: pj.floors.length }; }
function withProjectSync(p, fn) { const keep = S.project; S.project = p; try { return fn(); } finally { S.project = keep; } }
function cloudPush(pj, thumb) { // debounced upload of one project
  if (!isCloud()) return; clearTimeout(CLOUD.timers.get(pj.id));
  CLOUD.timers.set(pj.id, setTimeout(async () => {
    try { await API.req('/api/projects/' + encodeURIComponent(pj.id), { method: 'PUT', body: { project: pj, summary: cloudSummary(pj, thumb) }, timeout: 60000 }); S.cloudSaved = Date.now(); setSyncChip('ok'); }
    catch (e) { setSyncChip('err', e.message); if (!CLOUD.warned) { CLOUD.warned = true; toast('Couldn\'t save to your account (' + e.message + ') — it\'s kept on this device and will retry.', 5000); } }
  }, 1200));
}
function setSyncChip(st, msg) { const el = document.getElementById('sync-chip'); if (!el) return; el.hidden = !isCloud(); el.className = 'sync-chip ' + st; el.textContent = st === 'ok' ? '☁ Saved' : st === 'err' ? '☁ Offline' : '☁ Saving…'; el.title = st === 'err' ? 'Not saved to your account yet: ' + (msg || '') : 'Saved to your DIMORA account'; }
async function cloudList() { if (!isCloud()) return null; try { CLOUD.list = (await API.req('/api/projects', { timeout: 20000 })).projects; } catch (e) { CLOUD.list = null; } return CLOUD.list; }
async function cloudFetch(id) { const j = await API.req('/api/projects/' + encodeURIComponent(id), { timeout: 60000 }); return j.project; }
async function cloudSavePrefs() { if (!isCloud()) return; const u = currentUser(); try { await API.req('/api/auth/me', { method: 'PATCH', body: { name: u.name, prefs: { answers: u.answers || null, prefs: S.prefs } }, timeout: 20000 }); } catch (e) { } }
async function syncDeviceProjectsUp() { // projects made on this device before signing in move into the account
  const mine = store.get('projects', []).filter(p => !p.owner || p.owner === 'device'); let n = 0;
  for (const meta of mine) { const pj = store.get('proj_' + meta.id); if (!pj) continue; try { await API.req('/api/projects/' + encodeURIComponent(pj.id), { method: 'PUT', body: { project: pj, summary: cloudSummary(pj, meta.thumb) }, timeout: 60000 }); meta.owner = projOwner(); n++; } catch (e) { break; } }
  if (n) { const all = store.get('projects', []).map(p => mine.find(m => m.id === p.id) || p); store.set('projects', all); toast(`Saved ${n} project${n > 1 ? 's' : ''} from this device to your account`); if ($('#app').dataset.screen === 'dash') renderDash(); }
}
function cloudExpired() { if (!CLOUD.token) return; CLOUD.token = null; store.set('token', null); const u = store.get('user', null); if (u && u.method === 'cloud') { u.loggedIn = false; store.set('user', u); } AUTH.err = 'Your session expired — please sign in again.'; AUTH.mode = 'login'; show('login'); renderAuth(); }

function newProject(name = 'My Home') {
  return { id: uid('p'), name, created: Date.now(), updated: Date.now(), north: 0, theme: S.prefs.style || 'Japandi', scaleNote: '', wallThickness: null, floors: [newFloor('Ground Floor', 0)], activeFloor: 0, planImage: null };
}
function newFloor(name, level) { return { id: uid('f'), name, level, height: 2.9, rooms: [], doors: [], windows: [], stairs: [] }; }
const P = () => S.project;
async function withProject(p, fn) { const keep = S.project; S.project = p; try { return await fn(); } finally { S.project = keep; } }
const FL = () => S.project.floors[S.project.activeFloor];
const allRooms = () => S.project ? S.project.floors.flatMap(f => f.rooms) : [];
function findRoom(id) { for (const f of S.project.floors) { const r = f.rooms.find(r => r.id === id); if (r) return r; } return null; }
function floorOfRoom(room) { return S.project.floors.find(f => f.rooms.includes(room)) || FL(); }
function findItem(id) { for (const f of S.project.floors) for (const r of f.rooms) { const it = r.furniture.find(i => i.id === id); if (it) return { it, room: r, floor: f }; } return null; }
function makeRoom(o) {
  const t = ROOM_TYPES[o.type] ? o.type : 'empty';
  const th = THEMES[S.project?.theme || 'Japandi'];
  return Object.assign({ id: uid('r'), name: ROOM_TYPES[t].label, type: t, x: 0, y: 0, w: 3, d: 3, wall: null, floor: null, tier: S.prefs.furniture || 'standard', ceiling: null, lights: { ambient: true, task: t !== 'hall', accent: false }, curtains: true, theme: null, furniture: [] }, o, { type: t });
}
function roomTheme(room) { return THEMES[room.theme || S.project.theme] || THEMES.Japandi; }
function roomFloorKey(room) { if (room.floor) return room.floor; if (room.type === 'parking') return facade().drive || 'pavers'; if (room.type === 'garage') return 'concrete'; if (room.type === 'garden') return 'lawn'; const th = roomTheme(room); if (['bathroom', 'utility'].includes(room.type)) return th.wet; if (room.type === 'balcony') return 'deck'; if (room.type === 'kitchen') return th.floor === 'oak' || th.floor === 'walnut' || th.floor === 'carpet' ? 'vitrified' : th.floor; return th.floor; }
function roomWall(room) { if (room.wall) return room.wall; if (room.type === 'garage') return '#e8e7e3'; const th = roomTheme(room); const i = Object.keys(ROOM_TYPES).indexOf(room.type); return th.walls[i % th.walls.length]; }
function roomCeiling(room) { return room.ceiling || (['bathroom', 'balcony', 'utility', 'hall'].includes(room.type) ? 'flat' : roomTheme(room).ceiling); }
const area = r => r.w * r.d;
const inRoom = (r, x, y, m = 0) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.d + m;
function roomAt(x, y, floor = FL()) { let best = null; floor.rooms.forEach(r => { if (inRoom(r, x, y) && (!best || area(r) < area(best))) best = r; }); return best; }
function itemFootprint(it) { const a = ((it.rot % 360) + 360) % 360; const sw = (a === 90 || a === 270); const w = sw ? it.d : it.w, d = sw ? it.w : it.d; return { x: it.x - w / 2, y: it.y - d / 2, w, d }; }
function rectOverlap(a, b) { const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y); return ox > 0 && oy > 0 ? ox * oy : 0; }
function homeBounds(floor) {
  const rooms = floor ? floor.rooms : allRooms(); if (!rooms.length) return { x: 0, y: 0, w: 10, d: 8 };
  const x0 = Math.min(...rooms.map(r => r.x)), y0 = Math.min(...rooms.map(r => r.y)), x1 = Math.max(...rooms.map(r => r.x + r.w)), y1 = Math.max(...rooms.map(r => r.y + r.d));
  return { x: x0, y: y0, w: x1 - x0, d: y1 - y0 };
}
function makeItem(type, room, extra = {}) {
  const c = CATALOG[type]; if (!c) return null;
  return Object.assign({ id: uid('i'), type, x: room.x + room.w / 2, y: room.y + room.d / 2, rot: 0, w: c.w, d: c.d, h: c.h, tier: room.tier || 'standard', color: null, finish: null }, extra);
}

/* ---------- walls & openings ---------- */
function wallLines(floor) {
  const map = new Map();
  const add = (o, c, a, b) => { const k = o + ':' + Math.round(c * 20); if (!map.has(k)) map.set(k, { o, c, iv: [] }); map.get(k).iv.push([Math.min(a, b), Math.max(a, b)]); };
  floor.rooms.forEach(r => { add('h', r.y, r.x, r.x + r.w); add('h', r.y + r.d, r.x, r.x + r.w); add('v', r.x, r.y, r.y + r.d); add('v', r.x + r.w, r.y, r.y + r.d); });
  const lines = [];
  map.forEach(L => {
    L.iv.sort((a, b) => a[0] - b[0]); const m = [];
    L.iv.forEach(iv => { if (m.length && iv[0] <= m[m.length - 1][1] + 0.02) m[m.length - 1][1] = Math.max(m[m.length - 1][1], iv[1]); else m.push(iv.slice()); });
    m.forEach(([a, b]) => lines.push({ o: L.o, c: L.c, a, b }));
  });
  const open = openSpans(floor); if (!open.length) return lines;
  const out = [];
  lines.forEach(L => { let segs = [[L.a, L.b]];
    open.forEach(e => { if (e.o !== L.o || Math.abs(e.c - L.c) > 0.1) return;
      segs = segs.flatMap(([a, b]) => { const lo = Math.max(a, e.lo), hi = Math.min(b, e.hi); if (hi - lo < 0.05) return [[a, b]]; const o = []; if (lo - a > 0.05) o.push([a, lo]); if (b - hi > 0.05) o.push([hi, b]); return o; }); });
    segs.forEach(([a, b]) => out.push({ o: L.o, c: L.c, a, b })); });
  return out;
}
const sameGroup = (a, b) => !!(a.group && a.group === b.group);
/* edges shared by two parts of one open-plan space (same group): drawn without a wall */
function openSpans(floor) { const out = [], R = floor.rooms; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (sameGroup(R[i], R[j])) { const e = sharedEdge(R[i], R[j]); if (e) out.push(e); } return out; }
function isExteriorPoint(floor, o, c, t) { // point on wall line; exterior if one side is outside all rooms
  const e = 0.12; const p1 = o === 'h' ? [t, c - e] : [c - e, t], p2 = o === 'h' ? [t, c + e] : [c + e, t];
  const in1 = floor.rooms.some(r => !isOpenAir(r) && inRoom(r, p1[0], p1[1])), in2 = floor.rooms.some(r => !isOpenAir(r) && inRoom(r, p2[0], p2[1]));
  return in1 !== in2;
}
function openingsOn(floor, L) {
  const res = [];
  floor.doors.concat(garageDoors(floor)).forEach(d => { if (d.o === L.o && Math.abs((L.o === 'h' ? d.y : d.x) - L.c) < 0.2) { const t = L.o === 'h' ? d.x : d.y; if (t > L.a - 0.05 && t < L.b + 0.05) res.push({ kind: 'door', ref: d, a: Math.max(L.a, t - d.w / 2), b: Math.min(L.b, t + d.w / 2) }); } });
  floor.windows.forEach(d => { if (d.o === L.o && Math.abs((L.o === 'h' ? d.y : d.x) - L.c) < 0.2) { const t = L.o === 'h' ? d.x : d.y; if (t > L.a - 0.05 && t < L.b + 0.05) res.push({ kind: 'window', ref: d, a: Math.max(L.a, t - d.w / 2), b: Math.min(L.b, t + d.w / 2) }); } });
  return res.sort((p, q) => p.a - q.a);
}
// pieces: [{o,c,a,b,y0,y1,kind}]
/* split a wall line by what lies on each side: indoor room → wall, balcony edge to the open → railing,
   yard / open air on both sides → nothing at all */
function edgeKinds(floor, L) {
  const e = 0.12, side = (t, sg) => { const p = L.o === 'h' ? [t, L.c + sg * e] : [L.c + sg * e, t]; let best = null; floor.rooms.forEach(r => { if (inRoom(r, p[0], p[1]) && (!best || area(r) < area(best))) best = r; }); return best; };
  const cuts = new Set([L.a, L.b]); floor.rooms.forEach(r => { (L.o === 'h' ? [r.x, r.x + r.w] : [r.y, r.y + r.d]).forEach(v => { if (v > L.a + 0.01 && v < L.b - 0.01) cuts.add(v); }); });
  const ts = [...cuts].sort((a, b) => a - b), out = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const m = (ts[i] + ts[i + 1]) / 2, A = side(m, -1), B = side(m, 1);
    const balA = !!A && A.type === 'balcony', balB = !!B && B.type === 'balcony';
    const kind = (A && !isOpenAir(A)) || (B && !isOpenAir(B)) ? 'wall' : balA !== balB ? 'rail' : 'none';
    const last = out[out.length - 1]; if (last && last.kind === kind) last.b = ts[i + 1]; else out.push({ kind, a: ts[i], b: ts[i + 1] });
  }
  return out;
}
function wallPieces(floor) {
  const H = floor.height, out = [];
  wallLines(floor).flatMap(L0 => edgeKinds(floor, L0).filter(sg => sg.kind !== 'none' && sg.b - sg.a > 0.02).map(sg => ({ o: L0.o, c: L0.c, a: sg.a, b: sg.b, rail: sg.kind === 'rail' }))).forEach(L => {
    if (L.rail) { out.push({ o: L.o, c: L.c, a: L.a, b: L.b, y0: 0, y1: 1.05, kind: 'rail', ext: true }); return; }
    const ext = isExteriorPoint(floor, L.o, L.c, (L.a + L.b) / 2);
    let cur = L.a;
    openingsOn(floor, L).forEach(op => {
      if (op.a > cur + 0.01) out.push({ o: L.o, c: L.c, a: cur, b: op.a, y0: 0, y1: H, kind: 'solid', ext });
      if (op.kind === 'door') out.push({ o: L.o, c: L.c, a: op.a, b: op.b, y0: Math.min(H - 0.15, op.ref.h || DOOR_H), y1: H, kind: 'lintel', ext, ref: op.ref });
      else { const w = op.ref; out.push({ o: L.o, c: L.c, a: op.a, b: op.b, y0: 0, y1: w.sill, kind: 'sill', ext, ref: w }); out.push({ o: L.o, c: L.c, a: op.a, b: op.b, y0: Math.min(H, w.sill + w.h), y1: H, kind: 'head', ext, ref: w }); }
      cur = Math.max(cur, op.b);
    });
    if (L.b > cur + 0.01) out.push({ o: L.o, c: L.c, a: cur, b: L.b, y0: 0, y1: H, kind: 'solid', ext });
  });
  return out;
}
// which side of room an opening lies on
function roomSideOf(room, o, x, y) {
  if (o === 'h') { if (Math.abs(y - room.y) < 0.2 && x >= room.x - 0.05 && x <= room.x + room.w + 0.05) return 'N'; if (Math.abs(y - room.y - room.d) < 0.2 && x >= room.x - 0.05 && x <= room.x + room.w + 0.05) return 'S'; }
  else { if (Math.abs(x - room.x) < 0.2 && y >= room.y - 0.05 && y <= room.y + room.d + 0.05) return 'W'; if (Math.abs(x - room.x - room.w) < 0.2 && y >= room.y - 0.05 && y <= room.y + room.d + 0.05) return 'E'; }
  return null;
}
function roomOpenings(room, floor) {
  const res = [];
  floor.doors.forEach(d => { const s = roomSideOf(room, d.o, d.x, d.y); if (s) res.push({ kind: 'door', side: s, t: d.o === 'h' ? d.x : d.y, w: d.w, ref: d }); });
  floor.windows.forEach(d => { const s = roomSideOf(room, d.o, d.x, d.y); if (s) res.push({ kind: 'window', side: s, t: d.o === 'h' ? d.x : d.y, w: d.w, ref: d, ext: isExteriorPoint(floor, d.o, d.o === 'h' ? d.y : d.x, d.o === 'h' ? d.x : d.y) }); });
  return res;
}
function doorSwingRect(room, op) {
  const s = Math.min(op.w, 1.0);
  if (op.side === 'N') return { x: op.t - op.w / 2, y: room.y, w: op.w, d: s };
  if (op.side === 'S') return { x: op.t - op.w / 2, y: room.y + room.d - s, w: op.w, d: s };
  if (op.side === 'W') return { x: room.x, y: op.t - op.w / 2, w: s, d: op.w };
  return { x: room.x + room.w - s, y: op.t - op.w / 2, w: s, d: op.w };
}
function sharedEdge(a, b) {
  const t = 0.15;
  if (Math.abs(a.x + a.w - b.x) < t || Math.abs(b.x + b.w - a.x) < t) { const c = Math.abs(a.x + a.w - b.x) < t ? (a.x + a.w + b.x) / 2 : (b.x + b.w + a.x) / 2; const lo = Math.max(a.y, b.y), hi = Math.min(a.y + a.d, b.y + b.d); if (hi - lo > 0.6) return { o: 'v', c, lo, hi }; }
  if (Math.abs(a.y + a.d - b.y) < t || Math.abs(b.y + b.d - a.y) < t) { const c = Math.abs(a.y + a.d - b.y) < t ? (a.y + a.d + b.y) / 2 : (b.y + b.d + a.y) / 2; const lo = Math.max(a.x, b.x), hi = Math.min(a.x + a.w, b.x + b.w); if (hi - lo > 0.6) return { o: 'h', c, lo, hi }; }
  return null;
}
function doorBetween(a, b, floor) {
  const e = sharedEdge(a, b); if (!e) return null;
  return floor.doors.find(d => d.o === e.o && Math.abs((e.o === 'h' ? d.y : d.x) - e.c) < 0.2 && (e.o === 'h' ? d.x : d.y) > e.lo - 0.05 && (e.o === 'h' ? d.x : d.y) < e.hi + 0.05) || null;
}
function connectivity(floor) {
  const R = floor.rooms, adj = new Map(R.map(r => [r.id, []]));
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { if (doorBetween(R[i], R[j], floor) || (sameGroup(R[i], R[j]) && sharedEdge(R[i], R[j]))) { adj.get(R[i].id).push(R[j].id); adj.get(R[j].id).push(R[i].id); } }
  const entryDoor = floor.doors.find(d => d.main) || floor.doors.find(d => isExteriorPoint(floor, d.o, d.o === 'h' ? d.y : d.x, d.o === 'h' ? d.x : d.y));
  let start = null;
  const arr = S.project && S.project.floors.includes(floor) ? stairsBelow(floor)[0] : null;
  if (arr) start = roomAt(...stairEnd(arr, 'high', 0.5), floor);
  if (!start && entryDoor) start = R.find(r => roomSideOf(r, entryDoor.o, entryDoor.x, entryDoor.y));
  if (!start) start = R.find(r => r.type === 'living') || R[0];
  const order = [], seen = new Set(); const q = start ? [start.id] : [];
  if (start) seen.add(start.id);
  while (q.length) { const id = q.shift(); order.push(id); (adj.get(id) || []).forEach(n => { if (!seen.has(n)) { seen.add(n); q.push(n); } }); }
  return { adj, order, start, entryDoor, unreachable: R.filter(r => !seen.has(r.id)) };
}
// ensure doors & windows exist (used after detection)
function autoOpenings(floor, { doors = true, windows = true, main = true } = {}) {
  const R = floor.rooms; const hubs = ['living', 'dining', 'hall'];
  const pri = r => hubs.includes(r.type) ? 0 : r.type === 'kitchen' ? 1 : 2;
  const addDoor = (a, b) => { if (sameGroup(a, b)) return false; const e = sharedEdge(a, b); if (!e || doorBetween(a, b, floor)) return false; const w = (a.type === 'bathroom' || b.type === 'bathroom') ? 0.75 : 0.9; const t = clamp((e.lo + e.hi) / 2, e.lo + w / 2 + 0.1, e.hi - w / 2 - 0.1); floor.doors.push({ id: uid('d'), o: e.o, x: e.o === 'h' ? t : e.c, y: e.o === 'h' ? e.c : t, w }); return true; };
  if (doors) {
    R.forEach(a => R.forEach(b => { if (a !== b && pri(a) === 0 && pri(b) <= 1 && a.id < b.id) addDoor(a, b); }));
    const PREF = { bathroom: ['master', 'bedroom', 'hall', 'living'], utility: ['kitchen', 'hall', 'dining'], balcony: ['living', 'master', 'bedroom'], closet: ['master', 'bedroom'], pooja: ['living', 'hall', 'dining'] };
    const score = (r, o) => { const l = PREF[r.type]; if (l && l.includes(o.type)) return l.indexOf(o.type); return 10 + pri(o) + (o.type === 'bathroom' ? 20 : 0); };
    const order = R.slice().sort((a, b) => (a.type === 'bathroom') - (b.type === 'bathroom'));
    order.forEach(r => { if (pri(r) < 2) return; if (connectivity(floor).adj.get(r.id).length) return; const nb = R.filter(o => o !== r && sharedEdge(r, o)).sort((p, q) => score(r, p) - score(r, q)); if (nb.length) addDoor(r, nb[0]); });
    for (let k = 0; k < 6; k++) { const c = connectivity(floor); if (!c.unreachable.length) break; const u = c.unreachable[0]; const nb = R.filter(o => o !== u && sharedEdge(u, o) && !c.unreachable.includes(o)); if (nb.length) addDoor(u, nb.sort((p, q) => pri(p) - pri(q))[0]); else break; }
    if (main && !floor.doors.some(d => d.main)) {
      const lv = R.find(r => r.type === 'living') || R.slice().sort((a, b) => area(b) - area(a))[0];
      if (lv) { const sides = [['h', lv.y, lv.x, lv.x + lv.w], ['h', lv.y + lv.d, lv.x, lv.x + lv.w], ['v', lv.x, lv.y, lv.y + lv.d], ['v', lv.x + lv.w, lv.y, lv.y + lv.d]];
        let best = null; sides.forEach(([o, c, a, b]) => { const t = (a + b) / 2; if (isExteriorPoint(floor, o, c, t)) { const len = b - a; if (!best || len > best.len) best = { o, c, t: a + Math.min(1.0, len / 3), len }; } });
        if (best) floor.doors.push({ id: uid('d'), o: best.o, x: best.o === 'h' ? best.t : best.c, y: best.o === 'h' ? best.c : best.t, w: 1.0, main: true }); }
    }
  }
  if (windows) R.forEach(r => {
    const sides = [['h', r.y, r.x, r.x + r.w], ['h', r.y + r.d, r.x, r.x + r.w], ['v', r.x, r.y, r.y + r.d], ['v', r.x + r.w, r.y, r.y + r.d]];
    let n = 0;
    sides.sort((p, q) => (q[3] - q[2]) - (p[3] - p[2])).forEach(([o, c, a, b]) => {
      if (n >= (r.type === 'living' || r.type === 'master' ? 2 : 1)) return;
      const len = b - a; const t = (a + b) / 2; if (len < 1.2 || !isExteriorPoint(floor, o, c, t)) return;
      const blocked = floor.doors.some(d => d.o === o && Math.abs((o === 'h' ? d.y : d.x) - c) < 0.2 && Math.abs((o === 'h' ? d.x : d.y) - t) < (d.w / 2 + 0.8));
      const wt = blocked ? (a + len * 0.75) : t;
      if (floor.windows.some(w => w.o === o && Math.abs((o === 'h' ? w.y : w.x) - c) < 0.2 && Math.abs((o === 'h' ? w.x : w.y) - wt) < 1)) { n++; return; }
      const bath = r.type === 'bathroom'; const ww = bath ? 0.6 : r.type === 'balcony' ? Math.min(2.4, len - 0.6) : Math.min(r.type === 'living' ? 1.8 : 1.4, len - 0.6);
      floor.windows.push({ id: uid('w'), o, x: o === 'h' ? wt : c, y: o === 'h' ? c : wt, w: r2(ww), sill: bath ? 1.5 : r.type === 'balcony' ? 0.15 : 0.9, h: bath ? 0.6 : r.type === 'balcony' ? 2.0 : 1.25 });
      n++;
    });
  });
}
function snapRooms(floor, tol = 0.25) {
  const xs = [], ys = [];
  floor.rooms.forEach(r => { xs.push(r.x, r.x + r.w); ys.push(r.y, r.y + r.d); });
  const cluster = arr => { const s = [...arr].sort((a, b) => a - b), groups = []; s.forEach(v => { const g = groups[groups.length - 1]; if (g && v - g[g.length - 1] < tol) g.push(v); else groups.push([v]); }); return v => { const g = groups.find(g => v >= g[0] - 1e-9 && v <= g[g.length - 1] + 1e-9); return g ? snap(g.reduce((a, b) => a + b, 0) / g.length, 0.05) : v; }; };
  const fx = cluster(xs), fy = cluster(ys);
  floor.rooms.forEach(r => { const x0 = fx(r.x), x1 = fx(r.x + r.w), y0 = fy(r.y), y1 = fy(r.y + r.d); r.x = r2(x0); r.w = r2(Math.max(0.6, x1 - x0)); r.y = r2(y0); r.d = r2(Math.max(0.6, y1 - y0)); });
}

/* ---------- sample home (2BHK, Indian layout) ---------- */
function sampleHome() {
  const p = newProject('Sample 2BHK Apartment');
  const f = p.floors[0]; S.project = p;
  const R = (name, type, x, y, w, d) => f.rooms.push(makeRoom({ name, type, x, y, w, d }));
  R('Living Room', 'living', 0, 0, 5.2, 4.6); R('Dining', 'dining', 5.2, 0, 3.4, 3.2); R('Kitchen', 'kitchen', 8.6, 0, 3.0, 3.2);
  R('Passage', 'hall', 5.2, 3.2, 3.4, 1.4); R('Utility', 'utility', 8.6, 3.2, 3.0, 1.4);
  R('Master Bedroom', 'master', 0, 4.6, 4.4, 4.2); R('Common Bath', 'bathroom', 4.4, 4.6, 1.8, 2.1); R('Attached Bath', 'bathroom', 4.4, 6.7, 1.8, 2.1);
  R('Bedroom 2', 'bedroom', 6.2, 4.6, 3.6, 4.2); R('Study', 'study', 9.8, 4.6, 1.8, 2.8); R('Store', 'closet', 9.8, 7.4, 1.8, 1.4); R('Balcony', 'balcony', 0, 8.8, 4.4, 1.4);
  const by = n => f.rooms.find(r => r.name === n);
  const D = (a, b, w = 0.9, at = 0.5) => { const e = sharedEdge(by(a), by(b)); const t = r2(e.lo + (e.hi - e.lo) * at); f.doors.push({ id: uid('d'), o: e.o, x: e.o === 'h' ? t : e.c, y: e.o === 'h' ? e.c : t, w }); };
  f.doors.push({ id: uid('d'), o: 'h', x: 1.1, y: 0, w: 1.0, main: true });
  D('Living Room', 'Dining', 1.4, 0.55); D('Living Room', 'Passage', 0.9); D('Dining', 'Kitchen', 0.9, 0.7); D('Passage', 'Common Bath', 0.75);
  D('Passage', 'Bedroom 2', 0.9, 0.6); D('Living Room', 'Master Bedroom', 0.9, 0.8); D('Master Bedroom', 'Attached Bath', 0.75); D('Kitchen', 'Utility', 0.8);
  D('Bedroom 2', 'Study', 0.8, 0.3); D('Bedroom 2', 'Store', 0.75); D('Master Bedroom', 'Balcony', 0.9, 0.3);
  autoOpenings(f, { doors: false });
  return p;
}

/* ===================== FURNISHING, COSTS & ANALYZERS ===================== */
const SIDES = ['N', 'E', 'S', 'W'];
const SIDE_ROT = { N: 0, S: 180, W: 90, E: 270 };
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const frontVec = rot => { const a = rot * Math.PI / 180; return [Math.sin(a), Math.cos(a)]; };
const rightVec = rot => { const a = rot * Math.PI / 180; return [Math.cos(a), -Math.sin(a)]; };

function occupancy(room, floor, except = []) {
  const occ = [];
  room.furniture.forEach(it => { if (except.includes(it) || CATALOG[it.type]?.flat) return; occ.push(itemFootprint(it)); });
  roomOpenings(room, floor).filter(o => o.kind === 'door').forEach(o => occ.push(Object.assign(doorSwingRect(room, o), { door: true })));
  return occ;
}
function rectInRoom(rc, room, tol = 0.02) { return rc.x >= room.x - tol && rc.y >= room.y - tol && rc.x + rc.w <= room.x + room.w + tol && rc.y + rc.d <= room.y + room.d + tol; }
function rectFree(rc, occ) { return !occ.some(o => rectOverlap(rc, o) > 0.0015); }
function sideSpan(room, side) { return side === 'N' || side === 'S' ? [room.x, room.x + room.w] : [room.y, room.y + room.d]; }
function sideOpenings(room, floor, side) { return roomOpenings(room, floor).filter(o => o.side === side); }

function placeOnWall(room, floor, type, side, opt = {}) {
  const c = CATALOG[type]; const W = opt.w || c.w, D = opt.d || c.d, gap = opt.gap ?? 0.02;
  const occ = opt.occ || occupancy(room, floor);
  const [lo, hi] = sideSpan(room, side); const mid = (lo + hi) / 2;
  if (hi - lo < W + 0.02) return null;
  const tall = (opt.h || c.h) > 0.85 && !c.flat;
  const wins = sideOpenings(room, floor, side).filter(o => o.kind === 'window');
  const doorsHere = sideOpenings(room, floor, side).filter(o => o.kind === 'door');
  const cands = [];
  for (let t = lo + W / 2 + 0.01; t <= hi - W / 2 - 0.01 + 1e-9; t += 0.05) cands.push(r2(t));
  const al = opt.align || 'center';
  cands.sort((a, b) => al === 'start' ? a - b : al === 'end' ? b - a : al === 'near' ? Math.abs(a - opt.t0) - Math.abs(b - opt.t0) : Math.abs(a - mid) - Math.abs(b - mid));
  for (const t of cands) {
    let rc;
    if (side === 'N') rc = { x: t - W / 2, y: room.y + gap, w: W, d: D };
    else if (side === 'S') rc = { x: t - W / 2, y: room.y + room.d - gap - D, w: W, d: D };
    else if (side === 'W') rc = { x: room.x + gap, y: t - W / 2, w: D, d: W };
    else rc = { x: room.x + room.w - gap - D, y: t - W / 2, w: D, d: W };
    if (!rectInRoom(rc, room) || !rectFree(rc, occ)) continue;
    if (tall && wins.some(o => Math.abs(o.t - t) < (o.w / 2 + W / 2) && o.ref.sill < (opt.h || c.h))) continue;
    if (doorsHere.some(o => Math.abs(o.t - t) < (o.w / 2 + W / 2 + 0.05))) continue;
    return makeItem(type, room, { x: r2(rc.x + rc.w / 2), y: r2(rc.y + rc.d / 2), rot: SIDE_ROT[side], w: W, d: D, h: opt.h || c.h });
  }
  return null;
}
function placeFree(room, floor, type, opt = {}) {
  const c = CATALOG[type]; const occ = opt.occ || occupancy(room, floor);
  const near = opt.near || [room.x + room.w / 2, room.y + room.d / 2];
  let best = null;
  const rots = opt.rots || [0, 90];
  rots.forEach(rot => {
    const sw = rot % 180 !== 0; const fw = sw ? c.d : c.w, fd = sw ? c.w : c.d;
    for (let x = room.x + fw / 2 + 0.05; x <= room.x + room.w - fw / 2 - 0.05 + 1e-9; x += 0.1) for (let y = room.y + fd / 2 + 0.05; y <= room.y + room.d - fd / 2 - 0.05 + 1e-9; y += 0.1) {
      const rc = { x: x - fw / 2, y: y - fd / 2, w: fw, d: fd };
      if (!rectFree(rc, occ)) continue;
      const dist = Math.hypot(x - near[0], y - near[1]);
      if (!best || dist < best.dist) best = { dist, x, y, rot };
    }
  });
  return best ? makeItem(type, room, { x: r2(best.x), y: r2(best.y), rot: best.rot }) : null;
}
function addItem(room, it) { if (it) room.furniture.push(it); return it; }
function sideScores(room, floor, prefer = {}) {
  return SIDES.map(s => {
    const ops = sideOpenings(room, floor, s); const [lo, hi] = sideSpan(room, s);
    let sc = (hi - lo); if (ops.some(o => o.kind === 'door')) sc -= 3; if (ops.some(o => o.kind === 'window')) sc += prefer.window ? 2 : -0.8;
    const doorSides = roomOpenings(room, floor).filter(o => o.kind === 'door').map(o => o.side);
    if (doorSides.includes(OPP[s])) sc += prefer.faceDoor ? 1.5 : 0.6;
    return { s, sc };
  }).sort((a, b) => b.sc - a.sc).map(o => o.s);
}
function tryWalls(room, floor, type, sides, opt = {}) { for (const s of sides) { const it = placeOnWall(room, floor, type, s, opt); if (it) return addItem(room, it); } return null; }
function placeRel(room, floor, type, cx, cy, rot, skipOcc = []) {
  const it = makeItem(type, room, { x: r2(cx), y: r2(cy), rot }); const fp = itemFootprint(it);
  if (!rectInRoom(fp, room)) return null; const occ = occupancy(room, floor).filter(o => !skipOcc.some(s => s && rectOverlap(o, itemFootprint(s)) > 0 && !o.door));
  if (!rectFree(fp, occ)) return null; return addItem(room, it);
}
function addChairFor(room, floor, desk, type = 'office_chair') {
  const f = frontVec(desk.rot); const c = CATALOG[type];
  const it = makeItem(type, room, { x: r2(desk.x + f[0] * (desk.d / 2 + c.d / 2 - 0.12)), y: r2(desk.y + f[1] * (desk.d / 2 + c.d / 2 - 0.12)), rot: (desk.rot + 180) % 360 });
  if (rectInRoom(itemFootprint(it), room, 0.05)) room.furniture.push(it);
}
function cornerPlant(room, floor) {
  const c = CATALOG.plant; const occ = occupancy(room, floor);
  const corners = [[room.x + 0.3, room.y + 0.3], [room.x + room.w - 0.3, room.y + 0.3], [room.x + 0.3, room.y + room.d - 0.3], [room.x + room.w - 0.3, room.y + room.d - 0.3]];
  for (const [x, y] of corners) { const rc = { x: x - c.w / 2, y: y - c.d / 2, w: c.w, d: c.d }; if (rectFree(rc, occ)) return addItem(room, makeItem('plant', room, { x: r2(x), y: r2(y) })); }
  return null;
}
function rugUnder(room, floor, anchor, w = 2.0, d = 1.4, off = 0) {
  const f = frontVec(anchor.rot); const sw = anchor.rot % 180 !== 0;
  let cx = anchor.x + f[0] * off, cy = anchor.y + f[1] * off;
  let rw = Math.min(w, (sw ? room.d : room.w) - 0.6), rd = Math.min(d, (sw ? room.w : room.d) - 0.6);
  if (rw < 1 || rd < 0.8) return null;
  const it = makeItem('rug', room, { x: r2(cx), y: r2(cy), rot: anchor.rot, w: r2(rw), d: r2(rd) });
  const fp = itemFootprint(it); it.x = r2(clamp(it.x, room.x + fp.w / 2 + 0.1, room.x + room.w - fp.w / 2 - 0.1)); it.y = r2(clamp(it.y, room.y + fp.d / 2 + 0.1, room.y + room.d - fp.d / 2 - 0.1));
  return addItem(room, it);
}

function autoFurnish(room, floor = floorOfRoom(room), variant = 0) {
  room.furniture = [];
  if (isYard(room) || room.type === 'garage') return; // parking, gardens and garages are built in 3D, not furnished
  const t = room.type, pf = S.prefs, A = area(room);
  const rot = arr => arr.slice(variant % arr.length).concat(arr.slice(0, variant % arr.length));
  const sides = rot(sideScores(room, floor));
  if (t === 'bedroom' || t === 'master' || t === 'guest') {
    const kidsRoom = pf.kids && t === 'bedroom' && !allRooms().some(r => r !== room && r.furniture.some(i => i.type === 'bunk_bed'));
    const bedType = kidsRoom ? 'bunk_bed' : (Math.min(room.w, room.d) < 2.9 ? 'bed_single' : 'bed_double');
    const bed = tryWalls(room, floor, bedType, sides);
    if (bed) {
      const st = CATALOG.side_table, r = rightVec(bed.rot), b = frontVec(bed.rot);
      [-1, 1].forEach(s => placeRel(room, floor, 'side_table', bed.x + r[0] * s * (bed.w / 2 + st.w / 2 + 0.04) - b[0] * (bed.d / 2 - st.d / 2 - 0.02), bed.y + r[1] * s * (bed.w / 2 + st.w / 2 + 0.04) - b[1] * (bed.d / 2 - st.d / 2 - 0.02), bed.rot));
      if (bedType !== 'bunk_bed' && A > 10) rugUnder(room, floor, bed, Math.min(bed.w + 0.9, 2.4), 1.2, bed.d / 2 - 0.2);
    }
    const wardW = A > 14 ? 2.1 : A > 10 ? 1.8 : 1.2;
    const wSides = sides.filter(s => !bed || s !== Object.keys(SIDE_ROT).find(k => SIDE_ROT[k] === bed.rot)).concat(sides);
    for (const s of wSides) { const it = placeOnWall(room, floor, 'wardrobe', s, { w: wardW, align: 'end' }) || placeOnWall(room, floor, 'wardrobe', s, { w: 1.2, align: 'start' }); if (it) { addItem(room, it); break; } }
    if (pf.storage === 'high') tryWalls(room, floor, 'storage_cabinet', sides.slice().reverse());
    if ((pf.wfh && (t === 'master' || (t === 'bedroom' && !allRooms().some(r => ['office', 'study'].includes(r.type))))) || kidsRoom) {
      const ws = rot(sideScores(room, floor, { window: true }));
      const d = tryWalls(room, floor, 'desk', ws, { align: 'start' }); if (d) addChairFor(room, floor, d);
    }
    if (A > 13) tryWalls(room, floor, 'dresser', sides.slice().reverse());
    if (pf.kids && t === 'master' && A > 14 && !allRooms().some(r => r.type === 'nursery')) tryWalls(room, floor, 'crib', sides.slice().reverse());
    cornerPlant(room, floor);
  } else if (t === 'living') {
    const sofaType = A > 18 ? 'sofa_l' : 'sofa_3';
    const ls = rot(sideScores(room, floor, { faceDoor: false }));
    const sofa = tryWalls(room, floor, sofaType, ls) || tryWalls(room, floor, 'sofa_3', ls);
    if (sofa) {
      const f = frontVec(sofa.rot), ct = CATALOG.coffee_table; const off = (sofaType === 'sofa_l' && sofa.type === 'sofa_l' ? 0.92 : sofa.d) / 2 + 0.45 + ct.d / 2;
      const by = sofa.type === 'sofa_l' ? -sofa.d / 2 + 0.46 : 0;
      const cx = sofa.x + f[0] * (off + by) - (sofa.type === 'sofa_l' ? rightVec(sofa.rot)[0] * 0.3 : 0), cy = sofa.y + f[1] * (off + by) - (sofa.type === 'sofa_l' ? rightVec(sofa.rot)[1] * 0.3 : 0);
      const table = placeRel(room, floor, 'coffee_table', cx, cy, sofa.rot);
      const sSide = Object.keys(SIDE_ROT).find(k => SIDE_ROT[k] === sofa.rot);
      const tvSide = OPP[sSide]; const t0 = sSide === 'N' || sSide === 'S' ? sofa.x : sofa.y;
      const tv = addItem(room, placeOnWall(room, floor, 'tv_unit', tvSide, { align: 'near', t0 })) || tryWalls(room, floor, 'tv_unit', sides.filter(s => s !== sSide));
      if (table) {
        rugUnder(room, floor, table, 2.2, 1.6, 0);
        const r = rightVec(sofa.rot);
        for (const s of [1, -1]) { const a = placeRel(room, floor, 'armchair', table.x + r[0] * s * (table.w / 2 + 0.75), table.y + r[1] * s * (table.w / 2 + 0.75), (sofa.rot + (s > 0 ? 270 : 90)) % 360); if (a) break; }
      }
    }
    const pooja = S.prefs.style === 'Indian Contemporary' || /indian/i.test(P().theme);
    if (pooja && !allRooms().some(r => r.type === 'pooja')) tryWalls(room, floor, 'pooja_unit', sides.slice().reverse(), { align: 'end' });
    tryWalls(room, floor, 'bookshelf', sides.slice().reverse(), { align: 'start' });
    const main = roomOpenings(room, floor).find(o => o.kind === 'door' && o.ref.main);
    if (main) { const it = placeOnWall(room, floor, 'shoe_rack', main.side, { align: 'near', t0: main.t + 1.0 }) || tryWalls(room, floor, 'shoe_rack', sides); if (it && !room.furniture.includes(it)) addItem(room, it); }
    if (S.prefs.pets) { const pb = placeFree(room, floor, 'pet_bed', { near: [room.x + 0.5, room.y + room.d - 0.5] }); addItem(room, pb); }
    if (A > 14) { const fl = placeFree(room, floor, 'floor_lamp', { near: [room.x + 0.3, room.y + 0.3] }); addItem(room, fl); }
    cornerPlant(room, floor); cornerPlant(room, floor);
  } else if (t === 'kitchen') {
    const ks = rot(sideScores(room, floor, { window: true }));
    let placed = null;
    for (const s of ks) { const [lo, hi] = sideSpan(room, s); const w = Math.min(3.2, r2(hi - lo - 0.1)); if (w < 1.2) continue; placed = placeOnWall(room, floor, 'kitchen_counter', s, { w, align: 'start', h: 2.2 }) || placeOnWall(room, floor, 'kitchen_counter', s, { w: Math.max(1.2, w - 0.8), align: 'start', h: 2.2 }); if (placed) { addItem(room, placed); break; } }
    if (placed && A > 7) { const ps = Object.keys(SIDE_ROT).find(k => SIDE_ROT[k] === placed.rot); const adj = ['N', 'S'].includes(ps) ? ['E', 'W'] : ['N', 'S']; for (const s of adj) { const [lo, hi] = sideSpan(room, s); const it = placeOnWall(room, floor, 'kitchen_counter', s, { w: Math.min(2.0, r2(hi - lo - 0.8)), align: 'start', h: 2.2 }); if (it) { addItem(room, it); break; } } }
    tryWalls(room, floor, 'fridge', ks.slice().reverse(), { align: 'end' });
  } else if (t === 'dining') {
    const big = A > 9.5 && Math.min(room.w, room.d) > 2.9;
    const type = big ? 'dining_set' : 'dining_4';
    const r0 = room.w > room.d ? 90 : 0;
    const it = placeFree(room, floor, type, { rots: [r0, (r0 + 90) % 180] }); addItem(room, it);
    tryWalls(room, floor, 'storage_cabinet', sides);
    cornerPlant(room, floor);
  } else if (t === 'bathroom') {
    const ds = roomOpenings(room, floor).find(o => o.kind === 'door');
    const corners = [[room.x, room.y], [room.x + room.w, room.y], [room.x, room.y + room.d], [room.x + room.w, room.y + room.d]];
    const dp = ds ? (ds.side === 'N' || ds.side === 'S' ? [ds.t, ds.side === 'N' ? room.y : room.y + room.d] : [ds.side === 'W' ? room.x : room.x + room.w, ds.t]) : [room.x, room.y];
    corners.sort((a, b) => Math.hypot(b[0] - dp[0], b[1] - dp[1]) - Math.hypot(a[0] - dp[0], a[1] - dp[1]));
    const sh = CATALOG.shower; const occ = occupancy(room, floor);
    if (A > 3.2) for (const [cx, cy] of corners) { const x = cx === room.x ? cx + sh.w / 2 : cx - sh.w / 2, y = cy === room.y ? cy + sh.d / 2 : cy - sh.d / 2; const rc = { x: x - sh.w / 2, y: y - sh.d / 2, w: sh.w, d: sh.d }; if (rectFree(rc, occ)) { const it = makeItem('shower', room, { x: r2(x), y: r2(y), rot: cy === room.y ? (cx === room.x ? 0 : 270) : (cx === room.x ? 90 : 180) }); addItem(room, it); break; } }
    tryWalls(room, floor, 'toilet', sides, { align: 'end' });
    tryWalls(room, floor, 'wash_basin', sides.slice().reverse(), { align: 'start' });
  } else if (t === 'balcony') {
    const s = sides[0]; const a = placeOnWall(room, floor, 'outdoor_chair', s, { align: 'start' }); addItem(room, a);
    if (a) { const r = rightVec(a.rot); placeRel(room, floor, 'side_table_round', a.x + r[0] * 0.65, a.y + r[1] * 0.65, a.rot); placeRel(room, floor, 'outdoor_chair', a.x + r[0] * 1.3, a.y + r[1] * 1.3, a.rot); }
    cornerPlant(room, floor); cornerPlant(room, floor);
    if (!allRooms().some(r => r.furniture.some(i => i.type === 'washing_machine'))) tryWalls(room, floor, 'washing_machine', sides.slice().reverse(), { align: 'end' });
  } else if (t === 'study' || t === 'office') {
    const ws = rot(sideScores(room, floor, { window: true }));
    const d = tryWalls(room, floor, 'desk', ws, { w: t === 'office' && A > 7 ? 1.5 : 1.2 }); if (d) addChairFor(room, floor, d);
    tryWalls(room, floor, 'bookshelf', ws.slice().reverse()); if (A > 8) tryWalls(room, floor, 'storage_cabinet', ws.slice().reverse());
    if (A > 7) { const a = placeFree(room, floor, 'armchair', { near: [room.x + room.w - 0.6, room.y + room.d - 0.6] }); addItem(room, a); }
    cornerPlant(room, floor);
  } else if (t === 'gaming') {
    const ws = rot(sideScores(room, floor, { window: false }));
    const d = tryWalls(room, floor, 'gaming_desk', ws); if (d) addChairFor(room, floor, d, 'gaming_chair');
    const bb = placeFree(room, floor, 'beanbag', { near: [room.x + room.w - 0.6, room.y + room.d - 0.6] }); addItem(room, bb);
    if (A > 10) { tryWalls(room, floor, 'tv_unit', ws.slice(1)); }
    tryWalls(room, floor, 'bookshelf', ws.slice().reverse());
    if (A > 8) { const r = placeFree(room, floor, 'rug'); if (r) { r.w = 1.6; r.d = 1.2; addItem(room, r); } }
  } else if (t === 'reading') {
    const ws = rot(sideScores(room, floor, { window: true }));
    const a = placeOnWall(room, floor, 'armchair', ws[0], { align: 'start', gap: 0.15 }) || placeFree(room, floor, 'armchair'); addItem(room, a);
    if (a) { const r = rightVec(a.rot); placeRel(room, floor, 'floor_lamp', a.x + r[0] * 0.65, a.y + r[1] * 0.65, a.rot); placeRel(room, floor, 'side_table', a.x - r[0] * 0.65, a.y - r[1] * 0.65, a.rot); }
    tryWalls(room, floor, 'bookshelf', ws.slice(1)); tryWalls(room, floor, 'bookshelf', ws.slice(1));
    if (A > 6) rugUnder(room, floor, a || { x: room.x + room.w / 2, y: room.y + room.d / 2, rot: 0 }, 1.6, 1.2, 0.5);
    cornerPlant(room, floor);
  } else if (t === 'closet') {
    sides.forEach(s => { const [lo, hi] = sideSpan(room, s); const w = Math.min(2.4, r2(hi - lo - 0.2)); if (w >= 0.9) addItem(room, placeOnWall(room, floor, 'closet_rack', s, { w, align: 'center' })); });
    if (room.furniture.length < 2) tryWalls(room, floor, 'storage_cabinet', sides);
    if (A > 5) tryWalls(room, floor, 'dresser', sides);
  } else if (t === 'nursery') {
    tryWalls(room, floor, 'crib', sides); tryWalls(room, floor, 'dresser', sides.slice().reverse()); tryWalls(room, floor, 'armchair', sides.slice(1));
    const r = placeFree(room, floor, 'rug'); if (r) { r.w = 1.6; r.d = 1.2; addItem(room, r); } cornerPlant(room, floor);
  } else if (t === 'gym') {
    tryWalls(room, floor, 'treadmill', sides); const r = placeFree(room, floor, 'rug'); if (r) { r.w = 1.8; r.d = 0.9; r.color = '#3a3a3a'; addItem(room, r); }
    tryWalls(room, floor, 'storage_cabinet', sides.slice().reverse()); cornerPlant(room, floor);
  } else if (t === 'pooja') {
    tryWalls(room, floor, 'pooja_unit', sides); cornerPlant(room, floor);
  } else if (t === 'utility') {
    tryWalls(room, floor, 'washing_machine', sides, { align: 'start' }); tryWalls(room, floor, 'storage_cabinet', sides.slice(1));
  } else if (t === 'hall') {
    if (Math.min(room.w, room.d) > 1.3) tryWalls(room, floor, 'shoe_rack', sides); cornerPlant(room, floor);
  }
  room.furniture.forEach(i => { i.tier = room.tier || i.tier; });
  return room.furniture;
}
function furnishAll() { S.project.floors.forEach(f => f.rooms.forEach(r => autoFurnish(r, f))); }

/* ---------- cost model ---------- */
function roomCost(room, floor = floorOfRoom(room)) {
  const H = floor.height, ops = roomOpenings(room, floor), tier = room.tier || 'standard', ti = TIER_IX[tier];
  const openA = ops.reduce((s, o) => s + (o.kind === 'door' ? o.w * DOOR_H : o.w * o.ref.h), 0);
  const wallA = isYard(room) ? 0 : Math.max(0, 2 * (room.w + room.d) * H - openA);
  const paint = wallA * SQFT * PAINT[tier].rate;
  const fk = roomFloorKey(room), flooring = room.floorKeep ? 0 : area(room) * SQFT * FLOORS[fk].rate;
  let furniture = 0, decor = 0; const items = [];
  room.furniture.forEach(it => { const c = CATALOG[it.type]; const p = c.price[TIER_IX[it.tier || tier]] * (c.perW ? it.w / c.w : 1); items.push({ it, p }); if (c.decor) decor += p; else furniture += p; });
  const nWin = ops.filter(o => o.kind === 'window').length;
  const curtains = room.curtains && !['bathroom', 'kitchen', 'utility'].includes(room.type) ? nWin * [3500, 7500, 16000][ti] : 0;
  decor += curtains;
  const L = room.lights || {}; const mult = [0.8, 1, 1.7][ti];
  const lighting = ((L.ambient ? area(room) * LIGHT_COST.ambient : 0) + (L.task ? LIGHT_COST.task : 0) + (L.accent ? LIGHT_COST.accent : 0)) * mult;
  const ck = roomCeiling(room), ceiling = area(room) * SQFT * CEILINGS[ck].rate;
  const total = paint + flooring + furniture + decor + lighting + ceiling;
  return { paint, flooring, furniture, decor, lighting, ceiling, total, items, curtains,
    explain: {
      paint: `${r2(wallA)} m² wall (${Math.round(wallA * SQFT)} sq ft, openings deducted) × ₹${PAINT[tier].rate}/sq ft · ${PAINT[tier].label}`,
      flooring: room.floorKeep ? 'Keeping the existing flooring (no new flooring cost)' : `${r2(area(room))} m² (${Math.round(area(room) * SQFT)} sq ft) × ₹${FLOORS[fk].rate}/sq ft · ${FLOORS[fk].label}`,
      furniture: items.filter(x => !CATALOG[x.it.type].decor).map(x => `${CATALOG[x.it.type].label} (${x.it.tier || tier}) ${inr(x.p)}`).join(' · ') || 'No furniture',
      decor: (items.filter(x => CATALOG[x.it.type].decor).map(x => `${CATALOG[x.it.type].label} ${inr(x.p)}`).concat(curtains ? [`Curtains ×${nWin} ${inr(curtains)}`] : [])).join(' · ') || '—',
      lighting: [L.ambient ? `Ambient LED ${inr(area(room) * LIGHT_COST.ambient * mult)}` : null, L.task ? `Task lights ${inr(LIGHT_COST.task * mult)}` : null, L.accent ? `Accent lights ${inr(LIGHT_COST.accent * mult)}` : null].filter(Boolean).join(' · ') || 'None',
      ceiling: CEILINGS[ck].rate ? `${Math.round(area(room) * SQFT)} sq ft × ₹${CEILINGS[ck].rate} · ${CEILINGS[ck].label}` : 'Plain ceiling (no false ceiling)',
    } };
}
function homeCost() { const rooms = allRooms().map(r => ({ r, c: roomCost(r) })); const sum = k => rooms.reduce((s, x) => s + x.c[k], 0); return { rooms, paint: sum('paint'), flooring: sum('flooring'), furniture: sum('furniture'), decor: sum('decor'), lighting: sum('lighting'), ceiling: sum('ceiling'), total: sum('total') }; }
function cheaperAlternatives(room) {
  const out = [], c = roomCost(room), tier = room.tier || 'standard';
  const fk = roomFloorKey(room), alt = FLOOR_CHEAPER[fk];
  if (alt && !room.floorKeep) out.push({ what: `Flooring: ${FLOORS[fk].label} → ${FLOORS[alt].label}`, save: area(room) * SQFT * (FLOORS[fk].rate - FLOORS[alt].rate), apply: () => { room.floor = alt; } });
  if (tier !== 'budget') { const lower = TIERS[TIER_IX[tier] - 1]; out.push({ what: `Paint: ${PAINT[tier].label} → ${PAINT[lower].label}`, save: c.paint * (1 - PAINT[lower].rate / PAINT[tier].rate), apply: () => { room.tier = lower; } }); }
  c.items.filter(x => (x.it.tier || tier) !== 'budget').sort((a, b) => b.p - a.p).slice(0, 4).forEach(x => { const lower = TIERS[TIER_IX[x.it.tier || tier] - 1]; const cc = CATALOG[x.it.type]; const np = cc.price[TIER_IX[lower]] * (cc.perW ? x.it.w / cc.w : 1); out.push({ what: `${CATALOG[x.it.type].label}: ${x.it.tier || tier} → ${lower}`, save: x.p - np, apply: () => { x.it.tier = lower; } }); });
  const ck = roomCeiling(room); if (CEILINGS[ck].rate > 95) out.push({ what: `Ceiling: ${CEILINGS[ck].label} → Peripheral false ceiling`, save: c.ceiling - area(room) * SQFT * 95, apply: () => { room.ceiling = 'peripheral'; } });
  if (room.lights?.accent) out.push({ what: 'Skip accent lighting', save: LIGHT_COST.accent * [0.8, 1, 1.7][TIER_IX[tier]], apply: () => { room.lights.accent = false; } });
  return out.filter(o => o.save > 50).sort((a, b) => b.save - a.save);
}
const ESSENTIAL = new Set(['bed_double', 'bed_single', 'bunk_bed', 'wardrobe', 'sofa_3', 'sofa_l', 'kitchen_counter', 'fridge', 'dining_set', 'dining_4', 'toilet', 'wash_basin', 'shower', 'desk', 'office_chair', 'gaming_desk', 'gaming_chair', 'crib', 'treadmill', 'pooja_unit', 'closet_rack', 'washing_machine', 'tv_unit']);
function deeperCuts(room) {
  const out = [], c = roomCost(room);
  c.items.filter(x => !ESSENTIAL.has(x.it.type)).forEach(x => out.push({ what: `Skip ${CATALOG[x.it.type].label.toLowerCase()} for now`, save: x.p, apply: () => { room.furniture.splice(room.furniture.indexOf(x.it), 1); } }));
  if (!room.floorKeep && c.flooring > 0) out.push({ what: 'Keep the existing flooring', save: c.flooring, apply: () => { room.floorKeep = true; } });
  room.furniture.filter(i => CATALOG[i.type].perW && i.w > 1.25).forEach(i => { const cc = CATALOG[i.type]; const p = cc.price[TIER_IX[i.tier]]; out.push({ what: `Smaller ${cc.label.toLowerCase()} (${i.w} → 1.2 m)`, save: p * (i.w - 1.2) / cc.w, apply: () => { i.w = 1.2; } }); });
  if (c.curtains) out.push({ what: 'Postpone curtains', save: c.curtains, apply: () => { room.curtains = false; } });
  if (room.lights?.task) out.push({ what: 'Skip task lighting', save: LIGHT_COST.task * [0.8, 1, 1.7][TIER_IX[room.tier || 'standard']], apply: () => { room.lights.task = false; } });
  if (roomCeiling(room) !== 'flat') out.push({ what: 'No false ceiling', save: c.ceiling, apply: () => { room.ceiling = 'flat'; } });
  return out.filter(o => o.save > 50);
}
function optimizeBudget(rooms, amount) {
  const steps = []; const cost = () => rooms.reduce((s, r) => s + roomCost(r).total, 0);
  const start = cost(); let guard = 0;
  while (cost() > amount && guard++ < 120) {
    const gap = cost() - amount;
    let alts = rooms.flatMap(r => cheaperAlternatives(r).map(a => Object.assign(a, { room: r })));
    if (!alts.length) alts = rooms.flatMap(r => deeperCuts(r).map(a => Object.assign(a, { room: r })));
    if (!alts.length) break;
    // prefer the smallest single change that closes the gap, else the biggest saving
    const closing = alts.filter(a => a.save >= gap).sort((a, b) => a.save - b.save);
    const a = closing[0] || alts.sort((x, y) => y.save - x.save)[0];
    a.apply(); steps.push(`${a.room.name}: ${a.what} (saves ${inr(a.save)})`);
  }
  return { start, end: cost(), steps, ok: cost() <= amount };
}

/* ---------- space analyzer ---------- */
const CLEAR_REQ = { bed_double: 0.6, bed_single: 0.6, bunk_bed: 0.6, wardrobe: 0.75, desk: 0.75, dresser: 0.7, kitchen_counter: 1.0, fridge: 0.9, toilet: 0.55, wash_basin: 0.7, bookshelf: 0.6, storage_cabinet: 0.7, closet_rack: 0.75, tv_unit: 1.5, sofa_3: 0.35, sofa_l: 0.35, gaming_desk: 0.75, shoe_rack: 0.6, washing_machine: 0.7, treadmill: 0.6 };
function analyzeSpace(room, floor = floorOfRoom(room)) {
  const cs = 0.1, nx = Math.max(1, Math.round(room.w / cs)), ny = Math.max(1, Math.round(room.d / cs));
  const g = new Uint8Array(nx * ny); const cellRect = (i, j) => ({ x: room.x + i * cs, y: room.y + j * cs, w: cs, d: cs });
  const mark = (rc, v) => { const i0 = Math.max(0, Math.floor((rc.x - room.x) / cs)), i1 = Math.min(nx, Math.ceil((rc.x + rc.w - room.x) / cs)), j0 = Math.max(0, Math.floor((rc.y - room.y) / cs)), j1 = Math.min(ny, Math.ceil((rc.y + rc.d - room.y) / cs)); for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (!g[j * nx + i] || v === 1) g[j * nx + i] = v; };
  const solid = room.furniture.filter(it => !CATALOG[it.type]?.flat);
  solid.forEach(it => mark(itemFootprint(it), 1));
  const doors = roomOpenings(room, floor).filter(o => o.kind === 'door');
  doors.forEach(o => mark(doorSwingRect(room, o), 2));
  const fpArea = solid.reduce((s, it) => s + Math.min(area(room), it.w * it.d), 0);
  const coverage = fpArea / area(room);
  // clearance per item
  const issues = [], clear = [];
  solid.forEach(it => {
    const req = CLEAR_REQ[it.type]; if (!req) return;
    const f = frontVec(it.rot); const r = rightVec(it.rot); let dist = 0, blocked = null;
    for (let s = 0.05; s < 3; s += 0.05) {
      const pts = [-0.35, 0, 0.35].map(k => [it.x + f[0] * (it.d / 2 + s) + r[0] * k * it.w, it.y + f[1] * (it.d / 2 + s) + r[1] * k * it.w]);
      if (pts.some(p => !inRoom(room, p[0], p[1], -0.01))) { blocked = 'wall'; break; }
      const hit = solid.find(o => o !== it && !(it.type.includes('desk') && /chair/.test(o.type)) && pts.some(p => { const fp = itemFootprint(o); return p[0] > fp.x && p[0] < fp.x + fp.w && p[1] > fp.y && p[1] < fp.y + fp.d; }));
      if (hit) { blocked = CATALOG[hit.type].label; break; }
      dist = s;
    }
    clear.push({ it, dist: r2(dist), req, ok: dist + 0.001 >= req, blocked });
    if (dist + 0.001 < req) issues.push(`${CATALOG[it.type].label} has only ${dist.toFixed(2)} m in front (needs ${req} m${blocked ? ', blocked by ' + blocked.toLowerCase() : ''}).`);
  });
  // door swing conflicts
  doors.forEach(o => { const sw = doorSwingRect(room, o); solid.forEach(it => { if (rectOverlap(sw, itemFootprint(it)) > 0.02) issues.push(`${CATALOG[it.type].label} blocks the door swing.`); }); });
  // overlapping furniture
  for (let a = 0; a < solid.length; a++) for (let b = a + 1; b < solid.length; b++) { const A = solid[a], Bq = solid[b]; if (/chair/.test(A.type + Bq.type) && /desk|dining/.test(A.type + Bq.type)) continue; if (rectOverlap(itemFootprint(A), itemFootprint(Bq)) > 0.03) issues.push(`${CATALOG[A.type].label} overlaps ${CATALOG[Bq.type].label}.`); }
  solid.forEach(it => { if (!rectInRoom(itemFootprint(it), room, 0.05)) issues.push(`${CATALOG[it.type].label} sticks out of the room.`); });
  // walkable area: free cells with distance >= 0.3 from obstacles/walls
  const dist = new Float32Array(nx * ny).fill(1e9); const q = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (g[k] === 1) { dist[k] = 0; q.push(k); } else if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) { dist[k] = 1; q.push(k); } }
  for (let h = 0; h < q.length; h++) { const k = q[h], i = k % nx, j = (k / nx) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) return; const kk = jj * nx + ii; if (dist[kk] > dist[k] + 1) { dist[kk] = dist[k] + 1; q.push(kk); } }); }
  let free = 0, walk = 0; for (let k = 0; k < g.length; k++) if (g[k] !== 1) { free++; if (dist[k] * cs >= 0.3) walk++; }
  const walkable = free ? walk / g.length : 0;
  // unused corner detection
  const zone = new Uint8Array(nx * ny); for (let k = 0; k < g.length; k++) zone[k] = g[k] ? 1 : 0;
  solid.forEach(it => { const req = Math.min(0.7, CLEAR_REQ[it.type] || 0.5); const f = frontVec(it.rot), fp = itemFootprint(it); const ex = { x: fp.x + Math.min(0, f[0]) * req, y: fp.y + Math.min(0, f[1]) * req, w: fp.w + Math.abs(f[0]) * req, d: fp.d + Math.abs(f[1]) * req }; const i0 = Math.max(0, Math.floor((ex.x - room.x) / cs)), i1 = Math.min(nx, Math.ceil((ex.x + ex.w - room.x) / cs)), j0 = Math.max(0, Math.floor((ex.y - room.y) / cs)), j1 = Math.min(ny, Math.ceil((ex.y + ex.d - room.y) / cs)); for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) zone[j * nx + i] = 1; });
  const freeRect = (i0, j0, w, h) => { if (i0 < 0 || j0 < 0 || i0 + w > nx || j0 + h > ny) return false; for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) if (zone[j * nx + i]) return false; return true; };
  let corner = null;
  if (!['bathroom', 'hall', 'utility', 'kitchen'].includes(room.type) && area(room) > 5) {
    [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      for (let w = 8; w <= Math.min(22, nx); w++) for (let h = 8; h <= Math.min(22, ny); h++) {
        const i0 = cx ? nx - w : 0, j0 = cy ? ny - h : 0;
        if (freeRect(i0, j0, w, h)) { const a = w * h * cs * cs; if (!corner || a > corner.area) corner = { x: room.x + i0 * cs, y: room.y + j0 * cs, w: w * cs, d: h * cs, area: a, cx, cy }; }
      }
    });
    if (corner && corner.area < 1.0) corner = null;
  }
  const type = ROOM_TYPES[room.type]; const minA = type.min;
  const status = room.type === 'bathroom' || room.type === 'kitchen' || room.type === 'closet' ? (coverage > 0.7 ? 'Overcrowded' : 'Balanced') : coverage < 0.16 ? 'Underused' : coverage > 0.52 ? 'Overcrowded' : 'Balanced';
  let score = 100 - issues.length * 10 - (status === 'Overcrowded' ? 15 : status === 'Underused' ? 8 : 0) - (area(room) < minA ? 10 : 0) - (corner ? 5 : 0) - (walkable < 0.25 && room.type !== 'bathroom' ? 8 : 0);
  score = clamp(Math.round(score), 5, 100);
  const sizeNote = area(room) < minA ? `Below the recommended ${minA} m² for a ${type.label.toLowerCase()} — keep furniture compact.` : `Meets the recommended minimum of ${minA} m² for a ${type.label.toLowerCase()}.`;
  const purpose = suggestPurposes(room);
  return { coverage, walkable, issues: [...new Set(issues)], clear, corner, status, score, sizeNote, purpose, grid: { nx, ny, cs, g, zone } };
}
function suggestPurposes(room) {
  const A = area(room);
  if (A < 3) return ['pooja', 'closet', 'utility'];
  if (A < 6.5) return ['closet', 'reading', 'study', 'pooja'];
  if (A < 9.5) return ['study', 'office', 'nursery', 'reading'];
  return ['guest', 'office', 'gaming', 'gym'];
}
function storageReport() {
  const have = allRooms().reduce((s, r) => s + r.furniture.reduce((a, it) => a + (CATALOG[it.type].storage || 0) * (it.w / CATALOG[it.type].w), 0), 0);
  const need = S.prefs.family * 0.9 + ({ low: 0, medium: 0.8, high: 2 }[S.prefs.storage] || 0.8) + (S.prefs.kids ? 1 : 0);
  const tips = [];
  if (have < need) tips.push(`Add about ${r2(need - have)} m³ of storage: loft cabinets above wardrobes, hydraulic storage beds, or a ceiling-high shoe cabinet near the entrance.`);
  else tips.push('Storage capacity matches your household. Use loft space for seasonal items.');
  if (S.prefs.kids) tips.push('Use low open shelves in kids’ rooms so toys are reachable.');
  return { have: r2(have), need: r2(need), tips };
}
function fitCheck(type, room, floor = floorOfRoom(room), dims) {
  const c = CATALOG[type]; const w = dims?.w || c.w, d = dims?.d || c.d;
  const save = room.furniture.slice();
  let it = null;
  for (const s of SIDES) { it = placeOnWall(room, floor, type, s, { w, d }); if (it) break; }
  if (!it) { it = placeFree(room, floor, type); if (it) { it.w = w; it.d = d; } }
  room.furniture = save;
  if (!it) return { ok: false, msg: `${c.label} (${w}×${d} m) does not fit in ${room.name} with current furniture and door clearances.` };
  const longest = Math.max(room.w, room.d);
  return { ok: true, item: it, msg: `${c.label} (${w}×${d} m) fits in ${room.name}. Best spot: against the ${['north', 'east', 'south', 'west'][[0, 270, 180, 90].indexOf(it.rot)] || 'centre'} wall, keeping ${CLEAR_REQ[type] || 0.6} m clearance.${w > longest ? ' (diagonal fit only)' : ''}` };
}

/* ---------- light & ventilation ---------- */
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function sideCompass(side) { const ang = { N: 0, E: 90, S: 180, W: 270 }[side]; const a = ((ang + (S.project.north || 0)) % 360 + 360) % 360; return { deg: a, label: COMPASS[Math.round(a / 45) % 8] }; }
function sunAz(hour) { return 90 + (hour - 6) * 15; } // 6h → E(90) 12h → S(180) 18h → W(270)
function analyzeLight(room, floor = floorOfRoom(room)) {
  const ops = roomOpenings(room, floor); const wins = ops.filter(o => o.kind === 'window' && o.ext);
  const winA = wins.reduce((s, o) => s + o.w * o.ref.h, 0); const wfr = winA / area(room);
  const rating = wfr >= 0.15 ? 'Excellent' : wfr >= 0.1 ? 'Good' : wfr >= 0.05 ? 'Limited' : wfr > 0 ? 'Poor' : 'No daylight';
  const dirs = [...new Set(wins.map(o => sideCompass(o.side).label))];
  const notes = [];
  dirs.forEach(d => {
    if (d.includes('E')) notes.push(`${d}-facing window: soft morning sun — good for waking up and breakfast spaces.`);
    if (d.includes('W')) notes.push(`${d}-facing window: harsh afternoon sun and heat — use blackout or thermal curtains and cooler wall colours.`);
    if (d === 'S' || d === 'SE' || d === 'SW') notes.push(`${d}-facing: bright, strong light for most of the day (India); add a chajja/overhang or sheers to cut glare.`);
    if (d === 'N' || d === 'NE' || d === 'NW') notes.push(`${d}-facing: steady, diffused daylight — ideal for a study or studio, little heat gain.`);
  });
  const sides = [...new Set(wins.map(o => o.side))];
  const opposite = sides.some(s => sides.includes(OPP[s]));
  const ventDoorExt = ops.some(o => o.kind === 'door' && isExteriorPoint(floor, o.ref.o, o.ref.o === 'h' ? o.ref.y : o.ref.x, o.ref.o === 'h' ? o.ref.x : o.ref.y));
  const vent = opposite ? 'Excellent cross-ventilation' : sides.length >= 2 ? 'Good (adjacent walls)' : (sides.length === 1 && (ops.some(o => o.kind === 'door') || ventDoorExt)) ? 'Fair (single-sided)' : 'Poor';
  const sugg = [];
  if (['bathroom', 'kitchen', 'utility'].includes(room.type) && !wins.length) sugg.push('No exterior window — install an exhaust fan or duct to vent moisture and cooking fumes.');
  if (room.type === 'kitchen' && wins.length) sugg.push('Place the hob near the window and add a chimney for smoke extraction.');
  if (vent === 'Poor' || vent.startsWith('Fair')) sugg.push('Keep internal doors open or add a ventilator above the door to improve airflow.');
  if (rating === 'Limited' || rating === 'Poor' || rating === 'No daylight') sugg.push('Use light, reflective wall colours and mirrors opposite windows to bounce daylight deeper.');
  // window suggestion
  let suggestWindow = null;
  if (['Limited', 'Poor', 'No daylight'].includes(rating) || (!opposite && sides.length < 2 && !['bathroom', 'hall', 'closet', 'utility'].includes(room.type))) {
    const cand = [['h', room.y, room.x, room.x + room.w, 'N'], ['h', room.y + room.d, room.x, room.x + room.w, 'S'], ['v', room.x, room.y, room.y + room.d, 'W'], ['v', room.x + room.w, room.y, room.y + room.d, 'E']]
      .filter(([o, c, a, b, s]) => b - a >= 1.3 && !sides.includes(s) && isExteriorPoint(floor, o, c, (a + b) / 2) && !ops.some(op => op.side === s && op.kind === 'door' && Math.abs(op.t - (a + b) / 2) < 1))
      .sort((p, q) => (sides.includes(OPP[q[4]]) ? 1 : 0) - (sides.includes(OPP[p[4]]) ? 1 : 0));
    if (cand.length) { const [o, c, a, b, s] = cand[0]; const t = (a + b) / 2; suggestWindow = { side: s, compass: sideCompass(s).label, w: { o, x: o === 'h' ? t : c, y: o === 'h' ? c : t, w: r2(Math.min(1.5, b - a - 0.6)), sill: room.type === 'bathroom' ? 1.5 : 0.9, h: room.type === 'bathroom' ? 0.6 : 1.25 } }; sugg.push(`Add a window on the ${suggestWindow.compass} wall for ${sides.includes(OPP[s]) ? 'cross-ventilation' : 'more daylight'}.`); }
  }
  const score = clamp(Math.round((Math.min(wfr, 0.2) / 0.2) * 70 + (opposite ? 30 : sides.length >= 2 ? 22 : sides.length ? 10 : 0)), 0, 100);
  return { wins, winA: r2(winA), wfr, rating, dirs, notes, vent, sugg, suggestWindow, score };
}
function lightAt(floor, x, y, hour) {
  const room = roomAt(x, y, floor); if (!room) return 0;
  const az = sunAz(hour); const up = hour > 6 && hour < 18.5;
  let I = 0.05;
  roomOpenings(room, floor).filter(o => o.kind === 'window' && o.ext).forEach(o => {
    const wp = o.side === 'N' || o.side === 'S' ? [o.t, o.side === 'N' ? room.y : room.y + room.d] : [o.side === 'W' ? room.x : room.x + room.w, o.t];
    const d = Math.hypot(x - wp[0], y - wp[1]);
    const sd = sideCompass(o.side).deg; let diff = Math.abs(((az - sd) % 360 + 540) % 360 - 180);
    const sunF = up ? (diff < 90 ? 0.6 + 0.9 * Math.cos(diff * Math.PI / 180) : 0.55) : 0.1;
    I += (o.w * o.ref.h) * sunF / (1 + d * d * 0.55);
  });
  return Math.min(1, I / 1.6);
}

/* ---------- architecture checks ---------- */
function archChecks(floor = FL()) {
  const out = [], R = floor.rooms;
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const o = rectOverlap(R[i], R[j]); if (o > 0.05) out.push({ lv: 'warn', t: 'Overlapping rooms', d: `${R[i].name} and ${R[j].name} overlap by ${r2(o)} m².`, fix: 'snap' }); }
  let mis = 0; for (let i = 0; i < R.length; i++) for (let j = 0; j < R.length; j++) { if (i === j) continue; const a = R[i], b = R[j]; const gx = b.x - (a.x + a.w), gy = b.y - (a.y + a.d); const oy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y), ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x); if ((gx > 0.03 && gx < 0.3 && oy > 0.5) || (gy > 0.03 && gy < 0.3 && ox > 0.5)) mis++; }
  if (mis) out.push({ lv: 'warn', t: 'Misaligned walls', d: `${mis} wall pair(s) have small gaps (3–30 cm) — likely detection noise or drafting errors.`, fix: 'snap' });
  const con = connectivity(floor);
  con.unreachable.filter(r => !isYard(r) && r.type !== 'garage').forEach(r => out.push({ lv: 'warn', t: 'Unreachable room', d: `${r.name} has no door connecting it to the rest of the home.`, fix: 'doors' }));
  const bedT = ['bedroom', 'master', 'guest'];
  if (con.start) R.forEach(r => {
    if (bedT.includes(r.type) || ['bathroom', 'balcony', 'closet', 'study', 'parking', 'garden'].includes(r.type) || con.unreachable.includes(r)) return;
    const seen = new Set([con.start.id]), q = [con.start.id]; while (q.length) { const id = q.shift(); const rr = findRoom(id); if (rr !== con.start && bedT.includes(rr.type)) continue; (con.adj.get(id) || []).forEach(n => { if (!seen.has(n)) { seen.add(n); q.push(n); } }); }
    if (!seen.has(r.id)) out.push({ lv: 'warn', t: 'Circulation through a bedroom', d: `${r.name} can only be reached by walking through a bedroom — consider a passage door.` });
  });
  R.forEach(r => roomOpenings(r, floor).filter(o => o.kind === 'door').forEach(o => { const sw = doorSwingRect(r, o); r.furniture.filter(it => !CATALOG[it.type].flat).forEach(it => { if (rectOverlap(sw, itemFootprint(it)) > 0.02) out.push({ lv: 'warn', t: 'Door clearance', d: `In ${r.name}, the ${CATALOG[it.type].label.toLowerCase()} blocks the ${o.w} m door swing.` }); }); }));
  floor.doors.forEach(d => { if (d.main && d.w < 0.95) out.push({ lv: 'info', t: 'Narrow main door', d: `Main door is ${d.w} m; 1.0 m+ is recommended for moving furniture.` }); });
  R.forEach(r => { const m = Math.min(r.w, r.d); if (['bedroom', 'master', 'living', 'guest'].includes(r.type) && (area(r) < 9.5 || m < 2.4)) out.push({ lv: 'info', t: 'Habitable room size', d: `${r.name} is ${r2(area(r))} m² (min side ${r2(m)} m). Many Indian building bye-laws expect ≥ 9.5 m² with a 2.4 m minimum width for habitable rooms.` }); });
  R.forEach(r => { if (r.type === 'kitchen' && area(r) < 5) out.push({ lv: 'info', t: 'Kitchen size', d: `${r.name} is under the commonly required 5 m².` }); if (r.type === 'bathroom' && area(r) < 1.8) out.push({ lv: 'info', t: 'Bathroom size', d: `${r.name} is under 1.8 m².` }); });
  const wt = S.project.wallThickness; out.push({ lv: 'info', t: 'Wall thickness estimate', d: wt ? `Detected ≈ ${wt.ext} m on outer walls (${wt.ext >= 0.2 ? '9-inch brick, likely load-bearing' : '4.5-inch / block'}) and ≈ ${wt.int} m on partitions, from the plan's scale.` : 'No scale data from the plan; DIMORA assumes 230 mm external and 115 mm internal walls.' });
  S.structuralLog.slice(-4).forEach(s => out.push({ lv: 'warn', t: 'Structural review', d: s }));
  if (S.project.floors.length > 1) {
    const pj = S.project, missing = pj.floors.filter(f => floorAbove(f) && !(f.stairs && f.stairs.length));
    out.push({ lv: missing.length ? 'warn' : 'ok', t: 'Multi-storey', d: `${pj.floors.length} floors (${pj.floors.map(f => f.name).join(', ')}). ${missing.length ? 'No staircase going up from ' + missing.map(f => f.name).join(', ') + ' yet.' : 'Every floor is connected by a staircase.'}` });
    if (floorAbove(floor)) (floor.stairs || []).forEach(st => { const w = stairWidth(st), L = stairLen(st), ff = floor.height + 0.25, n = stairRisers(floor), rise = ff / n, tread = L / n; const steep = rise > 0.19 || tread < 0.25;
      out.push({ lv: w < 0.9 ? 'warn' : 'ok', t: 'Stair width', d: `The flight up to the ${floorAbove(floor).name} is ${w} m wide${w < 0.9 ? ' — narrower than the 0.9–1.0 m usually expected in homes' : ''}.` });
      out.push({ lv: steep ? 'info' : 'ok', t: 'Stair steepness', d: `${n} risers of ${Math.round(rise * 1000)} mm on ${Math.round(tread * 1000)} mm treads over a ${r2(L)} m run${steep ? '. That is steep for a straight flight (about 190 mm risers and 250 mm treads are typical comfort limits); a dog-leg stair or a longer run would be easier to climb' : ''}.` }); });
    if (floorBelow(floor) && !stairsBelow(floor).length) out.push({ lv: 'warn', t: 'No stair arrival', d: `Nothing connects the ${floor.name} to the floor below.` });
  }
  if (!out.some(o => o.lv === 'warn')) out.unshift({ lv: 'ok', t: 'Layout validated', d: 'No overlapping rooms, unreachable spaces or blocked doors found.' });
  return out;
}

/* ---------- AI interior designer helpers ---------- */
function mixHex(a, b, t) { const A = hexToRgb(a), Bc = hexToRgb(b); return rgbToHex(A[0] + (Bc[0] - A[0]) * t, A[1] + (Bc[1] - A[1]) * t, A[2] + (Bc[2] - A[2]) * t); }
function paintSuggestions(room) {
  const L = analyzeLight(room); const hot = L.dirs.some(d => d.includes('W') || d === 'S' || d === 'SW'); const dim = ['Limited', 'Poor', 'No daylight'].includes(L.rating);
  const base = {
    bedroom: [['Sage Mist', '#b9c7ae', 'Calming green lowers visual noise before sleep'], ['Powder Blue', '#c5d6e3', 'Cool and restful'], ['Greige', '#d2c9bb', 'Warm neutral that suits any bedding'], ['Lavender Haze', '#d4cbe2', 'Soft and relaxing']],
    living: [['Warm Linen', '#e9dfcc', 'Versatile neutral that flatters wood and fabrics'], ['Terracotta Blush', '#e2b9a2', 'Earthy warmth for gatherings'], ['Stone Grey', '#cfccc5', 'Modern backdrop for art'], ['Olive Accent', '#a9ad86', 'Great as a single feature wall']],
    kitchen: [['Butter Cream', '#f1e3bd', 'Cheerful and hides stains'], ['Mint Fresh', '#cfe5d6', 'Clean, hygienic feel'], ['Soft White', '#f2efe8', 'Maximises brightness'], ['Mustard Pop', '#e1bf6a', 'Energetic accent for a backsplash wall']],
    bathroom: [['Aqua Spa', '#cfe6e6', 'Spa-like and fresh'], ['Bright White', '#f5f5f2', 'Crisp and clean'], ['Pebble Grey', '#d3d3cf', 'Hides water marks'], ['Sea Glass', '#b9d6cf', 'Calm, watery tone']],
  };
  const fam = { master: 'bedroom', guest: 'bedroom', nursery: 'bedroom', dining: 'living', hall: 'living', study: 'study', office: 'study', reading: 'study', utility: 'bathroom', balcony: 'living', closet: 'bedroom', gym: 'study', pooja: 'living' };
  base.study = [['Focus Blue', '#b8c9da', 'Blue tones support concentration'], ['Sage Study', '#c3cfb5', 'Easy on the eyes for long hours'], ['Chalk White', '#f1efea', 'Maximum brightness on screens'], ['Deep Teal', '#4f7f80', 'Bold feature wall behind the desk']];
  base.gaming = [['Midnight Navy', '#2f3d5a', 'Reduces screen glare and makes RGB pop'], ['Charcoal', '#4a4b4f', 'Immersive, cinema-like'], ['Deep Plum', '#5a3d5c', 'Moody and dramatic'], ['Slate', '#6e7a86', 'Softer dark option']];
  let list = (base[room.type] || base[fam[room.type]] || base.living).map(([n, h, w]) => ({ name: n, hex: h, why: w }));
  if (hot) list.sort((a, b) => coolness(b.hex) - coolness(a.hex)), list[0].why += ' — cool tone offsets hot afternoon/south sun';
  if (dim) list = list.map(s => ({ ...s, hex: mixHex(s.hex, '#ffffff', 0.25) })), list[0].why += ' — lightened because this room gets limited daylight';
  (S.prefs.colors || []).slice(0, 1).forEach(c => list.splice(1, 0, { name: 'Your favourite (wall-ready)', hex: mixHex(c, '#f5f2ec', 0.55), why: 'Your preferred colour softened for full-wall use' }));
  return list.slice(0, 4);
}
function coolness(h) { const [r, g, b] = hexToRgb(h); return b - r; }
function lightingAdvice(room) {
  const t = room.type; const A = area(room);
  const ambient = `${Math.max(2, Math.round(A / 2.5))} × 12W LED panels/downlights (≈${Math.round(A * 150)} lumens for ${r2(A)} m²)`;
  const task = { kitchen: 'Under-cabinet LED strips over the counter', study: 'Adjustable desk lamp (4000K)', office: 'Adjustable desk lamp + bias light behind monitor', bedroom: 'Bedside reading lamps', master: 'Bedside reading lamps + wardrobe sensor lights', living: 'Floor lamp beside the sofa for reading', bathroom: 'Mirror light above the basin', dining: 'Pendant over the dining table', gaming: 'RGB bias lighting behind the setup', reading: 'Floor lamp angled over the armchair' }[t] || 'Wall-mounted task light';
  const accent = { living: 'Cove LEDs + spotlights on art', master: 'Warm cove light in the false ceiling', dining: 'Statement pendant / chandelier', pooja: 'Warm backlight behind the mandir', gaming: 'RGB strips along shelves', bathroom: 'Niche lighting in shower' }[t] || 'Warm 2700K accent strip';
  return { ambient, task, accent, temp: ['kitchen', 'study', 'office', 'bathroom'].includes(t) ? '4000K neutral white' : '2700–3000K warm white' };
}
function ceilingAdvice(room, floor = floorOfRoom(room)) {
  const A = area(room), H = floor.height;
  if (['bathroom', 'utility', 'balcony', 'hall'].includes(room.type)) return { type: 'flat', why: 'Keep plain; use moisture-resistant grid/PVC panels if a false ceiling is needed.' };
  if (H < 2.8) return { type: 'peripheral', why: `Ceiling height ${H} m is low — a slim peripheral band preserves headroom.` };
  if (A > 14) return { type: 'tray', why: 'Large room with good height — a tray ceiling adds depth and hides AC ducts.' };
  return { type: 'cove', why: 'Cove lighting gives soft indirect glow without dropping the whole ceiling.' };
}
function decorAdvice(room) {
  const th = roomTheme(room), name = room.theme || P().theme;
  const m = { Japandi: ['Linen curtains in oat', 'Jute or wool flat-weave rug', 'Ceramic vases, bonsai, paper lantern'], Scandinavian: ['Sheer white curtains', 'Geometric wool rug', 'Pothos, sheepskin throw, line art'], Modern: ['Grey blackout curtains', 'Low-pile solid rug', 'Abstract canvas, sculptural lamp'], Minimalist: ['White roller blinds', 'Single neutral rug', 'One statement plant, no clutter'], Industrial: ['Charcoal canvas curtains', 'Distressed vintage rug', 'Edison bulbs, metal frames'], 'Indian Contemporary': ['Mustard silk-blend curtains', 'Dhurrie or kilim rug', 'Brass urli, Madhubani art, diyas'], Luxury: ['Velvet drapes with sheers', 'Hand-tufted silk rug', 'Gold mirror, crystal decor'], Bohemian: ['Printed cotton curtains', 'Layered kilim rugs', 'Macramé, rattan, trailing plants'] }[name] || ['Linen curtains', 'Neutral rug', 'Plants and art'];
  return { curtains: m[0], rug: m[1], decor: m[2], palette: [th.walls[0], th.wood, th.fabric, th.accent] };
}
function applyTheme(name, rooms) {
  if (!THEMES[name]) return false; const th = THEMES[name];
  if (!rooms) { S.project.theme = name; allRooms().forEach(r => { r.theme = null; r.wall = null; r.floor = null; r.ceiling = null; r.furniture.forEach(i => { i.color = null; i.finish = null; }); }); }
  else rooms.forEach(r => { r.theme = name; r.wall = null; r.floor = null; r.ceiling = null; r.furniture.forEach(i => { i.color = null; i.finish = null; }); });
  return true;
}
function transformRoom(room, to) {
  const before = roomCost(room).total; const oldType = room.type;
  if (!ROOM_TYPES[to]) return { before, after: before, kept: [], added: [] }; // unknown type: leave the room untouched
  room.type = to; const keepName = /bed ?room|room \d|empty/i.test(room.name) || ROOM_TYPES[oldType]?.label === room.name;
  if (keepName || true) room.name = ROOM_TYPES[to].label + (allRooms().filter(r => r.type === to && r !== room).length ? ' ' + (allRooms().filter(r => r.type === to).length) : '');
  room.wall = paintSuggestions(room)[0].hex; room.floor = null; room.ceiling = null;
  if (to === 'gym') room.floor = 'carpet';
  autoFurnish(room);
  return { before, after: roomCost(room).total, from: oldType };
}

/* ===================== FLOOR PLAN INPUT & DETECTION ===================== */
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
async function ensurePdfJs() {
  if (window.pdfjsLib) return;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch (e) { }
}
async function fileToImageURL(file) {
  if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
    await ensurePdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1); const vp = page.getViewport({ scale: 2 });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return c.toDataURL('image/png');
  }
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
}
function loadImage(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Image could not be decoded')); i.src = url; }); }

/* Draw a realistic black-line floor plan image of a model (used for the sample plan) */
function drawPlanImage(project, fi = 0) {
  const f = project.floors[fi], ppm = 48, m = 70; const b = homeBounds(f);
  const c = document.createElement('canvas'); c.width = Math.round(b.w * ppm + m * 2); c.height = Math.round(b.d * ppm + m * 2);
  const x = c.getContext('2d'); x.fillStyle = '#fbfaf7'; x.fillRect(0, 0, c.width, c.height);
  const X = v => m + (v - b.x) * ppm, Y = v => m + (v - b.y) * ppm;
  x.fillStyle = '#1b1b1b';
  wallPieces(f).forEach(p => {
    const t = (p.ext ? 0.23 : 0.12) * ppm;
    if (p.kind === 'lintel') return;
    if (p.kind === 'head') return;
    if (p.kind === 'rail') { x.strokeStyle = '#1b1b1b'; x.lineWidth = 1.2; [-t / 4, t / 4].forEach(o => { x.beginPath(); if (p.o === 'h') { x.moveTo(X(p.a), Y(p.c) + o); x.lineTo(X(p.b), Y(p.c) + o); } else { x.moveTo(X(p.c) + o, Y(p.a)); x.lineTo(X(p.c) + o, Y(p.b)); } x.stroke(); }); return; }
    if (p.kind === 'sill') { // window symbol: thin double line
      x.strokeStyle = '#1b1b1b'; x.lineWidth = 1.4;
      [-t / 2, 0, t / 2].forEach(o => { x.beginPath(); if (p.o === 'h') { x.moveTo(X(p.a), Y(p.c) + o); x.lineTo(X(p.b), Y(p.c) + o); } else { x.moveTo(X(p.c) + o, Y(p.a)); x.lineTo(X(p.c) + o, Y(p.b)); } x.stroke(); });
      return;
    }
    if (p.o === 'h') x.fillRect(X(p.a) - t / 2, Y(p.c) - t / 2, (p.b - p.a) * ppm + t, t); else x.fillRect(X(p.c) - t / 2, Y(p.a) - t / 2, t, (p.b - p.a) * ppm + t);
  });
  // doors: arcs
  x.strokeStyle = '#333'; x.lineWidth = 1.2;
  f.doors.forEach(d => {
    const w = d.w * ppm; x.beginPath();
    if (d.o === 'h') { const hx = X(d.x - d.w / 2), hy = Y(d.y); x.moveTo(hx, hy); x.lineTo(hx, hy + w); x.arc(hx, hy, w, Math.PI / 2, 0, true); }
    else { const hx = X(d.x), hy = Y(d.y - d.w / 2); x.moveTo(hx, hy); x.lineTo(hx + w, hy); x.arc(hx, hy, w, 0, Math.PI / 2); }
    x.stroke();
  });
  x.fillStyle = '#222'; x.textAlign = 'center';
  f.rooms.forEach(r => {
    const cx = X(r.x + r.w / 2), cy = Y(r.y + r.d / 2);
    x.font = `600 ${Math.max(9, Math.min(14, r.w * 4))}px Arial`; x.fillText(r.name.toUpperCase(), cx, cy - 3);
    x.font = `${Math.max(8, Math.min(12, r.w * 3.4))}px Arial`; x.fillText(`${r.w.toFixed(1)} x ${r.d.toFixed(1)} m`, cx, cy + 13);
  });
  // staircases: light tread lines (this flight going up, and the flight arriving from below)
  const below = project.floors.filter(o => o.level < f.level).sort((p, q) => q.level - p.level)[0];
  [...(f.stairs || []).map(st => [st, 'UP']), ...((below && below.stairs) || []).map(st => [st, 'DN'])].forEach(([st, tag]) => {
    const ft = { x: st.x - st.w / 2, y: st.y - st.d / 2 }; const runZ = (st.run || 'z') === 'z', L = runZ ? st.d : st.w, n = 14;
    x.strokeStyle = '#c4c4c4'; x.lineWidth = 1; x.strokeRect(X(ft.x), Y(ft.y), st.w * ppm, st.d * ppm);
    for (let i = 1; i < n; i++) { x.beginPath(); if (runZ) { const yy = Y(ft.y + L * i / n); x.moveTo(X(ft.x), yy); x.lineTo(X(ft.x + st.w), yy); } else { const xx = X(ft.x + L * i / n); x.moveTo(xx, Y(ft.y)); x.lineTo(xx, Y(ft.y + st.d)); } x.stroke(); }
    x.fillStyle = '#9a9a9a'; x.font = '600 10px Arial'; x.textAlign = 'center'; x.fillText(tag, X(st.x), Y(st.y) + 4); x.fillStyle = '#222';
  });
  // overall dimension
  x.strokeStyle = '#555'; x.lineWidth = 1; x.beginPath(); x.moveTo(X(b.x), m - 34); x.lineTo(X(b.x + b.w), m - 34); x.stroke();
  [X(b.x), X(b.x + b.w)].forEach(px => { x.beginPath(); x.moveTo(px, m - 42); x.lineTo(px, m - 26); x.stroke(); });
  x.font = '600 13px Arial'; x.fillText(`${b.w.toFixed(2)} m`, (X(b.x) + X(b.x + b.w)) / 2, m - 40);
  x.save(); x.translate(m - 40, (Y(b.y) + Y(b.y + b.d)) / 2); x.rotate(-Math.PI / 2); x.fillText(`${b.d.toFixed(2)} m`, 0, 0); x.restore();
  x.beginPath(); x.moveTo(m - 32, Y(b.y)); x.lineTo(m - 32, Y(b.y + b.d)); x.stroke();
  x.font = '600 12px Arial'; x.textAlign = 'left'; x.fillText('N ↑', c.width - 50, 30);
  return { url: c.toDataURL('image/png'), widthM: b.w };
}

/* -------- classical computer-vision room detection -------- */
function cvDetect(img) {
  const maxD = 760, sc = Math.min(1, maxD / Math.max(img.width, img.height));
  const W = Math.max(8, Math.round(img.width * sc)), H = Math.max(8, Math.round(img.height * sc));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data; const N = W * H; const gray = new Uint8Array(N);
  const hist = new Array(256).fill(0);
  for (let i = 0; i < N; i++) { const v = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) | 0; gray[i] = v; hist[v]++; }
  // Otsu
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = N - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF; const v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; thr = t; } }
  thr = clamp(Math.max(thr, 175), 120, 215);
  const wall = new Uint8Array(N); let dark = 0; for (let i = 0; i < N; i++) if (gray[i] < thr) { wall[i] = 1; dark++; }
  // drop small dark blobs (text, dimension numbers, symbols) so they don't split rooms
  { const seen = new Uint8Array(N), st = new Int32Array(N), lim = Math.max(W, H) * 0.035; const tmp = [];
    for (let s0 = 0; s0 < N; s0++) { if (!wall[s0] || seen[s0]) continue; let sp = 0; st[sp++] = s0; seen[s0] = 1; let x0 = W, y0 = H, x1 = 0, y1 = 0; tmp.length = 0;
      while (sp) { const k = st[--sp]; tmp.push(k); const x = k % W, y = (k / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const kk = yy * W + xx; if (wall[kk] && !seen[kk]) { seen[kk] = 1; st[sp++] = kk; } } }
      if (Math.max(x1 - x0, y1 - y0) < lim) tmp.forEach(k => wall[k] = 0); } }
  // thick-stroke mask (opening) for wall thickness estimate
  const runs = [];
  for (let y = 0; y < H; y += 2) { let run = 0; for (let x = 0; x < W; x++) { if (wall[y * W + x]) run++; else { if (run >= 2 && run < 40) runs.push(run); run = 0; } } }
  runs.sort((a, b) => a - b);
  const thick = runs.filter(r => r >= 3);
  const intPx = thick.length ? thick[Math.floor(thick.length * 0.5)] : 3, extPx = thick.length ? thick[Math.floor(thick.length * 0.9)] : 6;
  // dilate to close door gaps
  const r = Math.max(2, Math.round(Math.max(W, H) * (+S.cvGap || 0.012)));
  const dil = (src) => { const t = new Uint8Array(N), o = new Uint8Array(N);
    for (let y = 0; y < H; y++) { let cnt = 0; for (let x = -r; x < W + r; x++) { if (x + r < W && x + r >= 0 && src[y * W + x + r]) cnt++; if (x - r - 1 >= 0 && x - r - 1 < W && src[y * W + x - r - 1]) cnt--; if (x >= 0 && x < W) t[y * W + x] = cnt > 0 ? 1 : 0; } }
    for (let x = 0; x < W; x++) { let cnt = 0; for (let y = -r; y < H + r; y++) { if (y + r < H && y + r >= 0 && t[(y + r) * W + x]) cnt++; if (y - r - 1 >= 0 && y - r - 1 < H && t[(y - r - 1) * W + x]) cnt--; if (y >= 0 && y < H) o[y * W + x] = cnt > 0 ? 1 : 0; } }
    return o; };
  const closed = dil(wall);
  // label free regions
  const lab = new Int32Array(N).fill(-1); const comps = [];
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (closed[s] || lab[s] !== -1) continue;
    const id = comps.length; let sp = 0; stack[sp++] = s; lab[s] = id;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, cnt = 0, border = false;
    while (sp) { const k = stack[--sp]; const x = k % W, y = (k / W) | 0; cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true;
      if (x > 0 && !closed[k - 1] && lab[k - 1] === -1) { lab[k - 1] = id; stack[sp++] = k - 1; }
      if (x < W - 1 && !closed[k + 1] && lab[k + 1] === -1) { lab[k + 1] = id; stack[sp++] = k + 1; }
      if (y > 0 && !closed[k - W] && lab[k - W] === -1) { lab[k - W] = id; stack[sp++] = k - W; }
      if (y < H - 1 && !closed[k + W] && lab[k + W] === -1) { lab[k + W] = id; stack[sp++] = k + W; } }
    comps.push({ id, x0, y0, x1, y1, cnt, border });
  }
  const minA = N * 0.0025;
  const grow = r + Math.round(intPx / 2);
  let rooms = comps.filter(c => !c.border && c.cnt > minA).map(c => {
    // robust rectangle: rows/columns where the region is dense (ignores door-swing protrusions)
    const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1, colC = new Int32Array(cw), rowC = new Int32Array(ch);
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (lab[y * W + x] === c.id) { colC[x - c.x0]++; rowC[y - c.y0]++; }
    const mc = Math.max(...colC), mr = Math.max(...rowC); let a = 0, b2 = cw - 1, t = 0, u = ch - 1;
    while (a < b2 && colC[a] < mc * 0.3) a++; while (b2 > a && colC[b2] < mc * 0.3) b2--; while (t < u && rowC[t] < mr * 0.3) t++; while (u > t && rowC[u] < mr * 0.3) u--;
    return { x0: Math.max(0, c.x0 + a - grow), y0: Math.max(0, c.y0 + t - grow), x1: Math.min(W, c.x0 + b2 + grow + 1), y1: Math.min(H, c.y0 + u + grow + 1), fill: c.cnt / (cw * ch) };
  });
  // drop nested components (furniture outlines inside rooms)
  rooms = rooms.filter(a => !rooms.some(b => b !== a && a.x0 >= b.x0 - 2 && a.y0 >= b.y0 - 2 && a.x1 <= b.x1 + 2 && a.y1 <= b.y1 + 2 && (b.x1 - b.x0) * (b.y1 - b.y0) > (a.x1 - a.x0) * (a.y1 - a.y0) * 1.2));
  // snap the dilation-expanded box edges to centre of walls (expansion r ≈ wall centre)
  return { W, H, rooms, intPx, extPx, dark: dark / N };
}
function heuristicTypes(rooms, all = rooms) {
  const count = {}; const nm = t => { count[t] = (count[t] || 0) + 1; return ROOM_TYPES[t].label + (['bedroom', 'bathroom'].includes(t) ? ' ' + count[t] : ''); };
  const bb = { x0: Math.min(...all.map(r => r.x)), y0: Math.min(...all.map(r => r.y)), x1: Math.max(...all.map(r => r.x + r.w)), y1: Math.max(...all.map(r => r.y + r.d)) };
  const onEdge = r => r.x - bb.x0 < 0.3 || r.y - bb.y0 < 0.3 || bb.x1 - (r.x + r.w) < 0.3 || bb.y1 - (r.y + r.d) < 0.3;
  const left = rooms.slice().sort((a, b) => area(b) - area(a)); const set = (r, t) => { r.type = t; left.splice(left.indexOf(r), 1); };
  const living = all.find(r => r.type === 'living' && !rooms.includes(r)) || left.find(r => area(r) > 8); if (living && rooms.includes(living)) set(living, 'living');
  left.slice().forEach(r => { const asp = Math.max(r.w, r.d) / Math.min(r.w, r.d); if (asp > 2.05 && Math.min(r.w, r.d) < 1.9) set(r, onEdge(r) && area(r) < 9 ? 'balcony' : 'hall'); });
  if (living) {
    const biggest = left[0];
    const din = left.filter(r => r !== biggest && area(r) >= 6 && area(r) <= 14 && Math.max(r.w, r.d) / Math.min(r.w, r.d) < 1.7 && sharedEdge(r, living)).sort((a, b) => area(b) - area(a))[0];
    if (din) { set(din, 'dining'); const kit = left.filter(r => area(r) >= 4.4 && area(r) <= 12.5 && sharedEdge(r, din)).sort((a, b) => area(b) - area(a))[0]; if (kit) set(kit, 'kitchen'); }
  }
  let master = false;
  left.slice().forEach(r => { const A = area(r); if (A >= 8.5) { set(r, master ? 'bedroom' : 'master'); master = true; } });
  if (!all.some(r => r.type === 'kitchen')) { const k = left.filter(r => area(r) >= 4.4).sort((a, b) => area(b) - area(a))[0]; if (k) set(k, 'kitchen'); }
  left.slice().forEach(r => { const A = area(r); set(r, A < 2.4 ? 'utility' : A < 4.6 ? 'bathroom' : 'study'); });
  rooms.forEach(r => r.name = nm(r.type));
}
/* Read one floor-plan image: computer vision + (optionally) AI. Returns pixel-space data; no scale applied yet. */
async function readPlan(url, opts = {}) {
  const log = opts.log || (() => { }); const tag = opts.tag ? opts.tag + ' — ' : '';
  const img = await loadImage(url);
  log(tag + 'analysing line work, walls and enclosed spaces…');
  const cv = cvDetect(img);
  log(`${tag}computer vision found ${cv.rooms.length} enclosed regions.`);
  let gem = null, source = 'Computer vision';
  if (opts.useAI !== false) log(tag + 'backend offline — reading the plan with in-browser computer vision only (no AI).');
  const pct = (b, i, pre) => Array.isArray(b) && b.length === 4 && b.every(v => isFinite(+v)) && +b[2] > +b[0] && +b[3] > +b[1] ? { id: pre + i, x0: b[0] / 100 * cv.W, y0: b[1] / 100 * cv.H, x1: b[2] / 100 * cv.W, y1: b[3] / 100 * cv.H } : null;
  let pxRooms = cv.rooms.map((r, i) => ({ id: 'R' + (i + 1), x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 }));
  if (gem) {
    if (cv.rooms.length < 2 && gem.rooms_full?.length) pxRooms = gem.rooms_full.map((r, i) => { const b = pct(r.bbox, i + 1, 'R'); return b && Object.assign(b, { name: r.name, type: r.type }); }).filter(Boolean);
    else {
      (gem.rooms || []).forEach(g => { const pr = pxRooms.find(p => p.id === g.id); if (pr) { pr.name = g.name; pr.type = g.type; } });
      (gem.extra_rooms || []).forEach((g, i) => { const b = pct(g.bbox, i, 'X'); if (b) pxRooms.push(Object.assign(b, { name: g.name, type: g.type })); });
    }
  }
  if (!pxRooms.length) throw new Error('No rooms could be detected. Try a cleaner, high-contrast plan (dark walls on white) or start the DIMORA backend with the Qwen AI.');
  // a room labelled "staircase" is circulation space
  pxRooms.forEach(r => { if (/stair/i.test(r.name || '')) r.type = 'hall'; });
  const pxStairs = gem && Array.isArray(gem.stairs) ? gem.stairs.map((b, i) => pct(b, i, 'S')).filter(Boolean) : [];
  const bx0 = Math.min(...pxRooms.map(r => r.x0)), by0 = Math.min(...pxRooms.map(r => r.y0)), bx1 = Math.max(...pxRooms.map(r => r.x1)), by1 = Math.max(...pxRooms.map(r => r.y1));
  const gw = gem ? +gem.plan_width_m : 0;
  const lvl = gem && gem.level != null && isFinite(+gem.level) ? Math.round(+gem.level) : null;
  return { img, cv, gem, source, pxRooms, pxStairs, bx0, by0, bx1, by1, pxW: bx1 - bx0, nat: img.width / cv.W, widthM: gw > 2 && gw < 80 ? gw : 0, label: gem && typeof gem.floor_label === 'string' ? gem.floor_label.trim() : '', level: lvl, off: [0, 0] };
}
/* Turn a reading into rooms / doors / windows on `floor`. mpp = metres per computer-vision pixel. */
function buildFloorFromReading(rd, floor, mpp, opts = {}) {
  const { cv, gem, bx0, by0 } = rd;
  floor.rooms = []; floor.doors = []; floor.windows = []; floor.stairs = [];
  rd.pxRooms.forEach(pr => {
    const room = makeRoom({ x: r2((pr.x0 - bx0) * mpp), y: r2((pr.y0 - by0) * mpp), w: r2((pr.x1 - pr.x0) * mpp), d: r2((pr.y1 - pr.y0) * mpp), type: ROOM_TYPES[pr.type] ? pr.type : 'empty' });
    if (pr.name) room.name = String(pr.name).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).slice(0, 28);
    room._typed = !!ROOM_TYPES[pr.type];
    floor.rooms.push(room);
  });
  snapRooms(floor, 0.35);
  if (!floor.rooms.every(r => r._typed)) { const untyped = floor.rooms.filter(r => !r._typed); heuristicTypes(untyped, floor.rooms); }
  floor.rooms.forEach(r => delete r._typed);
  floor.rooms = floor.rooms.filter(r => area(r) > 0.8);
  floor.rooms.sort((a, b) => area(b) - area(a));
  for (let i = floor.rooms.length - 1; i >= 0; i--) { const a = floor.rooms[i]; if (floor.rooms.some((b, j) => j < i && rectOverlap(a, b) > area(a) * 0.6)) floor.rooms.splice(i, 1); }
  if (gem) {
    const lines = wallLines(floor);
    const snapTo = (nx, ny, isDoor) => { const x = (nx / 100 * cv.W - bx0) * mpp, y = (ny / 100 * cv.H - by0) * mpp; let best = null;
      lines.forEach(L => { const t = clamp(L.o === 'h' ? x : y, L.a, L.b); const d = L.o === 'h' ? Math.hypot(x - t, y - L.c) : Math.hypot(x - L.c, y - t); if (d < 0.6 && (!best || d < best.d)) best = { d, L, t }; });
      if (!best) return null; const L = best.L, w = isDoor ? 0.9 : 1.2; const t = clamp(best.t, L.a + w / 2 + 0.05, L.b - w / 2 - 0.05);
      return { o: L.o, x: r2(L.o === 'h' ? t : L.c), y: r2(L.o === 'h' ? L.c : t), w }; };
    (gem.doors || []).slice(0, 30).forEach(p => { const s = Array.isArray(p) && snapTo(p[0], p[1], true); if (s && !floor.doors.some(d => Math.hypot(d.x - s.x, d.y - s.y) < 0.8)) floor.doors.push(Object.assign({ id: uid('d') }, s)); });
    (gem.windows || []).slice(0, 40).forEach(p => { const s = Array.isArray(p) && snapTo(p[0], p[1], false); if (s && isExteriorPoint(floor, s.o, s.o === 'h' ? s.y : s.x, s.o === 'h' ? s.x : s.y) && !floor.windows.some(d => Math.hypot(d.x - s.x, d.y - s.y) < 0.8)) floor.windows.push(Object.assign({ id: uid('w'), sill: 0.9, h: 1.25 }, s)); });
  }
  autoOpenings(floor, { main: opts.main !== false });
  // staircase candidates (metres): AI stair boxes + rooms labelled "staircase"
  floor._stairRects = rd.pxStairs.map(s => ({ x: r2((s.x0 - bx0) * mpp), y: r2((s.y0 - by0) * mpp), w: r2((s.x1 - s.x0) * mpp), d: r2((s.y1 - s.y0) * mpp), src: 'ai' })).filter(s => Math.min(s.w, s.d) >= 0.6 && Math.max(s.w, s.d) >= 1.5 && Math.max(s.w, s.d) <= 9);
  floor.rooms.filter(r => /stair/i.test(r.name)).forEach(r => { if (!floor._stairRects.some(s => rectOverlap(s, r) > area(s) * 0.3)) floor._stairRects.push({ x: r.x, y: r.y, w: r.w, d: r.d, src: 'label' }); });
  rd.mpp = mpp;
}
function setThicknessFrom(rd) { P().wallThickness = { ext: r2(Math.max(0.15, Math.min(0.35, rd.cv.extPx * rd.mpp))), int: r2(Math.max(0.08, Math.min(0.25, rd.cv.intPx * rd.mpp))) }; }
async function detectPlan(url, opts = {}) { // single floor
  const rd = await readPlan(url, opts);
  let widthM = +opts.widthM || rd.widthM || opts.defaultWidth || 12;
  buildFloorFromReading(rd, FL(), widthM / rd.pxW);
  delete FL()._stairRects;
  setThicknessFrom(rd);
  P().scaleNote = `${rd.source} · scale ${r2(rd.mpp * 100)} cm/px · plan width ${r2(widthM)} m`;
  return rd;
}

/* ===================== MULTI-FLOOR: sheet splitting, floor ordering, alignment & stairs ===================== */
const FLOOR_NAMES = ['Ground', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth'].map(w => w + ' Floor');
const floorName = k => FLOOR_NAMES[k] || `${k}${k % 100 >= 10 && k % 100 <= 20 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[k % 10] || 'th')} Floor`;
async function fileToSheets(file) {
  const base = file.name.replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 40);
  if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
    await ensurePdfJs();
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; const out = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) {
      const page = await pdf.getPage(i); const vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise; out.push({ url: c.toDataURL('image/png'), name: pdf.numPages > 1 ? `${base} · page ${i}` : base });
    }
    return out;
  }
  return [{ url: await fileToImageURL(file), name: base }];
}
async function filesToSheets(files) { const out = []; for (const f of Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) out.push(...await fileToSheets(f)); return out; }
/* Find separate floor-plan drawings on one sheet: big clusters of line work separated by white space. Returns fractional boxes. */
/* A drawing border (often joined to the title block) spans the whole sheet but is nearly empty
   inside. Left in, it glues every floor plan on the sheet into one. Remove such ink components. */
function removeSheetFrame(dark, W, H) {
  const N = W * H, lab = new Int32Array(N).fill(-1), st = new Int32Array(N); let id = 0;
  for (let s0 = 0; s0 < N; s0++) {
    if (!dark[s0] || lab[s0] !== -1) continue; let sp = 0; st[sp++] = s0; lab[s0] = id; let x0 = W, y0 = H, x1 = 0, y1 = 0, a = 0; const members = [];
    while (sp) { const k = st[--sp]; members.push(k); a++; const x = k % W, y = (k / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1, x > 0 && y > 0 ? k - W - 1 : -1, x < W - 1 && y < H - 1 ? k + W + 1 : -1, x < W - 1 && y > 0 ? k - W + 1 : -1, x > 0 && y < H - 1 ? k + W - 1 : -1])
        if (n >= 0 && dark[n] && lab[n] === -1) { lab[n] = id; st[sp++] = n; } }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (w >= 0.85 * W && h >= 0.85 * H && a < 0.045 * w * h) members.forEach(k => { dark[k] = 0; });
    id++;
  }
}
function splitSheet(img) {
  const mx = 640, sc = Math.min(1, mx / Math.max(img.width, img.height)); const W = Math.max(8, Math.round(img.width * sc)), H = Math.max(8, Math.round(img.height * sc)), N = W * H;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data; const dark = new Uint8Array(N);
  for (let i = 0; i < N; i++) dark[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) < 170 ? 1 : 0;
  removeSheetFrame(dark, W, H);
  const r = Math.max(2, Math.round(Math.max(W, H) * 0.018)); const t = new Uint8Array(N), m = new Uint8Array(N);
  for (let y = 0; y < H; y++) { let cnt = 0; for (let xx = -r; xx < W + r; xx++) { if (xx + r < W && xx + r >= 0 && dark[y * W + xx + r]) cnt++; if (xx - r - 1 >= 0 && xx - r - 1 < W && dark[y * W + xx - r - 1]) cnt--; if (xx >= 0 && xx < W) t[y * W + xx] = cnt > 0 ? 1 : 0; } }
  for (let xx = 0; xx < W; xx++) { let cnt = 0; for (let y = -r; y < H + r; y++) { if (y + r < H && y + r >= 0 && t[(y + r) * W + xx]) cnt++; if (y - r - 1 >= 0 && y - r - 1 < H && t[(y - r - 1) * W + xx]) cnt--; if (y >= 0 && y < H) m[y * W + xx] = cnt > 0 ? 1 : 0; } }
  const lab = new Int32Array(N).fill(-1), st = new Int32Array(N), comps = [];
  for (let s0 = 0; s0 < N; s0++) {
    if (!m[s0] || lab[s0] !== -1) continue; const id = comps.length; let sp = 0; st[sp++] = s0; lab[s0] = id; let x0 = W, y0 = H, x1 = 0, y1 = 0, ink = 0;
    while (sp) { const k = st[--sp]; const xx = k % W, y = (k / W) | 0; if (dark[k]) ink++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (xx > 0 && m[k - 1] && lab[k - 1] === -1) { lab[k - 1] = id; st[sp++] = k - 1; } if (xx < W - 1 && m[k + 1] && lab[k + 1] === -1) { lab[k + 1] = id; st[sp++] = k + 1; }
      if (y > 0 && m[k - W] && lab[k - W] === -1) { lab[k - W] = id; st[sp++] = k - W; } if (y < H - 1 && m[k + W] && lab[k + W] === -1) { lab[k + W] = id; st[sp++] = k + W; } }
    comps.push({ x0: Math.max(0, x0 - r), y0: Math.max(0, y0 - r), x1: Math.min(W, x1 + r + 1), y1: Math.min(H, y1 + r + 1), ink });
  }
  const ba = b => (b.x1 - b.x0) * (b.y1 - b.y0); const big = Math.max(1, ...comps.map(ba));
  // a floor plan has walls: long straight runs of ink. Title blocks, notes and legends (text) don't.
  const longRun = b => { let best = 0; for (let y = b.y0; y < b.y1; y++) { let run = 0; for (let xx = b.x0; xx < b.x1; xx++) { run = dark[y * W + xx] ? run + 1 : 0; if (run > best) best = run; } }
    let bestV = 0; for (let xx = b.x0; xx < b.x1; xx++) { let run = 0; for (let y = b.y0; y < b.y1; y++) { run = dark[y * W + xx] ? run + 1 : 0; if (run > bestV) bestV = run; } }
    return Math.max(best / Math.max(1, b.x1 - b.x0), bestV / Math.max(1, b.y1 - b.y0)); };
  let plans = comps.filter(b => ba(b) >= big * 0.16 && Math.min(b.x1 - b.x0, b.y1 - b.y0) >= Math.min(W, H) * 0.14 && b.ink > 40 && longRun(b) >= 0.2);
  plans = plans.filter(a => !plans.some(b => b !== a && a.x0 >= b.x0 && a.y0 >= b.y0 && a.x1 <= b.x1 && a.y1 <= b.y1));
  plans = plans.sort((a, b) => ba(b) - ba(a)).slice(0, 6);
  const rowTol = H * 0.2; plans.sort((a, b) => Math.abs(a.y0 - b.y0) < rowTol ? a.x0 - b.x0 : a.y0 - b.y0);
  if (!plans.length) return [{ x0: 0, y0: 0, x1: 1, y1: 1 }];
  return plans.map(b => ({ x0: b.x0 / W, y0: b.y0 / H, x1: b.x1 / W, y1: b.y1 / H }));
}
/* Pad each plan box (so its printed title stays in the crop) without running into a neighbouring plan. */
function padBoxes(boxes, pad = 0.05) {
  return boxes.map((b, i) => {
    const e = { x0: Math.max(0, b.x0 - pad), y0: Math.max(0, b.y0 - pad * 1.6), x1: Math.min(1, b.x1 + pad), y1: Math.min(1, b.y1 + pad * 1.6) };
    boxes.forEach((o, j) => { if (j === i) return;
      if (b.x1 <= o.x0) e.x1 = Math.min(e.x1, (b.x1 + o.x0) / 2); else if (o.x1 <= b.x0) e.x0 = Math.max(e.x0, (o.x1 + b.x0) / 2);
      else if (b.y1 <= o.y0) e.y1 = Math.min(e.y1, (b.y1 + o.y0) / 2); else if (o.y1 <= b.y0) e.y0 = Math.max(e.y0, (o.y1 + b.y0) / 2); });
    return e;
  });
}
function evenSplit(n, img) {
  const wide = img.width >= img.height; const cols = n === 4 ? 2 : wide ? n : 1, rows = n === 4 ? 2 : wide ? 1 : n; const out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push({ x0: i / cols, y0: j / rows, x1: (i + 1) / cols, y1: (j + 1) / rows });
  return out;
}
function cropToURL(img, b) {
  const x = Math.round(b.x0 * img.width), y = Math.round(b.y0 * img.height), w = Math.max(8, Math.round((b.x1 - b.x0) * img.width)), h = Math.max(8, Math.round((b.y1 - b.y0) * img.height));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  return c.toDataURL('image/png');
}
function parseLevel(s) {
  s = String(s || '').toLowerCase(); if (!s) return null;
  if (/basement|cellar|lower ground/.test(s)) return -1;
  if (/ground|\bg\.?\s?f\b|stilt|\bgf\b|\bg\s*floor/.test(s)) return 0;
  if (/terrace|roof/.test(s)) return 50;
  const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  for (let i = 0; i < words.length; i++) if (new RegExp('\\b' + words[i] + '\\b').test(s)) return i + 1;
  const m = /\b(\d)\s*(st|nd|rd|th)\b/.exec(s) || /\bfloor\s*(\d)\b/.exec(s) || /\b(\d)\s*f\b/.exec(s); if (m) return +m[1];
  if (/\bf\.?\s?f\b|\bff\b/.test(s)) return 1; if (/\bs\.?\s?f\b|\bsf\b/.test(s)) return 2;
  return null;
}
function cleanFloorName(label, k) {
  const t = String(label || '').replace(/\b(plan|layout|drawing|proposed|scale.*$)\b/gi, '').replace(/[^\w\s+-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t || t.length > 24 || !/floor|level|storey|terrace|basement|stilt|roof/i.test(t)) return floorName(k);
  return t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function shiftFloor(f, dx, dy) {
  if (!dx && !dy) return;
  const mv = o => { o.x = r2(o.x + dx); o.y = r2(o.y + dy); };
  f.rooms.forEach(r => { mv(r); r.furniture.forEach(mv); }); f.doors.forEach(mv); f.windows.forEach(mv); (f.stairs || []).forEach(mv); (f._stairRects || []).forEach(mv);
}
const footOverlap = (a, b, dx = 0, dy = 0) => { let s = 0; a.rooms.forEach(r => b.rooms.forEach(q => { s += rectOverlap(r, { x: q.x + dx, y: q.y + dy, w: q.w, d: q.d }); })); return s; };
/* Best offset that places floor b over floor a: match staircases if both have one, else maximise footprint overlap. */
function bestOffset(a, b) {
  const A = homeBounds(a), B = homeBounds(b); const cands = [];
  (a._stairRects || []).forEach(s => (b._stairRects || []).forEach(t => { if (Math.abs(Math.max(s.w, s.d) - Math.max(t.w, t.d)) < 1.5 && Math.abs(Math.min(s.w, s.d) - Math.min(t.w, t.d)) < 1.0) cands.push({ dx: s.x + s.w / 2 - (t.x + t.w / 2), dy: s.y + s.d / 2 - (t.y + t.d / 2), bonus: 0.12 }); }));
  [A.x - B.x, A.x + A.w - (B.x + B.w), A.x + A.w / 2 - (B.x + B.w / 2)].forEach(dx => [A.y - B.y, A.y + A.d - (B.y + B.d), A.y + A.d / 2 - (B.y + B.d / 2)].forEach(dy => cands.push({ dx, dy, bonus: 0 })));
  let best = null; cands.forEach(c => { const v = footOverlap(a, b, c.dx, c.dy) * (1 + c.bonus); if (!best || v > best.v + 1e-6) best = Object.assign({ v }, c); });
  let dx = best ? best.dx : 0, dy = best ? best.dy : 0;
  // snap outer edges that nearly line up
  const sn = (v, opts) => { let bst = null; opts.forEach(o => { const d = o - v; if (Math.abs(d) < 0.45 && (!bst || Math.abs(d) < Math.abs(bst))) bst = d; }); return bst || 0; };
  dx += sn(B.x + dx, [A.x, A.x + A.w - B.w]); dy += sn(B.y + dy, [A.y, A.y + A.d - B.d]);
  return [r2(dx), r2(dy)];
}
const stairRun = st => st.run || 'z', stairDir = st => st.dir || 1;
const stairRisers = f => Math.max(12, Math.ceil((f.height + 0.25) / 0.18));
const stairLen = st => stairRun(st) === 'z' ? st.d : st.w, stairWidth = st => stairRun(st) === 'z' ? st.w : st.d;
const stairFoot = st => ({ x: st.x - st.w / 2, y: st.y - st.d / 2, w: st.w, d: st.d });
/* point (plan x,y) at the low or high end of a flight, `beyond` metres outside it */
function stairEnd(st, which, beyond = 0) { const s = (which === 'high' ? 1 : -1) * stairDir(st), L = stairLen(st) / 2 + beyond; return stairRun(st) === 'z' ? [st.x, st.y + s * L] : [st.x + s * L, st.y]; }
function floorBelow(f) { const pj = P(); return pj.floors.filter(x => x.level < f.level).sort((a, b) => b.level - a.level)[0] || null; }
function floorAbove(f) { const pj = P(); return pj.floors.filter(x => x.level > f.level).sort((a, b) => a.level - b.level)[0] || null; }
const stairsBelow = f => { const lo = floorBelow(f); return lo ? (lo.stairs || []) : []; };
/* Fit a straight flight inside rect `rc` on floor lo, rising to floor up; choose the direction that lands inside a room upstairs. */
function makeStair(rc, lo, up) {
  const runZ = rc.d >= rc.w, L = runZ ? rc.d : rc.w, Wd = runZ ? rc.w : rc.d;
  const want = clamp(stairRisers(lo) * 0.25, 2.6, 4.6);
  const len = r2(L - want >= 0.9 ? want : L - 0.9 >= 2.4 ? L - 0.9 : Math.min(L, Math.max(2.2, want))), sw = r2(clamp(Math.min(Wd, 1.2), 0.75, 1.5));
  const c0 = runZ ? rc.y : rc.x, cAcross = runZ ? rc.x + rc.w / 2 : rc.y + rc.d / 2;
  let best = null;
  [1, -1].forEach(dir => [c0 + len / 2, c0 + L - len / 2].forEach(cAlong => {
    const st = runZ ? { x: r2(cAcross), y: r2(cAlong), w: sw, d: len, run: 'z', dir } : { x: r2(cAlong), y: r2(cAcross), w: len, d: sw, run: 'x', dir };
    const hi = stairEnd(st, 'high', 0.45), lw = stairEnd(st, 'low', 0.45);
    let sc = 0; if (up && roomAt(hi[0], hi[1], up)) sc += 3; if (roomAt(lw[0], lw[1], lo)) sc += 2;
    if (lo.doors.some(d => Math.hypot(d.x - lw[0], d.y - lw[1]) < 1.3)) sc += 1;
    if (up && inRoom(rc, hi[0], hi[1])) sc += 0.5; // leftover landing at the top
    if (!best || sc > best.sc) best = { sc, st };
  }));
  return Object.assign({ id: uid('s') }, best.st);
}
function placeStairs(lo, up) {
  if (lo.stairs && lo.stairs.length) return lo.stairs[0];
  const A = lo._stairRects || [], B = up._stairRects || [];
  const cand = [...A.map(s => ({ s, sc: (s.src === 'ai' ? 3 : 2) + (B.some(t => rectOverlap(s, t) > area(s) * 0.3) ? 2 : 0) })), ...B.map(s => ({ s, sc: 1 }))].sort((a, b) => b.sc - a.sc);
  let rc = cand[0] && cand[0].s;
  if (!rc) { // corridor-like halls that sit under a hall upstairs
    const halls = lo.rooms.filter(r => r.type === 'hall' && Math.min(r.w, r.d) >= 0.9 && Math.max(r.w, r.d) >= 2.4).map(r => ({ r, sc: (up.rooms.some(q => q.type === 'hall' && rectOverlap(r, q) > area(r) * 0.5) ? 2 : 0) + Math.max(r.w, r.d) / 10 })).sort((a, b) => b.sc - a.sc);
    if (halls[0]) rc = halls[0].r;
  }
  if (!rc) { // last resort: along the inner edge of the main living space
    const hub = lo.rooms.find(r => r.type === 'living') || lo.rooms.slice().sort((a, b) => area(b) - area(a))[0]; if (!hub) return null;
    const vert = hub.d >= hub.w; rc = vert ? { x: hub.x + hub.w - 1.1, y: hub.y + Math.max(0.2, hub.d - 3.6), w: 1.0, d: Math.min(3.4, hub.d - 0.4) } : { x: hub.x + Math.max(0.2, hub.w - 3.6), y: hub.y + hub.d - 1.1, w: Math.min(3.4, hub.w - 0.4), d: 1.0 };
  }
  const st = makeStair(rc, lo, up); lo.stairs = [st]; return st;
}
/* Align every floor over the one below it, then connect consecutive floors with a staircase. */
function alignAndConnectFloors(floors, offsets) {
  for (let k = 1; k < floors.length; k++) { const [dx, dy] = bestOffset(floors[k - 1], floors[k]); shiftFloor(floors[k], dx, dy); if (offsets) { offsets[k][0] += dx; offsets[k][1] += dy; } }
  floors.forEach(f => f.stairs = []);
  for (let k = 0; k < floors.length - 1; k++) placeStairs(floors[k], floors[k + 1]);
}
function clearStairFurniture() {
  P().floors.forEach(f => { const holes = [...(f.stairs || []), ...stairsBelow(f)].map(st => { const ft = stairFoot(st); const lw = stairEnd(st, 'low', 0.6), hi = stairEnd(st, 'high', 0.6); return { x: Math.min(ft.x, lw[0], hi[0]) - 0.05, y: Math.min(ft.y, lw[1], hi[1]) - 0.05, w: 0, d: 0, ft, lw, hi }; });
    if (!holes.length) return;
    f.rooms.forEach(r => { r.furniture = r.furniture.filter(it => { const fp = itemFootprint(it); return !holes.some(h => rectOverlap(fp, h.ft) > 0.02 || inRoom(fp, h.lw[0], h.lw[1], 0.25) || inRoom(fp, h.hi[0], h.hi[1], 0.25)); }); });
  });
}
/* Sample duplex (G+1) used for "Try a sample duplex" */
function sampleDuplex() {
  const p = newProject('Sample Duplex — G+1'); S.project = p;
  const g = p.floors[0]; const up = newFloor('First Floor', 1); p.floors.push(up);
  const R = (f, name, type, x, y, w, d) => f.rooms.push(makeRoom({ name, type, x, y, w, d }));
  R(g, 'Living Room', 'living', 0, 0, 5.0, 4.8); R(g, 'Dining', 'dining', 5.0, 0, 3.4, 3.4); R(g, 'Kitchen', 'kitchen', 8.4, 0, 3.2, 3.4);
  R(g, 'Staircase', 'hall', 5.0, 3.4, 1.2, 4.2); R(g, 'Passage', 'hall', 6.2, 3.4, 2.2, 1.4); R(g, 'Utility', 'utility', 8.4, 3.4, 3.2, 1.4);
  R(g, 'Guest Room', 'guest', 0, 4.8, 3.4, 4.6); R(g, 'Common Bath', 'bathroom', 3.4, 4.8, 1.6, 2.2); R(g, 'Pooja', 'pooja', 3.4, 7.0, 1.6, 2.4); R(g, 'Store', 'closet', 5.0, 7.6, 1.2, 1.8);
  R(g, 'Bedroom 2', 'bedroom', 6.2, 4.8, 3.4, 4.6); R(g, 'Bath 2', 'bathroom', 9.6, 4.8, 2.0, 2.2); R(g, 'Study', 'study', 9.6, 7.0, 2.0, 2.4);
  R(up, 'Family Lounge', 'living', 0, 4.8, 5.0, 4.6); R(up, 'Bedroom 3', 'bedroom', 0, 0, 3.4, 4.8); R(up, 'Bath 3', 'bathroom', 3.4, 0, 1.6, 2.4); R(up, 'Wardrobe', 'closet', 3.4, 2.4, 1.6, 2.4);
  R(up, 'Sit-out', 'balcony', 5.0, 0, 1.2, 3.4); R(up, 'Landing', 'hall', 5.0, 3.4, 1.2, 6.0); R(up, 'Home Office', 'office', 6.2, 0, 3.6, 4.8); R(up, 'Bath 4', 'bathroom', 9.8, 0, 1.8, 2.4); R(up, 'Laundry', 'utility', 9.8, 2.4, 1.8, 2.4);
  R(up, 'Master Bedroom', 'master', 6.2, 4.8, 3.4, 4.6); R(up, 'Master Bath', 'bathroom', 9.6, 4.8, 2.0, 2.2); R(up, 'Dressing', 'closet', 9.6, 7.0, 2.0, 2.4);
  R(g, 'Garage', 'garage', -4.2, 0, 4.2, 6.0); R(up, 'Terrace', 'balcony', -4.2, 0, 4.2, 4.8);
  const D = (f, a, b, w = 0.9, at = 0.5) => { const ra = f.rooms.find(r => r.name === a), rb = f.rooms.find(r => r.name === b); const e = sharedEdge(ra, rb); if (!e) return; const t = r2(clamp(e.lo + (e.hi - e.lo) * at, e.lo + w / 2 + 0.05, e.hi - w / 2 - 0.05)); f.doors.push({ id: uid('d'), o: e.o, x: e.o === 'h' ? t : e.c, y: e.o === 'h' ? e.c : t, w }); };
  g.doors.push({ id: uid('d'), o: 'h', x: 1.2, y: 0, w: 1.0, main: true });
  D(g, 'Living Room', 'Dining', 1.4, 0.5); D(g, 'Dining', 'Kitchen', 0.9, 0.5); D(g, 'Living Room', 'Staircase', 0.9, 0.5); D(g, 'Staircase', 'Passage', 0.9, 0.5); D(g, 'Dining', 'Passage', 0.9, 0.5); D(g, 'Passage', 'Utility', 0.8);
  D(g, 'Living Room', 'Guest Room', 0.9, 0.5); D(g, 'Living Room', 'Common Bath', 0.75); D(g, 'Guest Room', 'Pooja', 0.75, 0.6); D(g, 'Passage', 'Bedroom 2', 0.9, 0.5); D(g, 'Bedroom 2', 'Bath 2', 0.75, 0.5); D(g, 'Bedroom 2', 'Study', 0.8, 0.5); D(g, 'Staircase', 'Store', 0.75);
  D(up, 'Landing', 'Family Lounge', 0.9, 0.82); D(up, 'Landing', 'Master Bedroom', 0.9, 0.82); D(up, 'Family Lounge', 'Bedroom 3', 0.9, 0.5); D(up, 'Bedroom 3', 'Bath 3', 0.75, 0.5); D(up, 'Bedroom 3', 'Wardrobe', 0.75, 0.5);
  D(up, 'Master Bedroom', 'Home Office', 0.9, 0.5); D(up, 'Home Office', 'Sit-out', 0.8, 0.5); D(up, 'Home Office', 'Bath 4', 0.75, 0.5); D(up, 'Home Office', 'Laundry', 0.75, 0.5); D(up, 'Master Bedroom', 'Master Bath', 0.75, 0.5); D(up, 'Master Bedroom', 'Dressing', 0.8, 0.5); D(g, 'Garage', 'Living Room', 0.9, 0.75); D(up, 'Bedroom 3', 'Terrace', 0.9, 0.5);
  g.stairs = [{ id: uid('s'), x: 5.6, y: 5.9, w: 1.0, d: 3.0, run: 'z', dir: 1 }];
  autoOpenings(g, { doors: false }); autoOpenings(up, { doors: false });
  return p;
}
/* One drawing sheet with every floor side by side and a printed title under each (like a real architect's sheet). */
function drawSheetImage(project) {
  const parts = project.floors.map((f, i) => ({ f, img: drawPlanImage(project, i) }));
  return Promise.all(parts.map(p => loadImage(p.img.url))).then(imgs => {
    const gap = 110, band = 80; const W = imgs.reduce((s, im) => s + im.width, 0) + gap * (imgs.length - 1), H = Math.max(...imgs.map(im => im.height)) + band;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fbfaf7'; x.fillRect(0, 0, W, H);
    let ox = 0; imgs.forEach((im, i) => { x.drawImage(im, ox, 0); x.fillStyle = '#1b1b1b'; x.textAlign = 'center'; x.font = '700 22px Arial'; x.fillText(parts[i].f.name.toUpperCase() + ' PLAN', ox + im.width / 2, im.height + 34); x.fillRect(ox + im.width / 2 - 120, im.height + 44, 240, 2); ox += im.width + gap; });
    return { url: c.toDataURL('image/png'), widthM: parts[0].img.widthM };
  });
}

/* ===================== GEMMA 4 CLIENT + ARIA ASSISTANT ===================== */
/* The DIMORA engine now lives in a Python backend (backend/app.py). The AI is Qwen 3.5 — open
   source (Apache-2.0) — run locally through Ollama or hosted on OpenRouter; the backend picks. */
const OR_MODELS = { 'qwen/qwen3.5-27b': 'Qwen3.5 27B — recommended', 'qwen/qwen3.5-9b': 'Qwen3.5 9B — cheapest', 'qwen/qwen3-vl-235b-a22b-instruct': 'Qwen3-VL 235B — most accurate' };
const API = {
  base() { const b = (S.backendUrl || '').trim().replace(/\/+$/, ''); if (b) return b; return /^https?:$/.test(location.protocol) && !/claude|claudeusercontent/.test(location.hostname) ? location.origin : 'http://127.0.0.1:8000'; },
  headers(extra = {}) { const h = Object.assign({}, extra); if (CLOUD.token) h.Authorization = 'Bearer ' + CLOUD.token; if (S.aiProvider && S.aiProvider !== 'auto') h['X-AI-Provider'] = S.aiProvider; if (S.orKey) h['X-OpenRouter-Key'] = S.orKey; if (S.orModel) h['X-OpenRouter-Model'] = S.orModel; if (S.ollamaModel) h['X-Ollama-Model'] = S.ollamaModel; return h; },
  async req(path, { body, form, method, timeout = 120000 } = {}) {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(API.base() + path, { method: method || (body || form ? 'POST' : 'GET'), signal: ctrl.signal, headers: API.headers(body ? { 'Content-Type': 'application/json' } : {}), body: form || (body ? JSON.stringify(body) : undefined) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(j.message || 'HTTP ' + r.status); e.code = j.error || 'http_' + r.status; e.status = r.status; if (r.status === 401 && CLOUD.token && !/\/api\/auth\/(login|signup|password)/.test(path) && method !== 'DELETE') cloudExpired(); throw e; }
      return j;
    } catch (e) {
      if (e.name === 'AbortError') { const x = new Error('The backend took too long to answer'); x.code = 'timeout'; throw x; }
      if (!e.code) { e.code = 'offline'; e.message = 'Backend not reachable at ' + API.base(); S.backendOK = false; updateAIBadge(); }
      throw e;
    } finally { clearTimeout(tm); }
  },
  async health(force) {
    if (!force && S.backendAt && Date.now() - S.backendAt < 15000) return S.backend;
    try { S.backend = await API.req('/api/health', { timeout: 4000 }); S.backendOK = true; } catch (e) { S.backend = null; S.backendOK = false; }
    S.backendAt = Date.now(); updateAIBadge(); return S.backend;
  },
};
const aiOn = () => !!(S.backendOK && S.backend && S.backend.ai && S.backend.ai.active);
function modelLabel() { if (!S.backendOK) return 'in-browser engine (backend offline)'; const a = S.backend && S.backend.ai; if (!a || !a.active) return 'rule-based engine (no AI connected)'; return a.active === 'ollama' ? `Qwen · ${a.ollama.model} (local)` : `Qwen · ${a.openrouter.model}`; }
function projectGeometry(pj = P()) { return { floors: pj.floors.map(f => ({ id: f.id, name: f.name, level: f.level, height: f.height, rooms: f.rooms.map(r => ({ id: r.id, name: r.name, type: r.type, x: r.x, y: r.y, w: r.w, d: r.d, group: r.group || null })), doors: f.doors, windows: f.windows, stairs: f.stairs || [], stair_rects: f._stairRects || [] })) }; }
function dataURLtoBlob(url) { const [h, b] = url.split(','); const mime = (/data:([^;]+)/.exec(h) || [])[1] || 'image/png'; const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
function extractJSON(t) {
  t = String(t).replace(/```(?:json)?/gi, '').trim();
  const s = Math.min(...['{', '['].map(c => { const i = t.indexOf(c); return i < 0 ? 1e9 : i; }));
  if (s === 1e9) throw new Error('No JSON in response');
  for (let e = t.length; e > s; e--) { const ch = t[e - 1]; if (ch !== '}' && ch !== ']') continue; try { return JSON.parse(t.slice(s, e)); } catch (err) { } }
  throw new Error('Could not parse JSON from the AI reply');
}
const imgPart = url => { const m = /^data:([^;]+);base64,(.*)$/.exec(url); return { inline_data: { mime_type: m[1], data: m[2] } }; };
async function shrinkImage(url, max = 1280) { const img = await loadImage(url); const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.9); }

/* ---------- vocabulary for on-device understanding ---------- */
const FURN_WORDS = [['single bed', 'bed_single'], ['bunk', 'bunk_bed'], ['king bed', 'bed_double'], ['queen bed', 'bed_double'], ['double bed', 'bed_double'], ['bed', 'bed_double'], ['wardrobe', 'wardrobe'], ['almirah', 'wardrobe'], ['nightstand', 'side_table'], ['side table', 'side_table'], ['bedside', 'side_table'], ['dresser', 'dresser'], ['vanity', 'dresser'],
  ['gaming', 'gaming_desk'], ['gaming chair', 'gaming_chair'], ['study table', 'desk'], ['work desk', 'desk'], ['desk', 'desk'], ['office chair', 'office_chair'], ['chair', 'office_chair'], ['l-shaped sofa', 'sofa_l'], ['l shaped sofa', 'sofa_l'], ['sectional', 'sofa_l'], ['sofa', 'sofa_3'], ['couch', 'sofa_3'], ['armchair', 'armchair'], ['accent chair', 'armchair'],
  ['coffee table', 'coffee_table'], ['tv', 'tv_unit'], ['television', 'tv_unit'], ['dining table', 'dining_set'], ['dining set', 'dining_set'], ['fridge', 'fridge'], ['refrigerator', 'fridge'], ['bookshelf', 'bookshelf'], ['bookcase', 'bookshelf'], ['shelf', 'bookshelf'], ['plant', 'plant'], ['rug', 'rug'], ['floor lamp', 'floor_lamp'], ['lamp', 'floor_lamp'],
  ['bean bag', 'beanbag'], ['beanbag', 'beanbag'], ['shoe rack', 'shoe_rack'], ['cabinet', 'storage_cabinet'], ['storage', 'storage_cabinet'], ['mandir', 'pooja_unit'], ['pooja', 'pooja_unit'], ['crib', 'crib'], ['treadmill', 'treadmill'], ['pet bed', 'pet_bed'], ['dog bed', 'pet_bed'], ['washing machine', 'washing_machine'], ['bathtub', 'bathtub'], ['tub', 'bathtub'], ['shower', 'shower'], ['toilet', 'toilet'], ['basin', 'wash_basin'], ['counter', 'kitchen_counter'], ['closet system', 'closet_rack']];
const FLOOR_WORDS = [['italian marble', 'marble'], ['indian marble', 'indian_marble'], ['makrana', 'indian_marble'], ['marble', 'marble'], ['herringbone', 'herringbone'], ['walnut', 'walnut'], ['vinyl', 'vinyl'], ['lvt', 'vinyl'], ['oak', 'oak'], ['wooden', 'oak'], ['wood', 'oak'], ['laminate', 'oak'], ['granite', 'granite'], ['kota', 'kota'], ['anti-skid', 'antiskid'], ['antiskid', 'antiskid'], ['ceramic', 'ceramic'], ['vitrified', 'vitrified'], ['tile', 'vitrified'], ['carpet', 'carpet'], ['concrete', 'concrete'], ['deck', 'deck'], ['wpc', 'deck']];
const TRANSFORM_WORDS = [['home office', 'office'], ['work from home', 'office'], ['wfh', 'office'], ['office', 'office'], ['gaming', 'gaming'], ['reading', 'reading'], ['library', 'reading'], ['study', 'study'], ['walk-in', 'closet'], ['walk in', 'closet'], ['dressing', 'closet'], ['closet', 'closet'], ['nursery', 'nursery'], ['baby', 'nursery'], ['gym', 'gym'], ['workout', 'gym'], ['guest', 'guest'], ['pooja', 'pooja'], ['prayer', 'pooja'], ['mandir', 'pooja'], ['bedroom', 'bedroom']];
const THEME_WORDS = [['japandi', 'Japandi'], ['scandinavian', 'Scandinavian'], ['scandi', 'Scandinavian'], ['nordic', 'Scandinavian'], ['minimalist', 'Minimalist'], ['minimal', 'Minimalist'], ['industrial', 'Industrial'], ['indian', 'Indian Contemporary'], ['traditional', 'Indian Contemporary'], ['luxury', 'Luxury'], ['luxurious', 'Luxury'], ['premium look', 'Luxury'], ['bohemian', 'Bohemian'], ['boho', 'Bohemian'], ['modern', 'Modern'], ['contemporary', 'Modern']];
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findWord = (t, list) => { let best = null; list.forEach(([w, v]) => { const m = new RegExp('(^|[^a-z])' + reEsc(w) + '(e?s)?(?![a-z])').exec(t); if (m && (!best || w.length > best.w.length)) best = { w, v, i: m.index }; }); return best; };
function findColor(t) {
  const hx = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(t); if (hx) return { hex: '#' + hx[1], name: '#' + hx[1] };
  let best = null; Object.keys(NAMED_COLORS).forEach(n => { const re = new RegExp('\\b' + n.replace(' ', '\\s*') + '\\b'); if (re.test(t) && (!best || n.length > best.length)) best = n; });
  return best ? { hex: NAMED_COLORS[best], name: best } : null;
}
function parseAmount(t) {
  const re = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|l|lakh|lakhs|lac|cr|crore)?(?![a-z])/gi; let m, best = null;
  while ((m = re.exec(t))) { let v = parseFloat(m[1].replace(/,/g, '')); const u = (m[2] || '').toLowerCase(); if (u === 'k' || u === 'thousand') v *= 1e3; else if (/^l/.test(u)) v *= 1e5; else if (/^c/.test(u)) v *= 1e7; if (v >= 1000 && (!best || v > best)) best = v; }
  return best;
}
function resolveRoom(ref, focus) {
  if (!ref && focus) return [focus];
  const t = String(ref || '').toLowerCase().trim();
  if (!t) return focus ? [focus] : [];
  if (['all', 'every', 'whole', 'house', 'home', 'everywhere'].some(w => t === w || t.includes('all room') || t.includes('whole house') || t.includes('every room') || t.includes('entire'))) return allRooms();
  const byId = allRooms().find(r => r.id === ref); if (byId) return [byId];
  const exact = allRooms().find(r => r.name.toLowerCase() === t); if (exact) return [exact];
  const named = allRooms().filter(r => t.includes(r.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length);
  if (named.length) return [named[0]];
  const typeMatch = Object.keys(ROOM_TYPES).find(k => t.includes(k) || t.includes(ROOM_TYPES[k].label.toLowerCase()));
  if (/master/.test(t)) { const m = allRooms().find(r => r.type === 'master'); if (m) return [m]; }
  if (/bed ?room/.test(t)) { const m = allRooms().filter(r => ['master', 'bedroom', 'guest'].includes(r.type)); const n = /(\d)/.exec(t); if (m.length) return [n ? (m.find(r => r.name.includes(n[1])) || m[0]) : m[0]]; }
  if (/bath|toilet|washroom/.test(t)) { const m = allRooms().filter(r => r.type === 'bathroom'); if (m.length) return [m[0]]; }
  if (/lounge|hall\b|drawing/.test(t)) { const m = allRooms().find(r => r.type === 'living'); if (m) return [m]; }
  if (typeMatch) { const m = allRooms().find(r => r.type === typeMatch); if (m) return [m]; }
  if (/\b(this|here|current|it)\b/.test(t) && focus) return [focus];
  return [];
}
function mentionRoom(t, focus) {
  if (/\b(all rooms|every room|whole (house|home)|entire (house|home)|everywhere|all the rooms)\b/.test(t)) return 'all';
  const named = allRooms().filter(r => t.includes(r.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length);
  if (named.length) return named[0].id;
  for (const w of ['master bedroom', 'master', 'bedroom 2', 'second bedroom', 'kids room', 'bedroom', 'living room', 'living', 'lounge', 'hall', 'kitchen', 'dining', 'bathroom', 'washroom', 'toilet', 'balcony', 'study', 'office', 'utility', 'store', 'passage', 'guest room']) {
    if (new RegExp('\\b' + w + '\\b').test(t)) { if (w === 'second bedroom' || w === 'kids room') { const b = allRooms().filter(r => r.type === 'bedroom'); if (b.length) return b[0].id; } const r = resolveRoom(w, null); if (r.length) return r[0].id; }
  }
  return focus ? focus.id : null;
}

const ROOM_ALIASES = ['master bedroom', 'master', 'bedroom 2', 'second bedroom', 'kids room', 'bedroom', 'living room', 'living', 'lounge', 'hall', 'kitchen', 'dining', 'bathroom', 'washroom', 'toilet', 'balcony', 'study', 'office', 'utility', 'store', 'passage', 'guest room'];
function stripRoom(c, roomId) {
  const r = roomId && roomId !== 'all' ? findRoom(roomId) : null; if (!r) return c;
  let out = c.split(r.name.toLowerCase()).join(' ');
  ROOM_ALIASES.forEach(a => { if (new RegExp('\\b' + a + '\\b').test(out)) { const rr = resolveRoom(a, null); if (rr[0] === r) out = out.replace(new RegExp('\\b' + a + '\\b'), ' '); } });
  return out;
}
/* ---------- on-device intent parser ---------- */
function localParse(text, focus) {
  const T = text.toLowerCase().replace(/colour/g, 'color'); const actions = [];
  if (/^\s*(undo|go back|revert)/.test(T)) return { actions: [{ do: 'undo' }] };
  if (/\b(tour|show me around|walk me through|guide me|walkthrough)\b/.test(T)) return { actions: [{ do: 'tour' }] };
  if (P() && P().floors.length > 1) { const m = /\b(?:show(?: me)?|go to|go|take me to|take me|head|switch to|view|open|move)\s+(?:the\s+)?((?:ground|first|second|third|fourth|top|1st|2nd|3rd)\s+floor|all floors|whole (?:house|building)|every floor|upstairs|downstairs|explode\w*)/.exec(T) || /^\s*(upstairs|downstairs|explode\w*(?: view)?)\s*$/.exec(T);
    if (m) { let f = m[1]; if (/top/.test(f)) f = P().floors.slice().sort((a, b) => b.level - a.level)[0].name; return { actions: [{ do: 'show_floor', floor: /upstairs/.test(f) ? 'up' : /downstairs/.test(f) ? 'down' : /all|whole|every/.test(f) ? 'all' : f }] }; } }
  if (/(suggest|recommend|which|what).*(color|paint)|(color|paint).*(suggest|idea|recommend)/.test(T)) { const rid = mentionRoom(T, focus); return { actions: [{ do: 'suggest_paint', room: rid || allRooms()[0]?.id }] }; }
  const clauses = T.split(/\s*(?:,(?!\d)|;|\band then\b|\bthen\b|\balso\b|\band\b(?=\s+(?:add|paint|make|change|put|place|remove|use|set|convert|turn|apply|give|design|furnish)))\s*/).filter(Boolean);
  let ctxRoom = mentionRoom(T, focus);
  clauses.forEach(c => {
    const room = mentionRoom(c, null) || ctxRoom; const a = parseClause(c, room);
    if (a) actions.push(...(Array.isArray(a) ? a : [a]));
  });
  return { actions };
}
function parseClause(c, room) {
  const amt = parseAmount(c);
  if (amt && /(under|below|within|budget|cost|less than|max)/.test(c)) return { do: 'budget', room: room || 'all', amount: amt };
  const tr = findWord(stripRoom(c, room), TRANSFORM_WORDS);
  if (tr && /(convert|turn|transform|repurpose|change|make|into|become|use .* as)/.test(c) && !/(color|paint|floor|light)/.test(c)) return { do: 'transform', room, to: tr.v };
  if (/(villa|facade|façade|exterior|elevation|outside)/.test(c) && /(modern|contemporary|villa|stone|classic|traditional|indian|brick|planner)/.test(c) && !/(paint|colou?r)/.test(c)) return { do: 'facade', style: /brick/.test(c) ? 'brick' : /(classic|traditional|indian)/.test(c) ? 'classic' : 'modern' };
  const th = findWord(c, THEME_WORDS);
  if (th && /(style|theme|look|design|vibe|feel|make|apply|go|switch|change|redesign|turn|interior|decor)/.test(c)) return { do: 'theme', name: th.v, room: room && !/(whole|entire|house|home|everything|all)/.test(c) ? room : 'all' };
  if (/(false ceiling|cove|tray ceiling|peripheral ceiling|ceiling)/.test(c)) { const tp = /cove/.test(c) ? 'cove' : /tray/.test(c) ? 'tray' : /peripheral/.test(c) ? 'peripheral' : /(plain|flat|remove|no )/.test(c) ? 'flat' : 'cove'; return { do: 'ceiling', room: room || 'all', type: tp }; }
  const col = findColor(c);
  if (col && /(exterior|outside|outer wall|facade|façade|elevation|outside of the house)/.test(c)) return { do: 'exterior', color: col.hex, name: col.name };
  if (/\broof\b/.test(c) && /(show|see|view|add|put|on)/.test(c)) return { do: 'roof', on: !/(hide|remove|off|without)/.test(c) };
  if (col && /(paint|color|wall|make|change|turn|want|shade|tone|repaint|give)/.test(c) && !/\bfloor/.test(c) && !findWord(c, FURN_WORDS.filter(f => !['shelf', 'storage'].includes(f[0])))) return { do: 'wall_color', room: room || 'all', color: col.hex, name: col.name };
  const fl = findWord(c, FLOOR_WORDS);
  if (fl && /(floor|flooring|tiles|tile|marble|wood|carpet)/.test(c) && !(/(add|place|put)\b/.test(c) && findWord(c, FURN_WORDS))) return { do: 'floor', room: room || 'all', material: fl.v };
  if (/(remove|delete|get rid|take out|clear|empty)/.test(c)) { const f = findWord(c, FURN_WORDS); if (f) return { do: 'remove', room, item: f.v }; if (/(furniture|everything|all)/.test(c)) return { do: 'remove', room, item: 'all' }; }
  if (/(add|place|put|include|need|want|bring|get me|insert)/.test(c)) { const f = findWord(c, FURN_WORDS); if (f) { const n = /\b(two|2)\b/.test(c) ? 2 : /\b(three|3)\b/.test(c) ? 3 : 1; return { do: 'add', room, item: f.v, count: n, color: col?.hex }; } }
  if (/(rearrange|re-arrange|another layout|different layout|alternative layout|shuffle)/.test(c)) return { do: 'furnish', room: room || 'all', variant: 1 + Math.floor(Math.random() * 3) };
  if (/(furnish|furniture|fill|arrange|auto ?place|set ?up)/.test(c)) return { do: 'furnish', room: room || 'all' };
  const dm = /(\d+(?:\.\d+)?)\s*(?:m\s*)?(?:x|by|×|\*)\s*(\d+(?:\.\d+)?)/.exec(c);
  if (dm && /(resize|size|make|change|dimension|extend|enlarge|shrink)/.test(c)) return { do: 'resize', room, w: +dm[1], d: +dm[2] };
  if (/(bigger|larger|enlarge|extend)/.test(c) && room) return { do: 'resize_rel', room, f: 1.15 };
  if (/(smaller|shrink|reduce)/.test(c) && room) return { do: 'resize_rel', room, f: 0.88 };
  const rn = /rename (?:the )?(.+?) (?:to|as) (.+)/.exec(c); if (rn) { const rr = resolveRoom(rn[1]); if (rr.length) return { do: 'rename', room: rr[0].id, name: rn[2].replace(/\b\w/g, x => x.toUpperCase()) }; }
  const hr = /(\d{1,2})(?::(\d\d))?\s*(am|pm)/.exec(c);
  if (hr || /(sunrise|morning|noon|midday|afternoon|evening|sunset|night|dusk|dawn)/.test(c)) { let h = hr ? (+hr[1] % 12) + (hr[3] === 'pm' ? 12 : 0) + (+hr[2] || 0) / 60 : /sunrise|dawn/.test(c) ? 6.3 : /morning/.test(c) ? 8.5 : /noon|midday/.test(c) ? 12.5 : /afternoon/.test(c) ? 15.5 : /sunset|dusk|evening/.test(c) ? 18 : 21; return { do: 'time', hour: h }; }
  if (/\blight(s|ing)?\b/.test(c)) { const on = !/(off|remove|no )/.test(c); const o = { do: 'lights', room: room || 'all' }; if (/accent|mood/.test(c)) o.accent = on; else if (/task|reading/.test(c)) o.task = on; else { o.ambient = on; if (/(more|brighter|all)/.test(c)) { o.task = on; o.accent = on; } } return o; }
  if (/\b(walk|first.person|walk ?through mode)\b/.test(c)) return { do: 'view', mode: 'walk' };
  if (/\b2d\b|floor ?plan|plan view/.test(c)) return { do: 'view', mode: '2d' };
  if (/\b3d\b|dollhouse|overview/.test(c)) return { do: 'view', mode: '3d' };
  if (/(wasted|unused|clearance|space|crowd|fit|walking)/.test(c)) return [{ do: 'open', panel: 'space' }, ...(room ? [{ do: 'goto', room }] : [])];
  if (/(cost|price|estimate|expens|how much|budget)/.test(c)) return { do: 'open', panel: 'budget' };
  if (/(sun|daylight|ventilat|airflow|breeze|natural light)/.test(c)) return { do: 'open', panel: 'light' };
  if (/(structur|validat|load.bearing|check (my )?plan|connectivity)/.test(c)) return { do: 'open', panel: 'arch' };
  if (/report/.test(c)) return { do: 'open', panel: 'report' };
  if (/compar/.test(c)) return { do: 'open', panel: 'compare' };
  if (/(go to|show|take me|visit|view|look at|zoom)/.test(c) && room) return { do: 'goto', room };
  return null;
}

/* ---------- action executor ---------- */
function execActions(actions, focus) {
  const done = [], fail = []; let needBuild = false, structural = false;
  if (!actions.length) return { done, fail };
  const mutating = actions.some(a => !['tour', 'goto', 'view', 'open', 'time', 'suggest_paint', 'undo', 'show_floor', 'roof', 'cutaway', 'save_variant'].includes(a.do));
  if (mutating) commit('AI: ' + actions.map(a => a.do).join(', '));
  const roomsOf = a => a.room === 'all' ? allRooms() : resolveRoom(a.room, focus);
  actions.forEach(a => {
    try {
      const rooms = roomsOf(a);
      const rn = rooms.length === allRooms().length && rooms.length > 1 ? 'every room' : rooms.map(r => r.name).join(', ');
      switch (a.do) {
        case 'undo': undo(); done.push('Undid the last change.'); break;
        case 'wall_color': { const hex = /^#/.test(a.color) ? a.color : (NAMED_COLORS[String(a.color).toLowerCase()] || findColor(String(a.color).toLowerCase())?.hex); if (!hex || !rooms.length) { fail.push('wall colour'); break; } rooms.forEach(r => r.wall = hex); done.push(`Painted ${rn} ${a.name || hex}.`); needBuild = true; break; }
        case 'floor': { const k = FLOORS[a.material] ? a.material : findWord(String(a.material).toLowerCase(), FLOOR_WORDS)?.v; if (!k || !rooms.length) { fail.push('flooring'); break; } rooms.forEach(r => r.floor = k); done.push(`Changed flooring in ${rn} to ${FLOORS[k].label}.`); needBuild = true; break; }
        case 'add': { const type = CATALOG[a.item] ? a.item : findWord(String(a.item).toLowerCase(), FURN_WORDS)?.v; const r = rooms[0]; if (!type || !r) { fail.push('add ' + a.item); break; } let n = 0; for (let i = 0; i < (a.count || 1); i++) { const fr = floorOfRoom(r); let it = null; for (const s of sideScores(r, fr)) { it = placeOnWall(r, fr, type, s); if (it) break; } if (!it) it = placeFree(r, fr, type); if (it) { if (a.color) it.color = a.color; r.furniture.push(it); n++; if (/desk/.test(type)) addChairFor(r, fr, it, type === 'gaming_desk' ? 'gaming_chair' : 'office_chair'); } } if (n) { done.push(`Added ${n > 1 ? n + ' × ' : 'a '}${CATALOG[type].label.toLowerCase()} to ${r.name}.`); needBuild = true; } else fail.push(`There is no free spot for a ${CATALOG[type].label.toLowerCase()} in ${r.name} (try the Fit Checker in Space Analyzer)`); break; }
        case 'remove': { const r = rooms[0]; if (!r) { fail.push('remove'); break; } const before = r.furniture.length; if (a.item === 'all') r.furniture = []; else { const type = CATALOG[a.item] ? a.item : findWord(String(a.item).toLowerCase(), FURN_WORDS)?.v; const i = r.furniture.findIndex(f => f.type === type || f.type.startsWith(String(type).split('_')[0])); if (i >= 0) r.furniture.splice(i, 1); } if (r.furniture.length < before) { done.push(`Removed ${a.item === 'all' ? 'all furniture' : CATALOG[a.item]?.label.toLowerCase() || a.item} from ${r.name}.`); needBuild = true; } else fail.push(`no ${a.item} in ${r.name}`); break; }
        case 'furnish': { rooms.forEach(r => autoFurnish(r, floorOfRoom(r), a.variant || 0)); done.push(`${a.variant ? 'Re-arranged' : 'Furnished'} ${rn} with ${rooms.reduce((s, r) => s + r.furniture.length, 0)} pieces, keeping door swings and walkways clear.`); needBuild = true; break; }
        case 'theme': { const nm = THEMES[a.name] ? a.name : findWord(String(a.name).toLowerCase(), THEME_WORDS)?.v; if (!nm) { fail.push('theme'); break; } applyTheme(nm, a.room === 'all' || !rooms.length || rooms.length === allRooms().length ? null : rooms); done.push(`Applied the ${nm} theme to ${a.room === 'all' || rooms.length === allRooms().length ? 'the whole home' : rn} — ${THEMES[nm].desc}`); needBuild = true; break; }
        case 'transform': { const r = rooms[0]; const to = ROOM_TYPES[a.to] ? a.to : findWord(String(a.to).toLowerCase(), TRANSFORM_WORDS)?.v; if (!r || !to) { fail.push('transform'); break; } const oldName = r.name; const res = transformRoom(r, to); done.push(`Transformed ${oldName} into a ${ROOM_TYPES[to].label} (${r.furniture.length} new pieces). Estimated cost ${inr(res.before)} → ${inr(res.after)}.`); needBuild = true; break; }
        case 'rename': { const r = rooms[0]; if (!r || !a.name) { fail.push('rename'); break; } r.name = String(a.name).slice(0, 30); done.push(`Renamed to ${r.name}.`); needBuild = true; break; }
        case 'resize': case 'resize_rel': { const r = rooms[0]; if (!r) { fail.push('resize'); break; } const w = a.do === 'resize' ? +a.w : r2(r.w * a.f), d = a.do === 'resize' ? +a.d : r2(r.d * a.f); if (!(w > 0.8 && d > 0.8 && w < 30 && d < 30)) { fail.push('resize'); break; } const ext = isExteriorPoint(floorOfRoom(r), 'v', r.x + r.w, r.y + r.d / 2) || isExteriorPoint(floorOfRoom(r), 'h', r.y + r.d, r.x + r.w / 2); r.w = snap(w); r.d = snap(d); r.furniture.forEach(it => { it.x = clamp(it.x, r.x + 0.3, r.x + r.w - 0.3); it.y = clamp(it.y, r.y + 0.3, r.y + r.d - 0.3); }); done.push(`Resized ${r.name} to ${r.w} × ${r.d} m.`); if (ext) { structural = true; S.structuralLog.push(`${r.name} was resized through an outer wall — external walls are usually load-bearing; get a structural engineer to review before construction.`); } needBuild = true; break; }
        case 'budget': { const rs = rooms.length ? rooms : allRooms(); const res = optimizeBudget(rs, +a.amount); done.push(res.ok ? `Optimised ${rs.length === allRooms().length ? 'the home' : rn} to ${inr(res.end)} (from ${inr(res.start)}), within your ${inr(a.amount)} budget. ${res.steps.length} swaps made — see Budget panel.` : `Brought ${rn} down from ${inr(res.start)} to ${inr(res.end)} — the leanest version still exceeds ${inr(a.amount)}.`); S.lastOptimize = res; needBuild = true; break; }
        case 'ceiling': { const tp = CEILINGS[a.type] ? a.type : 'cove'; rooms.forEach(r => r.ceiling = tp); done.push(`Set ${CEILINGS[tp].label.toLowerCase()} in ${rn}.`); needBuild = true; break; }
        case 'lights': { rooms.forEach(r => { r.lights = r.lights || {}; ['ambient', 'task', 'accent'].forEach(k => { if (typeof a[k] === 'boolean') r.lights[k] = a[k]; }); }); done.push(`Updated lighting in ${rn}. Slide the time to evening to see it.`); needBuild = true; break; }
        case 'time': setHour(+a.hour); done.push(`Simulating sunlight at ${fmtHour(+a.hour)}.`); break;
        case 'tour': setTimeout(() => startTour(), 300); done.push('Starting your animated home tour…'); break;
        case 'goto': { const r = rooms[0]; if (r) { setTimeout(() => focusRoom(r), 100); done.push(`Taking you to ${r.name}.`); } break; }
        case 'view': setView(a.mode); done.push(`Switched to ${a.mode === 'walk' ? 'walk-through' : a.mode.toUpperCase()} view.`); break;
        case 'show_floor': { const pj = P(); const q = String(a.floor || '').toLowerCase(); if (/all|whole|every|building/.test(q) || /explode/.test(q)) { S.showAllFloors = true; S.explode = /explode/.test(q); rebuild(); renderFloorSeg(); fitView(true); done.push(S.explode ? 'Pulled the floors apart so you can see every level.' : 'Showing the whole building.'); break; }
          const lv = parseLevel(q); const f = pj.floors.find(x => x.name.toLowerCase() === q) || pj.floors.find(x => q && x.name.toLowerCase().includes(q.replace(/ floor$/, ''))) || (lv != null ? pj.floors.find(x => x.level === lv) : null) || (/up/.test(q) ? floorAbove(FL()) : /down/.test(q) ? floorBelow(FL()) : null);
          if (!f) { fail.push('floor "' + a.floor + '"'); break; } pj.activeFloor = pj.floors.indexOf(f); S.showAllFloors = false; S.sel = null; rebuild(); renderFloorSeg(); if (S.view !== '2d') fitView(true); done.push(`Showing the ${f.name}.`); break; }
        case 'open': openPanel(a.panel); done.push(`Opened ${({ space: 'Space Analyzer', budget: 'Budget Estimator', light: 'Light & Ventilation', arch: 'Architectural checks', report: 'Home Decision Report', compare: 'Design Comparison', design: 'Interior Designer' })[a.panel] || a.panel}.`); break;
        case 'facade': { const k = String(a.style || '').toLowerCase(), key = FACADES[k] ? k : /brick/.test(k) ? 'brick' : /(classic|indian|traditional)/.test(k) ? 'classic' : 'modern'; P().facade = key; P().exterior = null; done.push(`Exterior changed to ${FACADES[key].label} — ${FACADES[key].desc.toLowerCase()}.`); needBuild = true; break; }
        case 'exterior': { const hex = /^#/.test(a.color) ? a.color : (NAMED_COLORS[String(a.color).toLowerCase()] || findColor(String(a.color).toLowerCase())?.hex); if (!hex) { fail.push('exterior colour'); break; } P().exterior = hex; done.push(`Painted the outside of the house ${a.name || hex}.`); needBuild = true; break; }
        case 'roof': { S.roof = a.on !== false; if (S.roof) S.cutaway = false; $('#t-roof')?.classList.toggle('on', S.roof); $('#t-cut')?.classList.toggle('on', S.cutaway); rebuild(); done.push(S.roof ? 'Showing the finished roof terrace.' : 'Roof hidden so you can see inside.'); break; }
        case 'cutaway': { S.cutaway = a.on !== false; if (S.cutaway) S.roof = false; $('#t-cut')?.classList.toggle('on', S.cutaway); $('#t-roof')?.classList.toggle('on', S.roof); rebuild(); done.push(S.cutaway ? 'Cut the walls down so you can see every room.' : 'Walls back to full height.'); break; }
        case 'save_variant': { setTimeout(() => { const i = $('#var-name'); if (i) i.value = a.name || ''; ACT['save-variant'](); }, 50); done.push(`Saved this design as a variant${a.name ? ' “' + a.name + '”' : ''} — compare it in the Compare panel.`); break; }
        case 'suggest_paint': { const r = rooms[0] || allRooms()[0]; S.paintChips = { room: r.id, list: paintSuggestions(r) }; done.push(`Here are paint ideas for ${r.name} — tap one to apply:`); break; }
        default: fail.push(a.do);
      }
    } catch (e) { console.error(e); fail.push(a.do); }
  });
  if (needBuild) { rebuild(); save(); }
  return { done, fail, structural };
}

function homeSummaryForAI(focus) {
  const pj = P(), mf = pj.floors.length > 1, cost = homeCost(), built = allRooms().filter(r => !isYard(r));
  const rooms = allRooms().map(r => { let L = null, c = null; try { L = analyzeLight(r); } catch (e) { } try { c = roomCost(r); } catch (e) { }
    return { id: r.id, name: r.name, type: r.type, ...(mf ? { floor: floorOfRoom(r).name } : {}), size: `${r.w}x${r.d}m`, area_m2: r2(area(r)), wall: roomWall(r), flooring: roomFloorKey(r), ceiling: roomCeiling(r),
      ...(L && !isYard(r) ? { daylight: L.rating, windows: L.wins.length, facing: (L.dirs || []).join('/') || null } : {}), cost_inr: c ? Math.round(c.total) : null, items: r.furniture.map(i => i.type).join(',') }; });
  let checks = []; try { checks = archChecks(FL()).slice(0, 5).map(c => `${c.t}: ${c.d}`); } catch (e) { }
  const A = built.reduce((s, r) => s + area(r), 0);
  return JSON.stringify({ name: pj.name, theme: pj.theme,
    totals: { rooms: built.length, built_area_m2: r2(A), built_area_sqft: Math.round(A * SQFT), estimate_inr: Math.round(cost.total), breakdown_inr: { furniture: Math.round(cost.furniture), flooring: Math.round(cost.flooring), paint: Math.round(cost.paint), lighting: Math.round(cost.lighting), false_ceiling: Math.round(cost.ceiling), decor: Math.round(cost.decor) } },
    budget_inr: S.prefs.budget, over_budget_by_inr: Math.max(0, Math.round(cost.total - S.prefs.budget)),
    ...(mf ? { floors: pj.floors.map(f => ({ name: f.name, level: f.level, rooms: f.rooms.length, stairs_up: !!(f.stairs && f.stairs.length && floorAbove(f)) })), viewing_floor: FL().name } : {}),
    view: S.view, time_of_day: fmtHour(S.hour), exterior_colour: extColor(), roof_shown: !!S.roof, cutaway: !!S.cutaway,
    prefs: { family: S.prefs.family, pets: S.prefs.pets, kids: S.prefs.kids, wfh: S.prefs.wfh, colors: S.prefs.colors, style: S.prefs.style },
    focus_room: focus ? focus.id : null, design_checks: checks, rooms });
}
const ACTION_DOC = `Actions you can return (use exact keys; "room" is a room id from the state, or "all"):
{"do":"wall_color","room":"..","color":"#hex","name":"colour name"}
{"do":"floor","room":"..","material":"${Object.keys(FLOORS).join('|')}"}
{"do":"add","room":"..","item":"${Object.keys(CATALOG).join('|')}","count":1}
{"do":"remove","room":"..","item":"<catalog item>|all"}
{"do":"furnish","room":"..","variant":0}
{"do":"theme","name":"${Object.keys(THEMES).join('|')}","room":"..|all"}
{"do":"transform","room":"..","to":"${Object.keys(ROOM_TYPES).join('|')}"}
{"do":"rename","room":"..","name":".."}
{"do":"resize","room":"..","w":metres,"d":metres}
{"do":"budget","room":"..|all","amount":rupees}
{"do":"ceiling","room":"..|all","type":"flat|peripheral|cove|tray"}
{"do":"lights","room":"..|all","ambient":true,"task":true,"accent":true}
{"do":"time","hour":0-24}
{"do":"tour"} {"do":"goto","room":".."} {"do":"view","mode":"3d|2d|walk"} {"do":"show_floor","floor":"<floor name>|all|explode"}
{"do":"open","panel":"design|space|budget|light|transform|arch|compare|report"}
{"do":"suggest_paint","room":".."}
{"do":"exterior","color":"#hex","name":"colour name"} (outside walls of the house)
{"do":"facade","style":"modern|classic|brick"} (exterior style: modern villa = white + stacked stone + timber + dark roof overhang; classic Indian = plaster, plinth, chajjas, parapet; brick & white)
{"do":"roof","on":true|false} {"do":"cutaway","on":true|false}
{"do":"save_variant","name":".."} (snapshot the current design for comparison)`;
const chatHistory = []; // kept for compatibility; the real memory lives in the project (S.project.chat)
function chatMemory() { const pj = P(); if (!pj) return chatHistory; if (!Array.isArray(pj.chat)) pj.chat = []; return pj.chat; }
function remember(role, text) { const m = chatMemory(); m.push({ role, text: String(text).slice(0, 1200), at: Date.now() }); if (m.length > 40) m.splice(0, m.length - 40); }
async function askAria(text, focus) {
  let parsed = null, via = 'on-device';
  const history = chatMemory().slice(-12).map(m => ({ role: m.role === 'aria' ? 'model' : 'user', text: m.text }));
  if (aiOn()) {
    try {
      const j = await API.req('/api/assistant', { body: { text, home: homeSummaryForAI(focus), action_doc: ACTION_DOC, history }, timeout: 90000 });
      parsed = j; via = j.via || modelLabel();
    } catch (e) { console.warn('AI failed', e); parsed = null; S.lastAIError = e.message; }
  }
  let qa = '';
  if (!parsed) { parsed = localParse(text, focus); qa = answerQuestion(text, focus);
    // a question ("how much does the kitchen cost?") gets an answer; opening the matching panel is just a bonus
    if (qa && (parsed.actions || []).every(a => ['open', 'goto'].includes(a.do))) parsed.reply = qa + ((parsed.actions || []).some(a => a.do === 'open') ? ' (I\'ve opened the matching panel too.)' : ''); }
  const actions = Array.isArray(parsed.actions) ? parsed.actions.filter(a => a && a.do).slice(0, 10) : [];
  const res = execActions(actions, focus);
  let reply = parsed.reply || '';
  if (!reply) {
    if (res.done.length) reply = res.done.join(' ');
    else reply = answerQuestion(text, focus) || helpReply(text);
  } else if (res.done.length && via === 'on-device' && !qa) reply += ' ' + res.done.join(' ');
  if (res.fail.length && !res.done.length && actions.length) reply += ` (I couldn't do: ${res.fail.join('; ')}.)`;
  if (res.structural) reply += ' ⚠️ That change touches an outer wall — flagged for structural review.';
  remember('user', text); remember('aria', reply); save();
  return { reply, via, actions, res };
}
/* on-device answers to questions about the home, from the same numbers the panels show */
function answerQuestion(text, focus) {
  const T = text.toLowerCase(); const rs = allRooms(), built = rs.filter(r => !isYard(r)); if (!rs.length) return '';
  const room = (() => { const id = mentionRoom(T, focus); return id ? findRoom(id) : null; })();
  const count = t => built.filter(r => t.includes(r.type)).length;
  if (/how many|number of|count/.test(T)) {
    if (/bed ?room/.test(T)) { const n = count(['bedroom', 'master', 'guest']); return `There ${n === 1 ? 'is' : 'are'} ${n} bedroom${n === 1 ? '' : 's'}${n ? ': ' + built.filter(r => ['bedroom', 'master', 'guest'].includes(r.type)).map(r => r.name).join(', ') : ''}.`; }
    if (/bath|toilet|washroom/.test(T)) { const n = count(['bathroom']); return `There ${n === 1 ? 'is' : 'are'} ${n} bathroom${n === 1 ? '' : 's'}.`; }
    if (/floor|storey|stor(y|ies)|level/.test(T)) return `The home has ${P().floors.length} floor${P().floors.length > 1 ? 's' : ''}: ${P().floors.map(f => `${f.name} (${f.rooms.length} rooms)`).join(', ')}.`;
    if (/window/.test(T)) { const n = P().floors.reduce((s, f) => s + f.windows.length, 0); return `There are ${n} windows in total.`; }
    if (/door/.test(T)) { const n = P().floors.reduce((s, f) => s + f.doors.length, 0); return `There are ${n} doors in total.`; }
    if (/room/.test(T)) return `${built.length} rooms: ${built.map(r => r.name).join(', ')}.`;
  }
  if (/(area|size|big|sq|square|carpet)/.test(T) && room) return `${room.name} is ${room.w} × ${room.d} m — ${r2(area(room))} m² (${Math.round(area(room) * SQFT)} sq ft).`;
  if (/(total|whole|overall|built).*(area|size|sq)|(area|size).*(home|house|flat)/.test(T)) { const A = built.reduce((s, r) => s + area(r), 0); return `The built-up area is ${r2(A)} m² (${Math.round(A * SQFT).toLocaleString('en-IN')} sq ft) across ${built.length} rooms${P().floors.length > 1 ? ' on ' + P().floors.length + ' floors' : ''}.`; }
  if (/(biggest|largest)/.test(T)) { const r = built.slice().sort((a, b) => area(b) - area(a))[0]; return `The largest room is ${r.name}: ${r.w} × ${r.d} m (${r2(area(r))} m²).`; }
  if (/smallest/.test(T)) { const r = built.slice().sort((a, b) => area(a) - area(b))[0]; return `The smallest room is ${r.name}: ${r.w} × ${r.d} m (${r2(area(r))} m²).`; }
  if (/(cost|price|expens|how much|budget|spend|₹|rupee)/.test(T)) {
    if (room) { const c = roomCost(room); return `${room.name} is estimated at ${inr(c.total)}: furniture ${inr(c.furniture)}, flooring ${inr(c.flooring)}, paint ${inr(c.paint)}, lighting ${inr(c.lighting)}, ceiling ${inr(c.ceiling)}, decor ${inr(c.decor)} (illustrative).`; }
    const c = homeCost(), b = S.prefs.budget; const top = c.rooms.slice().sort((x, y) => y.c.total - x.c.total).slice(0, 3).map(x => `${x.r.name} ${inr(x.c.total)}`).join(', ');
    return `The design is estimated at ${inr(c.total)} (illustrative) — ${c.total > b ? `${inr(c.total - b)} over` : `${inr(b - c.total)} under`} your ${inr(b)} budget. Biggest items: ${top}. Say “fit the home under ₹${b >= 100000 ? r2(b / 100000) + ' lakh' : Math.round(b / 1000) + 'k'}” and I'll trim it.`;
  }
  if (/(light|sun|bright|dark|daylight)/.test(T)) {
    const L = built.map(r => ({ r, L: analyzeLight(r) }));
    if (room) { const x = analyzeLight(room); return `${room.name} gets ${x.rating.toLowerCase()} daylight from ${x.wins.length} window${x.wins.length === 1 ? '' : 's'}${x.dirs.length ? ' facing ' + x.dirs.join(' and ') : ''}. ${x.sugg[0] || ''}`; }
    const best = L.slice().sort((a, b) => b.L.score - a.L.score)[0], dark = L.filter(x => ['Limited', 'Poor', 'No daylight'].includes(x.L.rating) && !['hall', 'closet', 'utility'].includes(x.r.type));
    return `${best.r.name} is the brightest room. ${dark.length ? `Rooms short on daylight: ${dark.map(x => x.r.name).join(', ')} — open the Light panel for fixes.` : 'Every main room gets reasonable daylight.'}`;
  }
  if (/(parking|car|garden|lawn|park)/.test(T)) { const y = rs.filter(isYard); return y.length ? `Outside, the plan has ${y.map(r => `${r.name} (${r.w} × ${r.d} m)`).join(' and ')}.` : 'The plan doesn\'t show a parking area or garden. You can draw one in the 2D editor and set its type to Car Parking or Garden.'; }
  if (/(theme|style)/.test(T) && /(what|which|current)/.test(T)) return `The home is styled ${P().theme}. Try “make it Scandinavian” to switch.`;
  if (/(problem|issue|wrong|check|mistake)/.test(T)) { const c = archChecks(FL()); return c.length ? `I found ${c.length} thing${c.length > 1 ? 's' : ''} to look at: ${c.slice(0, 3).map(x => x.t.toLowerCase()).join('; ')}. Open Structure for details.` : 'No layout problems found on this floor.'; }
  return '';
}
function helpReply(text) {
  if (/(hi|hello|hey|namaste)\b/i.test(text)) return `Namaste! I'm Aria. I can redesign your home for you — try “paint the master bedroom sage green”, “convert the study into a gaming room”, “design my bedroom under ₹30,000” or “give me a tour”.`;
  if (/how much|cost|price/i.test(text)) { const c = homeCost(); return `Your current design is estimated at ${inr(c.total)} (illustrative): furniture ${inr(c.furniture)}, flooring ${inr(c.flooring)}, painting ${inr(c.paint)}, lighting ${inr(c.lighting)}, false ceiling ${inr(c.ceiling)}, decor ${inr(c.decor)}.`; }
  if (/(biggest|largest|area|size)/i.test(text)) { const rs = allRooms().slice().sort((a, b) => area(b) - area(a)); return `Total carpet area is ${r2(rs.reduce((s, r) => s + area(r), 0))} m². Largest: ${rs[0].name} (${rs[0].w} × ${rs[0].d} m, ${r2(area(rs[0]))} m²).`; }
  return `I can change colours, flooring, furniture, themes, room purposes, lighting, ceilings and budgets — or take you on a tour. Try: “make the living room Japandi”, “add a bookshelf to the study”, “Italian marble floor in the living room”, or “show me sunset light”.${aiOn() ? '' : ' Connect the Qwen AI in Settings for free-form conversation.'}`;
}

/* ---------- tour narration ---------- */
function roomFacts(r) {
  const L = analyzeLight(r), Sx = analyzeSpace(r), c = roomCost(r);
  return { L, Sx, c, line: `${r.name}: ${r.w}×${r.d} m (${r2(area(r))} m²), ${ROOM_TYPES[r.type].label}; walls ${roomWall(r)}, floor ${FLOORS[roomFloorKey(r)].label}; furniture: ${r.furniture.map(i => CATALOG[i.type].label).join(', ') || 'none'}; daylight ${L.rating}${L.dirs.length ? ' (' + L.dirs.join('/') + '-facing)' : ''}, ventilation ${L.vent}; space ${Sx.status}, ${Sx.issues[0] || 'no clearance issues'}${Sx.corner ? `; unused corner ${r2(Sx.corner.w)}×${r2(Sx.corner.d)} m` : ''}; est. cost ${inr(c.total)}` };
}
function templateNarration(r) {
  const { L, Sx, c } = roomFacts(r); const t = ROOM_TYPES[r.type].label.toLowerCase();
  const open = { living: `Welcome to the ${r.name} — the social heart of your home.`, master: `This is the ${r.name}, your private retreat.`, bedroom: `Here's ${r.name}.`, kitchen: `Now the ${r.name}, where the action happens.`, dining: `This is the ${r.name}.`, bathroom: `The ${r.name}.`, balcony: `Step out to the ${r.name} for some fresh air.`, study: `This is the ${r.name}, set up for focus.`, office: `Your ${r.name}, built for productive work-from-home days.`, gaming: `Welcome to the ${r.name}!` }[r.type] || `This is the ${r.name}.`;
  const size = `It measures ${r.w} by ${r.d} metres — about ${Math.round(area(r) * SQFT)} square feet.`;
  const light = L.wins.length ? `It gets ${L.rating.toLowerCase()} daylight from the ${L.dirs.join(' and ')}${L.dirs.some(d => d.includes('E')) ? ', lovely in the mornings' : L.dirs.some(d => d.includes('W')) ? ', so afternoons run warm' : ''}.` : `There's no outside window here, so good artificial lighting and an exhaust matter.`;
  const furn = r.furniture.length ? `I've placed ${r.furniture.slice(0, 3).map(i => 'a ' + CATALOG[i.type].label.toLowerCase()).join(', ')}${r.furniture.length > 3 ? ` and ${r.furniture.length - 3} more pieces` : ''}, on ${FLOORS[roomFloorKey(r)].label.toLowerCase()}.` : `It's empty right now — ask me to furnish it.`;
  const tip = Sx.corner ? `Tip: the ${r2(Sx.corner.w)} by ${r2(Sx.corner.d)} metre corner is unused — it would make a great reading nook or study corner.` : Sx.issues[0] ? `One thing to watch: ${Sx.issues[0]}` : L.sugg[0] ? L.sugg[0] : `Walking clearance looks comfortable.`;
  return `${open} ${size} ${light} ${furn} ${tip} Estimated interior cost: ${inr(c.total)}.`;
}
async function serverNarrations(order) {
  const household = `${S.prefs.family} people${S.prefs.kids ? ', kids' : ''}${S.prefs.pets ? ', pets' : ''}${S.prefs.wfh ? ', works from home' : ''}`;
  return API.req('/api/narration', { body: { theme: P().theme, household, floors: P().floors.map(f => f.name), rooms: order.map(r => ({ id: r.id, floor: floorOfRoom(r).name, facts: roomFacts(r).line })) }, timeout: 120000 });
}
async function serverTourOrder() {
  if (!S.backendOK) return null;
  try { const j = await API.req('/api/tour', { body: { project: projectGeometry() }, timeout: 3000 }); const rs = (j.order || []).map(findRoom).filter(Boolean); return rs.length ? rs : null; } catch (e) { return null; }
}

/* ---------- inspiration image → style ---------- */
function extractPalette(img, k = 5) {
  const c = document.createElement('canvas'); const s = 64 / Math.max(img.width, img.height); c.width = Math.max(1, img.width * s | 0); c.height = Math.max(1, img.height * s | 0);
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data; const px = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  let cents = px.filter((_, i) => i % Math.floor(px.length / k) === 0).slice(0, k).map(p => p.slice());
  for (let it = 0; it < 8; it++) { const acc = cents.map(() => [0, 0, 0, 0]); px.forEach(p => { let bi = 0, bd = 1e9; cents.forEach((c, i) => { const dd = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } }); const a = acc[bi]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; }); cents = acc.map((a, i) => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3], a[3]] : cents[i]); }
  return cents.sort((a, b) => (b[3] || 0) - (a[3] || 0)).map(c => rgbToHex(c[0] / 255, c[1] / 255, c[2] / 255));
}
function closestTheme(pal) {
  let best = null; Object.entries(THEMES).forEach(([n, t]) => { const tp = [t.walls[0], t.wood, t.fabric, t.accent].map(hexToRgb); let d = 0; pal.slice(0, 4).map(hexToRgb).forEach(p => { d += Math.min(...tp.map(q => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2)); }); if (!best || d < best.d) best = { n, d }; });
  return best.n;
}
async function analyzeInspiration(url) {
  const img = await loadImage(url); const pal = extractPalette(img);
  let res = { style: closestTheme(pal), palette: pal, via: 'on-device colour analysis' };
  const light = pal.slice().sort((a, b) => hexToRgb(b).reduce((s, v) => s + v, 0) - hexToRgb(a).reduce((s, v) => s + v, 0));
  res.wall = mixHex(light[0], '#f4f1ea', 0.35); res.accent = pal.find(h => { const [r, g, b] = hexToRgb(h); return Math.max(r, g, b) - Math.min(r, g, b) > 0.18; }) || pal[1];
  if (aiOn()) {
    try {
      const j = await API.req('/api/inspiration', { body: { image: await shrinkImage(url, 900), styles: Object.keys(THEMES), floors: Object.keys(FLOORS), finishes: Object.keys(WOOD_FINISHES) }, timeout: 90000 });
      ['style', 'wall', 'accent', 'floor', 'finish', 'description'].forEach(k => { if (j[k]) res[k] = j[k]; }); res.via = j.via || modelLabel();
    } catch (e) { res.via += ` (${modelLabel()} unavailable)`; }
  }
  return res;
}

/* ===================== 3D SCENE BUILDER & INTERACTION ===================== */
let E = null, CTL = null, lastT = 0, buildAnim = null;
const floorGap = () => (S.explode && !S.touring && !(CTL && CTL.mode === 'walk')) ? 4.2 : 0;
const floorY = f => { const pj = S.project; let y = 0; if (pj) pj.floors.forEach(o => { if (o.level < f.level) y += o.height + 0.25; }); return y + Math.max(0, f.level) * floorGap(); };
const showFloorIn3D = (f, act) => f.level <= act.level || ((S.showAllFloors || S.touring || (CTL && CTL.mode === 'walk')) && !S.cutaway);
/* rectangle minus holes → list of rectangles */
function rectMinus(r, holes) {
  let out = [r];
  holes.forEach(h => { const nx = []; out.forEach(p => { const ox0 = Math.max(p.x, h.x), oy0 = Math.max(p.y, h.y), ox1 = Math.min(p.x + p.w, h.x + h.w), oy1 = Math.min(p.y + p.d, h.y + h.d);
    if (ox1 - ox0 <= 0.01 || oy1 - oy0 <= 0.01) { nx.push(p); return; }
    if (oy0 > p.y) nx.push({ x: p.x, y: p.y, w: p.w, d: oy0 - p.y }); if (oy1 < p.y + p.d) nx.push({ x: p.x, y: oy1, w: p.w, d: p.y + p.d - oy1 });
    if (ox0 > p.x) nx.push({ x: p.x, y: oy0, w: ox0 - p.x, d: oy1 - oy0 }); if (ox1 < p.x + p.w) nx.push({ x: ox1, y: oy0, w: p.x + p.w - ox1, d: oy1 - oy0 }); }); out = nx.filter(q => q.w > 0.01 && q.d > 0.01); });
  return out;
}
const edgeOnWall = (f, o, c, a, b) => wallLines(f).some(L => L.o === o && Math.abs(L.c - c) < 0.16 && Math.min(L.b, b) - Math.max(L.a, a) > (b - a) * 0.6);
function buildStairs(st, f, yOff) {
  const ff = f.height + 0.25, n = stairRisers(f), rise = ff / n, runZ = stairRun(st) === 'z', dir = stairDir(st), L = stairLen(st), Wd = stairWidth(st), step = L / n;
  const g = E.addGroup('stairs:' + st.id, { kind: 'misc', x: st.x, y: yOff + FLOOR_TOP, z: st.y });
  for (let i = 0; i < n; i++) {
    const u = (-L / 2 + step * (i + 0.5)) * dir, h = rise * (i + 1);
    E.part(g, Object.assign({ geo: runZ ? E.geo('box', Wd, h - 0.03, step) : E.geo('box', step, h - 0.03, Wd), color: '#d8cdbb', pattern: 1, patScale: 0.2, color2: '#b9a88e' }, runZ ? { z: u } : { x: u }));
    E.part(g, Object.assign({ geo: runZ ? E.geo('box', Wd, 0.03, step + 0.02) : E.geo('box', step + 0.02, 0.03, Wd), y: h - 0.03, color: '#9b7652', pattern: 1, patScale: 0.3, color2: '#7d5c3d' }, runZ ? { z: u } : { x: u }));
  }
  const hyp = Math.hypot(L, ff), ang = Math.atan2(ff, L) * dir;
  [-1, 1].forEach(sd => {
    const edge = runZ ? st.x + sd * Wd / 2 : st.y + sd * Wd / 2; const ft = stairFoot(st);
    if (edgeOnWall(f, runZ ? 'v' : 'h', edge, runZ ? ft.y : ft.x, runZ ? ft.y + ft.d : ft.x + ft.w)) return;
    const o = sd * (Wd / 2 - 0.04);
    E.part(g, runZ ? { geo: E.geo('box', 0.045, 0.05, hyp), x: o, y: ff / 2 + 0.88, rx: -ang, color: '#3b2f25', cast: false } : { geo: E.geo('box', hyp, 0.05, 0.045), z: o, y: ff / 2 + 0.88, rz: ang, color: '#3b2f25', cast: false });
    for (let i = 1; i < n; i += 2) { const u = (-L / 2 + step * (i + 0.5)) * dir; E.part(g, Object.assign({ geo: E.geo('box', 0.022, 0.9, 0.022), y: rise * (i + 1), color: '#4a4a4a', cast: false }, runZ ? { x: o, z: u } : { z: o, x: u })); }
  });
}
/* glass balustrade around the stair opening on the floor above (open on the arrival side) */
function buildStairwell(st, f, yOff) {
  const ft = stairFoot(st), runZ = stairRun(st) === 'z', dir = stairDir(st); const g = E.addGroup('well:' + st.id, { kind: 'misc', x: 0, y: yOff + FLOOR_TOP, z: 0 });
  const edges = [['h', ft.y, ft.x, ft.x + ft.w, runZ && dir < 0], ['h', ft.y + ft.d, ft.x, ft.x + ft.w, runZ && dir > 0], ['v', ft.x, ft.y, ft.y + ft.d, !runZ && dir < 0], ['v', ft.x + ft.w, ft.y, ft.y + ft.d, !runZ && dir > 0]];
  edges.forEach(([o, c, a, b, arrival]) => {
    if (arrival || edgeOnWall(f, o, c, a, b)) return; const len = b - a, mid = (a + b) / 2;
    const at = (w, h, d, y, extra) => Object.assign(o === 'h' ? { geo: E.geo('box', w, h, d), x: mid, z: c } : { geo: E.geo('box', d, h, w), x: c, z: mid }, { y }, extra);
    E.part(g, at(len, 0.86, 0.02, 0.06, { color: '#bfe0ee', alpha: 0.25, cast: false }));
    E.part(g, at(len + 0.04, 0.05, 0.06, 0.92, { color: '#3b2f25' }));
    [a + 0.02, b - 0.02].forEach(t => E.part(g, Object.assign(o === 'h' ? { x: t, z: c } : { x: c, z: t }, { geo: E.geo('box', 0.04, 0.95, 0.04), y: 0, color: '#3b2f25' })));
  });
  // slab edge band inside the opening
  E.part(g, { geo: E.geo('box', ft.w, 0.02, 0.02), x: ft.x + ft.w / 2, y: -0.02, z: ft.y, color: '#bdb5a8', cast: false });
}
function palette(room, it) {
  const th = roomTheme(room);
  const wood = it && it.finish ? WOOD_FINISHES[it.finish] : th.wood;
  return {
    wood, headboard: (it && it.color) || mixHex(th.fabric, th.wood, 0.25), fabric: (it && it.color) || th.fabric, fabric2: mixHex((it && it.color) || th.fabric, '#ffffff', 0.18), seat: (it && it.color) || mixHex(th.fabric, '#333333', 0.35),
    accent: th.accent, metal: th.metal, white: '#f3f2ee', mattress: '#f4f1ea', glass: '#c9e6f0', glass2: '#9fc3cf', screen: '#121418', plant: '#4f7d3c', plant2: '#6a9a48', pot: '#b56a45',
    stone: room.type === 'kitchen' ? (th.floor === 'marble' ? '#ece8e0' : '#2e2d2c') : '#3a3836', mirror: '#d7e6ec', rug: (it && it.color) || th.rug, rug2: mixHex((it && it.color) || th.rug, '#ffffff', 0.2), lamp: '#f6e7c8', dark: '#2b2b2d', ceramic: '#f6f6f4',
    cabinet: th.name === 'Luxury' ? '#efe9df' : mixHex(wood, '#f2efe9', 0.35), appliance: '#d9dcdf', rattan: '#b08a5b', led: th.accent, diya: '#ffb347', rubber: '#1d1d1d', water: '#9fd3e6',
  };
}
function init3D() {
  const cv = document.getElementById('gl');
  try { E = new Engine(cv); } catch (e) { document.getElementById('gl-fallback').style.display = 'flex'; document.getElementById('gl-fallback').querySelector('p').textContent = e.message; return false; }
  CTL = new Controls(E, cv);
  CTL.onClick = (x, y) => pick3D(x, y);
  CTL.onDragStart = (x, y) => dragStart3D(x, y);
  CTL.onDrag = (x, y) => drag3D(x, y);
  CTL.onDragEnd = (cancel) => dragEnd3D(cancel);
  CTL.onChange = () => { E.dirty = true; };
  CTL.collide = walkCollide; CTL.onMoved = walkStairs;
  CTL.kbd = () => S.view === '3d' && !S.touring && $('#app').dataset.screen === 'work' && !document.querySelector('#modal.on');
  const loop = t => {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    let moving = CTL.tick(dt);
    const fovT = (S.touring || CTL.mode === 'walk' ? 68 : 50) * Math.PI / 180; if (Math.abs(E.cam.fov - fovT) > 0.002) { E.cam.fov += (fovT - E.cam.fov) * 0.12; moving = true; }
    if (buildAnim) { stepBuildAnim(t); moving = true; }
    if (S.view !== '2d' && (E.dirty || moving)) { E.render(); updateLabels(); updateCompass(); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.addEventListener('resize', () => { if (E) E.dirty = true; });
  return true;
}
function rebuild(opts = {}) {
  if (!E || !S.project) { if (S.view === '2d') render2D(); return; }
  const keepSel = S.sel;
  E.clear();
  const pj = S.project; const act = pj.floors[pj.activeFloor];
  const b = homeBounds(); const cx = b.x + b.w / 2, cz = b.y + b.d / 2;
  buildSite(b);
  pj.floors.forEach(f => {
    if (!showFloorIn3D(f, act)) return;
    buildFloor(f, f === act);
  });
  applyEnv();
  selectApply(keepSel);
  E.dirty = true;
  if (S.view === '2d') render2D();
  refreshSidePanel && refreshSidePanel();
  updateTopStats && updateTopStats();
}
/* ---------- the plot around the house: lawn, paving, path, boundary wall, garden ---------- */
/* exterior styles: what the outside of the house is made of */
const FACADES = {
  modern: { label: 'Modern villa', desc: 'White render, stacked-stone feature walls, timber battens, dark roof overhangs', wall: '#efeeea', stone: ['#c9bba6', '#7f7466'], accent: 'stone', band: 'timber', plinth: false, chajja: false, frame: '#1c1e21', roof: 'overhang', drive: 'cobble', sw: ['#efeeea', '#d8d1c5', '#6b4429', '#2b2c2f'] },
  classic: { label: 'Classic Indian', desc: 'Warm plaster, stone plinth, moulded bands and window sunshades (chajjas)', wall: '#dacbb2', accent: null, band: 'cornice', plinth: true, chajja: true, frame: '#34383c', roof: 'parapet', drive: 'pavers', sw: ['#dacbb2', '#7d7166', '#e7dccb', '#34383c'] },
  brick: { label: 'Brick & white', desc: 'Exposed red-brick volumes, white render, slim black frames', wall: '#f1eee8', brick: ['#a5573c', '#d9d1c6'], accent: 'brick', band: 'cornice', plinth: true, chajja: false, frame: '#232426', roof: 'overhang', drive: 'cobble', sw: ['#f1eee8', '#a5573c', '#d9d1c6', '#232426'] },
};
const facade = () => FACADES[(S.project && S.project.facade) || 'modern'] || FACADES.modern;
const extColor = () => (S.project && S.project.exterior) || facade().wall;
const TIMBER = { color: '#6b4429', color2: '#3b2416', pattern: 19, patScale: 1, rough: 0.55 };
const hashId = id => [...String(id)].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
function featureWall(room, f) { // the outside walls that get the accent material (stone / brick)
  const fc = facade(); if (!fc.accent || !room || isOpenAir(room) || S.project.exterior) return null;
  const ground = !floorBelow(f), h = hashId(room.id);
  if (!(ground ? ['living', 'dining', 'garage'].includes(room.type) || (fc.accent === 'brick' && h % 4 === 0) : fc.accent === 'brick' && h % 3 === 0)) return null;
  return fc.accent === 'stone' ? { color: fc.stone[0], color2: fc.stone[1], pattern: 13, patScale: 1 } : { color: fc.brick[0], color2: fc.brick[1], pattern: 9, patScale: 1 };
}
/* garages get a roll-up door on their outside wall (unless the plan already shows a wide door there) */
function garageDoors(floor) {
  const out = [];
  floor.rooms.filter(r => r.type === 'garage').forEach(r => {
    const sides = [['h', r.y, r.x, r.x + r.w, 'N'], ['h', r.y + r.d, r.x, r.x + r.w, 'S'], ['v', r.x, r.y, r.y + r.d, 'W'], ['v', r.x + r.w, r.y, r.y + r.d, 'E']]
      .filter(([o, c, a, b]) => isExteriorPoint(floor, o, c, (a + b) / 2) && b - a > 2.6);
    if (!sides.length || floor.doors.some(d => d.w >= 2.2 && sides.some(([o, c, a, b]) => d.o === o && Math.abs((o === 'h' ? d.y : d.x) - c) < 0.2))) return;
    const pref = (() => { try { return siteSide(); } catch (e) { return null; } })();
    sides.sort((A, B) => ((B[4] === pref) - (A[4] === pref)) || ((B[3] - B[2]) - (A[3] - A[2])));
    const [o, c, a, b, face] = sides[0], len = b - a, w = Math.min(len - 0.5, len >= 6 ? 5.0 : 2.9), t = (a + b) / 2;
    out.push({ id: 'gd_' + r.id, o, x: o === 'h' ? t : c, y: o === 'h' ? c : t, w: r2(w), h: 2.4, garage: true, room: r.id, face });
  });
  return out;
}
function siteSide() { const g = P().floors.slice().sort((x, y) => x.level - y.level)[0]; const md = g ? mainDoorSide(g) : null; return md && md.side || 'S'; }
const SITE = { M: 3.6, front: 6.2 };
function mainDoorSide(f) { // which side of the house the main door faces, by checking which side is outdoors
  const d = f.doors.find(x => x.main) || f.doors[0]; if (!d) return null;
  if (d.o === 'h') return { d, side: !roomAt(d.x, d.y - 0.3, f) ? 'N' : !roomAt(d.x, d.y + 0.3, f) ? 'S' : null };
  return { d, side: !roomAt(d.x - 0.3, d.y, f) ? 'W' : !roomAt(d.x + 0.3, d.y, f) ? 'E' : null };
}
function siteRect(b) {
  const ground = P().floors.slice().sort((x, y) => x.level - y.level)[0]; const md = ground ? mainDoorSide(ground) : null; let side = md && md.side || 'S';
  const yards = ground ? ground.rooms.filter(isYard) : [];
  if (yards.length) { // the plan already shows the plot (parking, garden): the boundary wall hugs it, the gate opens onto the parking
    const pk = yards.filter(r => r.type === 'parking').sort((a, c) => area(c) - area(a))[0]; let gate = null;
    if (pk) { const t = { N: pk.y - b.y < 0.3, S: b.y + b.d - pk.y - pk.d < 0.3, W: pk.x - b.x < 0.3, E: b.x + b.w - pk.x - pk.w < 0.3 };
      const sd = t[side] ? side : ['S', 'N', 'E', 'W'].find(k => t[k]); if (sd) { side = sd; gate = sd === 'N' || sd === 'S' ? pk.x + pk.w / 2 : pk.y + pk.d / 2; } }
    const m = 0.3; return { x0: b.x - m, x1: b.x + b.w + m, z0: b.y - m, z1: b.y + b.d + m, side, door: md && md.side === side ? md.d : null, gate, yards: true };
  }
  const m = { N: SITE.M, S: SITE.M, E: SITE.M, W: SITE.M }; m[side] = SITE.front;
  return { x0: b.x - m.W, x1: b.x + b.w + m.E, z0: b.y - m.N, z1: b.y + b.d + m.S, side, door: md && md.side ? md.d : null };
}
function tree(g, x, z, k, i) {
  const h = 2.0 + 0.6 * k; E.part(g, { geo: E.geo('cyl', 0.13 + 0.04 * k, h, 0.55, 10), x, y: 0, z, color: '#5a4434', rough: 0.95 });
  const blobs = [[0, h + 0.55, 0, 1.0], [0.55, h + 0.25, 0.2, 0.75], [-0.5, h + 0.3, -0.25, 0.78], [0.15, h + 1.15, -0.1, 0.72], [-0.2, h + 0.15, 0.55, 0.68], [0.3, h + 0.2, -0.6, 0.66]];
  const tint = ['#456f2f', '#3f6a34', '#55783a'][i % 3];
  blobs.forEach(([dx, dy, dz, r]) => E.part(g, { geo: E.geo('sph', r * (0.9 + 0.35 * k), 14), x: x + dx * (1 + 0.3 * k), y: dy, z: z + dz * (1 + 0.3 * k), color: tint, color2: '#7fa34c', pattern: 16 }));
}
function houseBounds() { // footprint of the built rooms only (yards excluded), all floors
  const rs = allRooms().filter(r => !isYard(r)); if (!rs.length) return null;
  const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.d));
  return { x: x0, y: y0, w: x1 - x0, d: y1 - y0 };
}
function buildSite(b) {
  const r = siteRect(b), cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, W = r.x1 - r.x0, D = r.z1 - r.z0;
  E.bounds = { c: [cx, 1.5, cz], r: Math.max(W, D) / 2 + 1.2 };
  const g = E.addGroup('ground', { kind: 'ground' });
  const ext = extColor(), wallCol = mixHex(ext, '#8a7a66', 0.18), cap = '#d6cdbf', pave = { color: '#c2b8a8', color2: '#8f8678', pattern: 12, patScale: 1, cast: false };
  // lawn (the whole world) and a street in front of the gate
  E.part(g, { geo: E.geo('box', 260, 0.05, 260), x: cx, y: -0.1, z: cz, color: '#4b6a32', color2: '#66773c', pattern: 11, cast: false });
  const front = r.side, horiz = front === 'N' || front === 'S';
  const roadAt = front === 'N' ? r.z0 - 4.2 : front === 'S' ? r.z1 + 4.2 : front === 'W' ? r.x0 - 4.2 : r.x1 + 4.2;
  E.part(g, horiz ? { geo: E.geo('box', 260, 0.05, 6), x: cx, y: -0.085, z: roadAt, color: '#4a4c4f', pattern: 8, patScale: 2, rough: 0.8, cast: false } : { geo: E.geo('box', 6, 0.05, 260), x: roadAt, y: -0.085, z: cz, color: '#4a4c4f', pattern: 8, patScale: 2, rough: 0.8, cast: false });
  const kerb = front === 'N' || front === 'W' ? 3 : -3;
  E.part(g, horiz ? { geo: E.geo('box', 260, 0.14, 0.18), x: cx, y: -0.1, z: roadAt + kerb, color: '#bfb9ae', cast: false } : { geo: E.geo('box', 0.18, 0.14, 260), x: roadAt + kerb, y: -0.1, z: cz, color: '#bfb9ae', cast: false });
  // paved apron hugging the house (not the yards)
  const hb = houseBounds() || b;
  E.part(g, Object.assign({ geo: E.geo('box', hb.w + 1.8, 0.06, hb.d + 1.8), x: hb.x + hb.w / 2, y: -0.075, z: hb.y + hb.d / 2 }, pave));
  // path from the main door to the gate
  const d = r.door; let gate = r.gate ?? null; b = hb;
  if (d) {
    const t = d.o === 'h' ? d.x : d.y, pw = Math.max(1.4, d.w + 0.5);
    if (front === 'S') { const z0 = b.y + b.d + 0.9, z1 = r.z1; E.part(g, Object.assign({ geo: E.geo('box', pw, 0.06, z1 - z0 + 0.2), x: t, y: -0.074, z: (z0 + z1) / 2 }, pave)); gate = gate ?? t; }
    if (front === 'N') { const z0 = r.z0, z1 = b.y - 0.9; E.part(g, Object.assign({ geo: E.geo('box', pw, 0.06, z1 - z0 + 0.2), x: t, y: -0.074, z: (z0 + z1) / 2 }, pave)); gate = gate ?? t; }
    if (front === 'E') { const x0 = b.x + b.w + 0.9, x1 = r.x1; E.part(g, Object.assign({ geo: E.geo('box', x1 - x0 + 0.2, 0.06, pw), x: (x0 + x1) / 2, y: -0.074, z: t }, pave)); gate = gate ?? t; }
    if (front === 'W') { const x0 = r.x0, x1 = b.x - 0.9; E.part(g, Object.assign({ geo: E.geo('box', x1 - x0 + 0.2, 0.06, pw), x: (x0 + x1) / 2, y: -0.074, z: t }, pave)); gate = gate ?? t; }
  }
  // driveway: from a garage door on the front straight out to the street, in the style's drive material
  const ground = P().floors.slice().sort((x, y) => x.level - y.level)[0], gds = ground ? garageDoors(ground).concat(ground.doors.filter(x => x.w >= 2.2 && !x.main)) : [];
  const gdF = gds.map(x => Object.assign({}, x, { face: x.face || (() => { const p = x.o === 'h' ? x.y : x.x; return x.o === 'h' ? (Math.abs(p - hb.y) < 0.2 ? 'N' : Math.abs(p - hb.y - hb.d) < 0.2 ? 'S' : null) : (Math.abs(p - hb.x) < 0.2 ? 'W' : Math.abs(p - hb.x - hb.w) < 0.2 ? 'E' : null); })() })).find(x => x.face === front);
  let walkGate = null;
  if (gdF && !r.yards) { const fm = FLOORS[facade().drive] || FLOORS.pavers, dm = { color: fm.color, color2: fm.c2, pattern: fm.pattern, patScale: 1, cast: false, rough: 0.8 };
    const t = gdF.o === 'h' ? gdF.x : gdF.y, dw = gdF.w + 0.9, face = gdF.o === 'h' ? gdF.y : gdF.x;
    const [a0, a1] = front === 'S' ? [face, r.z1] : front === 'N' ? [r.z0, face] : front === 'E' ? [face, r.x1] : [r.x0, face];
    E.part(g, Object.assign(horiz ? { geo: E.geo('box', dw, 0.07, a1 - a0 + 0.2), x: t, y: -0.072, z: (a0 + a1) / 2 } : { geo: E.geo('box', a1 - a0 + 0.2, 0.07, dw), x: (a0 + a1) / 2, y: -0.072, z: t }, dm));
    [-1, 1].forEach(sd => E.part(g, horiz ? { geo: E.geo('box', 0.1, 0.1, a1 - a0), x: t + sd * (dw / 2 + 0.05), y: -0.07, z: (a0 + a1) / 2, color: '#d9d6cf', cast: false } : { geo: E.geo('box', a1 - a0, 0.1, 0.1), x: (a0 + a1) / 2, y: -0.07, z: t + sd * (dw / 2 + 0.05), color: '#d9d6cf', cast: false })); // kerb edging
    if (gate != null && Math.abs(gate - t) > dw / 2 + 1.0) walkGate = gate; gate = t; }
  // boundary wall with a gateway on the front side
  const wh = 1.15, wt = 0.2, gw = gdF && !r.yards ? Math.max(3.2, gdF.w + 1.0) : 3.2;
  const wallRun = (o, c, a0, a1) => { if (a1 - a0 < 0.05) return; const len = a1 - a0, m = (a0 + a1) / 2;
    E.part(g, o === 'h' ? { geo: E.geo('box', len, wh, wt), x: m, y: -0.06, z: c, color: wallCol, pattern: 10 } : { geo: E.geo('box', wt, wh, len), x: c, y: -0.06, z: m, color: wallCol, pattern: 10 });
    E.part(g, o === 'h' ? { geo: E.geo('box', len + 0.02, 0.06, wt + 0.08), x: m, y: wh - 0.06, z: c, color: cap, pattern: 6, color2: '#b9b0a2', patScale: 0.8 } : { geo: E.geo('box', wt + 0.08, 0.06, len + 0.02), x: c, y: wh - 0.06, z: m, color: cap, pattern: 6, color2: '#b9b0a2', patScale: 0.8 }); };
  const pillar = (px, pz) => { E.part(g, { geo: E.geo('box', 0.42, 1.55, 0.42), x: px, y: -0.06, z: pz, color: '#6e655b', color2: '#4f4840', pattern: 13, patScale: 1 });
    E.part(g, { geo: E.geo('box', 0.5, 0.07, 0.5), x: px, y: 1.49, z: pz, color: cap });
    E.part(g, { geo: E.geo('box', 0.2, 0.26, 0.2), x: px, y: 1.56, z: pz, color: '#2c2c2e', emissive: isNight() ? '#ffcf8a' : '#000000', cast: false }); };
  const side = (o, c, a0, a1, isFront) => {
    if (!isFront || gate == null) { wallRun(o, c, a0, a1); return; }
    const gaps = [{ s: clamp(gate - gw / 2, a0 + 0.5, a1 - gw - 0.5), w: gw, slide: true }];
    if (walkGate != null) { const s0 = clamp(walkGate - 0.65, a0 + 0.5, a1 - 1.8), g0 = gaps[0];
      if (s0 + 1.3 < g0.s - 1.6 || s0 > g0.s + gw + 1.6) gaps.push({ s: s0, w: 1.3 }); // its own pedestrian gate
      else { const lo = Math.min(g0.s, s0), hi = Math.max(g0.s + gw, s0 + 1.3); g0.s = lo; g0.w = hi - lo; } } // close by: one wide opening
    gaps.sort((p, q) => p.s - q.s); let at = a0;
    gaps.forEach(gp => { wallRun(o, c, at, gp.s); at = gp.s + gp.w; [gp.s, gp.s + gp.w].forEach(t => pillar(o === 'h' ? t : c, o === 'h' ? c : t)); });
    wallRun(o, c, at, a1);
    const sg = gaps.find(x => x.slide), free = (lo, hi) => lo >= a0 && hi <= a1 && !gaps.some(x => x !== sg && x.s < hi && x.s + x.w > lo), slideL = free(sg.s + sg.w, sg.s + sg.w + gw + 0.2) ? 1 : free(sg.s - gw - 0.2, sg.s) ? -1 : 0; if (!slideL) return; // sliding gate parked behind the wall
    const gc = slideL > 0 ? sg.s + sg.w + gw / 2 + 0.1 : sg.s - gw / 2 - 0.1, off = o === 'h' ? (front === 'S' ? -0.3 : 0.3) : (front === 'E' ? -0.3 : 0.3);
    const gx = o === 'h' ? gc : c + off, gz = o === 'h' ? c + off : gc, n = Math.round(gw / 0.2), steel = { color: '#26282b', metal: 0.7, rough: 0.4 };
    for (let i = 0; i <= n; i++) { const t = -gw / 2 + i * gw / n; E.part(g, Object.assign(o === 'h' ? { geo: E.geo('box', 0.035, 1.3, 0.035), x: gx + t, y: -0.05, z: gz } : { geo: E.geo('box', 0.035, 1.3, 0.035), x: gx, y: -0.05, z: gz + t }, steel)); }
    [0.05, 1.2].forEach(y => E.part(g, Object.assign(o === 'h' ? { geo: E.geo('box', gw, 0.06, 0.05), x: gx, y, z: gz } : { geo: E.geo('box', 0.05, 0.06, gw), x: gx, y, z: gz }, steel)));
  };
  side('h', r.z0, r.x0, r.x1, front === 'N'); side('h', r.z1, r.x0, r.x1, front === 'S'); side('v', r.x0, r.z0, r.z1, front === 'W'); side('v', r.x1, r.z0, r.z1, front === 'E');
  if (r.yards) return; // the drawn garden / parking are landscaped by buildYard
  // garden: hedges along the back and sides, trees in the corners, shrubs by the door
  const hedge = (o, c, a0, a1) => { const len = a1 - a0; if (len < 1) return; E.part(g, o === 'h' ? { geo: E.geo('box', len, 0.75, 0.6), x: (a0 + a1) / 2, y: -0.06, z: c, color: '#3f6230', color2: '#62863e', pattern: 16 } : { geo: E.geo('box', 0.6, 0.75, len), x: c, y: -0.06, z: (a0 + a1) / 2, color: '#3f6230', color2: '#62863e', pattern: 16 }); };
  const back = { N: 'S', S: 'N', E: 'W', W: 'E' }[front];
  if (back === 'N') hedge('h', r.z0 + 0.55, r.x0 + 2.4, r.x1 - 2.4); if (back === 'S') hedge('h', r.z1 - 0.55, r.x0 + 2.4, r.x1 - 2.4);
  if (back === 'W') hedge('v', r.x0 + 0.55, r.z0 + 2.4, r.z1 - 2.4); if (back === 'E') hedge('v', r.x1 - 0.55, r.z0 + 2.4, r.z1 - 2.4);
  const inset = 1.35; let ti = 0;
  [[r.x0 + inset, r.z0 + inset], [r.x1 - inset, r.z0 + inset], [r.x0 + inset, r.z1 - inset], [r.x1 - inset, r.z1 - inset]].forEach(([x, z]) => {
    const nearPath = gate != null && (horiz ? Math.abs(x - gate) < 2.4 : Math.abs(z - gate) < 2.4); if (nearPath) return;
    tree(g, x, z, (ti * 0.37) % 1, ti); ti++; });
  if (d) { const t = d.o === 'h' ? d.x : d.y; const pw = Math.max(1.4, d.w + 0.5);
    [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) { const u = t + sd * (pw / 2 + 0.45), v = i * 1.3 + 1.6; const pos = front === 'S' ? [u, b.y + b.d + v] : front === 'N' ? [u, b.y - v] : front === 'E' ? [b.x + b.w + v, u] : [b.x - v, u];
      if ((horiz && (pos[1] < r.z0 + 0.4 || pos[1] > r.z1 - 0.4)) || (!horiz && (pos[0] < r.x0 + 0.4 || pos[0] > r.x1 - 0.4))) continue;
      bush(g, pos[0], pos[1], 0.75 + 0.12 * i, i, -0.06); } }); }
  // foundation planting along the front wall, clear of the path and the driveway
  const fz = front === 'S' ? hb.y + hb.d + 0.95 : front === 'N' ? hb.y - 0.95 : null, fx = front === 'E' ? hb.x + hb.w + 0.95 : front === 'W' ? hb.x - 0.95 : null;
  const [u0, u1] = horiz ? [hb.x + 0.5, hb.x + hb.w - 0.5] : [hb.y + 0.5, hb.y + hb.d - 0.5], dT = d ? (d.o === 'h' ? d.x : d.y) : null, gT = gdF ? (gdF.o === 'h' ? gdF.x : gdF.y) : null;
  for (let u = u0; u <= u1; u += 1.25) { if (dT != null && Math.abs(u - dT) < 1.6) continue; if (gT != null && Math.abs(u - gT) < gdF.w / 2 + 1.0) continue;
    bush(g, horiz ? u : fx, horiz ? fz : u, 0.55, Math.round(u * 10), -0.06); }
}
/* ---------- open-air spaces: balcony railings, car parking, gardens ---------- */
function buildRail(box, p, extCol) { // modern balcony railing: low upstand, frameless glass, steel posts and handrail
  const len = p.b - p.a, mid = (p.a + p.b) / 2, steel = { color: '#c3c7cc', metal: 0.9, rough: 0.25 };
  box(p.o, len + 0.04, 0.12, 0.14, mid, 0, p.c, { color: mixHex(extCol, '#ffffff', 0.2), pattern: 10 });
  box(p.o, Math.max(0.05, len - 0.04), 0.86, 0.014, mid, 0.13, p.c, { color: '#6f8790', pattern: 15, alpha: 0.1, cast: false });
  box(p.o, len + 0.04, 0.05, 0.07, mid, 1.0, p.c, steel);
  const n = Math.max(1, Math.ceil(len / 1.3)); for (let i = 0; i <= n; i++) box(p.o, 0.045, 0.9, 0.05, p.a + 0.03 + (len - 0.06) * i / n, 0.12, p.c, steel);
}
// deterministic pseudo-random numbers per room, so the landscaping doesn't jump around on every rebuild
function seeded(seed) { let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function buildYard(r, f, yOff) { if (r.type === 'parking') buildParking(r, f, yOff); else buildGarden(r, f, yOff); }
function buildCar(id, x, z, ang, col, y) { // an SUV: length along local z, nose at +z
  const g = E.addGroup('car:' + id, { kind: 'misc', x, y, z, rot: ang }), night = isNight();
  const paint = { color: col, metal: 0.6, rough: 0.18 }, trim = { color: '#17181a', rough: 0.55 }, chrome = { color: '#cfd3d8', metal: 1, rough: 0.15 }, glass = { color: '#1a242b', metal: 0.45, rough: 0.04 };
  const P = (geo, o, m) => E.part(g, Object.assign({ geo }, o, m)), B = (w, h, d) => E.geo('box', w, h, d);
  // wheels: tyre, alloy rim, hub
  [-1, 1].forEach(sx => [-1.42, 1.45].forEach(zz => {
    P(E.geo('cyl', 0.37, 0.27, 1, 20), { x: sx > 0 ? 0.98 : -0.71, y: 0.37, z: zz, rz: Math.PI / 2 }, { color: '#141414', rough: 0.9 });
    P(E.geo('cyl', 0.25, 0.02, 1, 18), { x: sx > 0 ? 0.995 : -0.975, y: 0.37, z: zz, rz: Math.PI / 2 }, { color: '#b7bcc2', metal: 0.9, rough: 0.25 });
    for (let k = 0; k < 5; k++) P(B(0.02, 0.22, 0.05), { x: sx * 0.99, y: 0.37, z: zz, rx: k * 1.2566 }, { color: '#8d939a', metal: 0.9, rough: 0.3, cast: false });
    P(E.geo('box', 0.12, 0.52, 0.96), { x: sx * 0.9, y: 0.42, z: zz }, trim); // arch cladding
  }));
  P(B(1.9, 0.5, 4.8), { y: 0.36 }, paint);                                // body
  P(B(1.94, 0.15, 3.0), { y: 0.33 }, trim);                                // sill cladding
  P(B(1.86, 0.1, 1.38), { y: 0.86, z: 1.68, rx: 0.05 }, paint);           // bonnet
  P(B(1.88, 0.44, 0.14), { y: 0.42, z: 2.36 }, paint);                     // front fascia
  P(B(1.92, 0.16, 0.16), { y: 0.26, z: 2.38 }, trim);                      // bumper
  P(B(1.06, 0.26, 0.03), { y: 0.58, z: 2.44 }, { color: '#111214', rough: 0.4 }); // grille
  for (let k = -3; k <= 3; k++) P(B(0.02, 0.24, 0.02), { x: k * 0.14, y: 0.59, z: 2.455 }, chrome);
  P(B(1.1, 0.02, 0.02), { y: 0.84, z: 2.45 }, chrome);
  [-0.68, 0.68].forEach(sx => { P(B(0.34, 0.11, 0.04), { x: sx, y: 0.73, z: 2.43 }, { color: '#e9eef2', metal: 0.3, rough: 0.05, emissive: night ? '#fff6dc' : '#202326', cast: false });
    P(B(0.3, 0.02, 0.03), { x: sx, y: 0.69, z: 2.445 }, { color: '#ffffff', emissive: '#7a8a96', cast: false }); // daytime running light
    P(B(0.36, 0.13, 0.04), { x: sx, y: 0.72, z: -2.42 }, { color: '#7d0f12', rough: 0.2, emissive: night ? '#8c0b0b' : '#2a0303', cast: false }); });
  P(B(0.52, 0.11, 0.012), { y: 0.42, z: 2.46 }, { color: '#f4f4f0', rough: 0.4, cast: false });  // number plates
  P(B(0.52, 0.11, 0.012), { y: 0.5, z: -2.43 }, { color: '#f4f4f0', rough: 0.4, cast: false });
  // cabin
  P(B(1.64, 0.58, 2.8), { y: 0.88, z: -0.85 }, glass);                   // side glass
  P(B(1.66, 0.07, 2.86), { y: 1.45, z: -0.86 }, paint);                   // roof
  P(B(1.54, 0.03, 0.74), { y: 1.18, z: 0.8, rx: 0.87 }, glass);           // raked windscreen
  P(B(1.54, 0.03, 0.56), { y: 1.17, z: -2.3, rx: -1.35 }, glass);         // rear screen
  [-1, 1].forEach(sx => { P(B(0.06, 0.05, 0.74), { x: sx * 0.79, y: 1.18, z: 0.8, rx: 0.87 }, trim); P(B(0.05, 0.58, 0.12), { x: sx * 0.81, y: 0.88, z: -0.45 }, trim); P(B(0.06, 0.58, 0.3), { x: sx * 0.8, y: 0.88, z: -2.1 }, paint);
    P(B(0.18, 0.1, 0.12), { x: sx * 1.0, y: 0.98, z: 0.72 }, paint); P(B(0.03, 0.04, 2.3), { x: sx * 0.68, y: 1.52, z: -0.9 }, chrome); // mirrors, roof rails
    [0.3, -0.95].forEach(zz => P(B(0.006, 0.42, 0.006), { x: sx * 0.953, y: 0.4, z: zz }, { color: '#2a2b2d', cast: false })); // door shut-lines
    P(B(0.012, 0.03, 0.16), { x: sx * 0.955, y: 0.72, z: 0.0 }, chrome); });
}
function buildBike(id, x, z, ang, col, y) { // a sport motorbike, length along local z, leaning on its stand
  const g = E.addGroup('bike:' + id, { kind: 'misc', x, y, z, rot: ang }), night = isNight();
  const P = (geo, o, m) => E.part(g, Object.assign({ geo }, o, m)), B = (w, h, d) => E.geo('box', w, h, d);
  [-0.72, 0.68].forEach(zz => { P(E.geo('cyl', 0.31, 0.13, 1, 20), { x: 0.065, y: 0.31, z: zz, rz: Math.PI / 2 }, { color: '#121212', rough: 0.9 }); P(E.geo('cyl', 0.2, 0.135, 1, 16), { x: 0.0675, y: 0.31, z: zz, rz: Math.PI / 2 }, { color: '#2b2d30', metal: 0.8, rough: 0.3 }); });
  P(B(0.04, 0.32, 0.04), { x: -0.16, y: 0, z: -0.1, rz: -0.35 }, { color: '#222' }); // side stand
  P(B(0.28, 0.3, 1.0), { y: 0.52, z: 0.05 }, { color: col, metal: 0.5, rough: 0.25 });          // fairing / body
  P(B(0.3, 0.2, 0.5), { y: 0.82, z: 0.18 }, { color: col, metal: 0.5, rough: 0.25 });           // tank
  P(B(0.24, 0.08, 0.5), { y: 0.86, z: -0.38 }, { color: '#151515', rough: 0.7 });                // seat
  P(B(0.2, 0.12, 0.45), { y: 0.86, z: -0.75, rx: -0.3 }, { color: col, metal: 0.5, rough: 0.25 }); // tail
  P(B(0.26, 0.3, 0.12), { y: 0.86, z: 0.68, rx: 0.5 }, { color: col, metal: 0.5, rough: 0.25 });  // nose
  P(B(0.2, 0.12, 0.02), { y: 1.06, z: 0.74, rx: 0.5 }, { color: '#1d262c', rough: 0.05 });         // screen
  P(B(0.6, 0.03, 0.03), { y: 1.0, z: 0.5 }, { color: '#222', metal: 0.6 });                        // handlebar
  [-0.08, 0.08].forEach(xx => P(B(0.03, 0.6, 0.03), { x: xx, y: 0.32, z: 0.62, rx: 0.42 }, { color: '#c9a227', metal: 0.9, rough: 0.2 })); // forks
  P(E.geo('cyl', 0.05, 0.5, 1, 10), { x: 0.14, y: 0.36, z: -0.55, rx: Math.PI / 2 - 0.25 }, { color: '#c4c8cc', metal: 1, rough: 0.2 }); // exhaust
  P(B(0.12, 0.06, 0.03), { y: 0.86, z: 0.75 }, { color: '#eef3f6', emissive: night ? '#fff1c8' : '#202326', cast: false });
}
/* lush shrubs: a cluster of overlapping leaf balls */
function bush(g, x, z, s, seed, y = 0) {
  const rnd = seeded('bush' + seed + x.toFixed(2) + z.toFixed(2));
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.283, d = (i ? 0.35 + rnd() * 0.25 : 0) * s, r = (0.36 + rnd() * 0.18) * s;
    E.part(g, { geo: E.geo('sph', r, 12), x: x + Math.cos(a) * d, y: y + r * 0.75 + rnd() * 0.12 * s, z: z + Math.sin(a) * d, sy: 0.9, color: ['#35602a', '#3f6d2e', '#2f5726'][i % 3], color2: '#78a24a', pattern: 16 }); }
}
function buildGarage(r, f, yOff) { // car + motorbike inside, nose to the door, LED strip lights
  const gd = garageDoors(f).find(d => d.room === r.id) || f.doors.find(d => d.w >= 2.2 && Math.abs((d.o === 'h' ? d.y : d.x) - (d.o === 'h' ? (Math.abs(d.y - r.y) < 0.2 ? r.y : r.y + r.d) : (Math.abs(d.x - r.x) < 0.2 ? r.x : r.x + r.w))) < 0.2);
  const y = yOff + FLOOR_TOP, cx = r.x + r.w / 2, cz = r.y + r.d / 2;
  let ang = r.d >= r.w ? 0 : Math.PI / 2, carX = cx, carZ = cz, bikeX, bikeZ;
  if (gd) { const face = gd.o === 'h' ? (Math.abs(gd.y - r.y) < 0.2 ? 'N' : 'S') : (Math.abs(gd.x - r.x) < 0.2 ? 'W' : 'E'); ang = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }[face];
    if (gd.o === 'h') carX = gd.x; else carZ = gd.y; }
  const across = (ang === 0 || ang === Math.PI) ? r.w : r.d;
  if (across >= 3.6) { const off = Math.min(1.2, across / 2 - 1.1); if (ang === 0 || ang === Math.PI) { carX = clamp(carX + off * 0.6, r.x + 1.15, r.x + r.w - 1.15); bikeX = clamp(carX - 1.75, r.x + 0.5, r.x + r.w - 0.5); bikeZ = cz; } else { carZ = clamp(carZ + off * 0.6, r.y + 1.15, r.y + r.d - 1.15); bikeZ = clamp(carZ - 1.75, r.y + 0.5, r.y + r.d - 0.5); bikeX = cx; } }
  buildCar(r.id, carX, carZ, ang, '#f2f2f0', y);
  if (bikeX != null) buildBike(r.id, bikeX, bikeZ, ang, '#2f7d3a', y);
  const g = E.addGroup('garage:' + r.id, { kind: 'misc', y: yOff });
  E.part(g, { geo: E.geo('box', Math.min(r.w, r.d) * 0.6, 0.03, 0.08), x: cx, y: f.height - 0.05, z: cz, ry: r.d >= r.w ? Math.PI / 2 : 0, color: '#ffffff', emissive: '#d8d4c8', cast: false, showBelow: yOff + f.height - 0.1 });
}
function buildGarageDoor(gd, f, yOff, box) { // timber portal, roll-up door parked at the top, LED strip
  const out = (() => { const pa = gd.o === 'h' ? roomAt(gd.x, gd.y - 0.3, f) : roomAt(gd.x - 0.3, gd.y, f); return pa && pa.id === gd.room ? 1 : -1; })();
  const t = gd.o === 'h' ? gd.x : gd.y, a = t - gd.w / 2, b = t + gd.w / 2, h = gd.h || 2.4, face = (gd.o === 'h' ? gd.y : gd.x) + out * (WALL_T / 2 + 0.06);
  box(gd.o, 0.22, h + 0.22, 0.12, a - 0.11, 0, face, TIMBER); box(gd.o, 0.22, h + 0.22, 0.12, b + 0.11, 0, face, TIMBER);
  box(gd.o, gd.w + 0.44, 0.22, 0.12, t, h, face, TIMBER);
  const inner = (gd.o === 'h' ? gd.y : gd.x) - out * 0.02;
  box(gd.o, gd.w, 0.34, 0.06, t, h - 0.34, inner, { color: '#e9e9e6', color2: '#cfcfcb', pattern: 7, patScale: 0.08, rough: 0.4, metal: 0.3 }); // rolled-up door
  box(gd.o, gd.w - 0.1, 0.02, 0.05, t, h - 0.37, inner - out * 0.08, { color: '#ffffff', emissive: '#efe6cf', cast: false }); // LED strip
}
function buildParking(r, f, yOff) {
  const rnd = seeded(r.id), y = yOff + FLOOR_TOP, g = E.addGroup('yard:' + r.id, { kind: 'misc', x: 0, y, z: 0 });
  const long = Math.max(r.w, r.d), short = Math.min(r.w, r.d), alongX = r.w >= r.d;
  // bays: cars side by side (bay 2.7 × 5 m) if the yard is deep enough, else end to end
  const perp = short >= 4.9, n = Math.max(0, Math.min(3, Math.floor(long / (perp ? 2.7 : 5.3))));
  const cols = ['#c0c3c8', '#20304f', '#efefec', '#6d1a1d', '#2a2b2e'];
  const bayLen = perp ? 2.7 : 5.3, start = (long - n * bayLen) / 2;
  const line = (ax, az, lx, lz) => E.part(g, { geo: E.geo('box', lx, 0.006, lz), x: ax, y: 0.002, z: az, color: '#f2f2ee', rough: 0.7, cast: false });
  for (let i = 0; i <= n && n > 0; i++) { // white bay lines
    const t = start + i * bayLen;
    if (perp) alongX ? line(r.x + t, r.y + r.d / 2, 0.08, Math.min(5.0, short - 0.3)) : line(r.x + r.w / 2, r.y + t, Math.min(5.0, short - 0.3), 0.08);
  }
  const cars = [];
  for (let i = 0; i < n; i++) {
    const t = start + (i + 0.5) * bayLen; const cx = alongX ? r.x + t : r.x + r.w / 2, cz = alongX ? r.y + r.d / 2 : r.y + t;
    const ang = perp ? (alongX ? 0 : Math.PI / 2) : (alongX ? Math.PI / 2 : 0);
    if (i < 2 || rnd() < 0.5) { buildCar(r.id + i, cx, cz, ang + (rnd() < 0.5 ? Math.PI : 0), cols[Math.floor(rnd() * cols.length)], y); cars.push([cx, cz]); }
  }
  // car porch: a slim canopy on steel columns, unless a floor above already covers the parking
  const above = floorAbove(f), covered = above && above.rooms.some(q => !isOpenAir(q) && rectOverlap(q, r) > area(r) * 0.3);
  if (!floorBelow(f) && !covered && n > 0) {
    const pad = 0.25, x0 = alongX ? r.x + start - pad : r.x + 0.15, x1 = alongX ? r.x + start + n * bayLen + pad : r.x + r.w - 0.15;
    const z0 = alongX ? r.y + 0.15 : r.y + start - pad, z1 = alongX ? r.y + r.d - 0.15 : r.y + start + n * bayLen + pad, hgt = Math.min(2.75, f.height - 0.1);
    E.part(g, { geo: E.geo('box', x1 - x0, 0.14, z1 - z0), x: (x0 + x1) / 2, y: hgt, z: (z0 + z1) / 2, color: mixHex(extColor(), '#ffffff', 0.25), pattern: 10 });
    E.part(g, { geo: E.geo('box', x1 - x0 + 0.04, 0.06, z1 - z0 + 0.04), x: (x0 + x1) / 2, y: hgt + 0.14, z: (z0 + z1) / 2, color: '#a39d93', color2: '#88827a', pattern: 8, patScale: 1.5, rough: 0.7 });
    const indoorNear = (px, pz) => f.rooms.some(q => !isOpenAir(q) && px > q.x - 0.35 && px < q.x + q.w + 0.35 && pz > q.y - 0.35 && pz < q.y + q.d + 0.35);
    [[x0 + 0.12, z0 + 0.12], [x1 - 0.12, z0 + 0.12], [x0 + 0.12, z1 - 0.12], [x1 - 0.12, z1 - 0.12]].forEach(([px, pz]) => { if (!indoorNear(px, pz)) E.part(g, { geo: E.geo('box', 0.14, hgt, 0.14), x: px, y: 0, z: pz, color: '#2d2f32', metal: 0.6, rough: 0.35 }); });
    if (isNight()) cars.forEach(([cx, cz]) => E.part(g, { geo: E.geo('cyl', 0.09, 0.02, 1, 12), x: cx, y: hgt - 0.02, z: cz, color: '#ffffff', emissive: '#ffe2b0', cast: false }));
  }
}
function buildGarden(r, f, yOff) {
  const rnd = seeded(r.id), g = E.addGroup('yard:' + r.id, { kind: 'misc', x: 0, y: yOff + FLOOR_TOP, z: 0 });
  const long = Math.max(r.w, r.d), short = Math.min(r.w, r.d), alongX = r.w >= r.d, A = area(r);
  const at = (u, v) => alongX ? [r.x + u, r.y + v] : [r.x + v, r.y + u]; // u along the long side, v across
  // stepping-stone path down the middle
  if (short >= 1.6) for (let u = 0.5; u < long - 0.3; u += 0.62) { const [px, pz] = at(u, short / 2 + (rnd() - 0.5) * 0.12); E.part(g, { geo: E.geo('cyl', 0.27, 0.035, 1, 14), x: px, y: 0, z: pz, color: '#b3a894', color2: '#8c8270', pattern: 6, patScale: 0.4, rough: 0.9, cast: false }); }
  // trees in a staggered row, clear of the path and the walls
  if (short >= 2.2) {
    const nT = clamp(Math.round(A / 16), 1, 6);
    for (let i = 0; i < nT; i++) { const u = long * (i + 0.5) / nT, v = short >= 3.4 ? (i % 2 ? short * 0.78 : short * 0.22) : short / 2; if (short < 3.4 && short >= 1.6) continue;
      const [px, pz] = at(u + (rnd() - 0.5) * 0.4, v); tree(g, px, pz, 0.1 + rnd() * 0.5, i); }
    if (short < 3.4) for (let i = 0; i < Math.max(1, Math.floor(long / 3.5)); i++) { const [px, pz] = at(long * (i + 0.5) / Math.max(1, Math.floor(long / 3.5)), short * 0.22);
      E.part(g, { geo: E.geo('sph', 0.45, 12), x: px, y: 0.3, z: pz, sy: 0.85, color: '#3f6a34', color2: '#79a04a', pattern: 16 }); }
  }
  // flower beds along the edges: green clumps with blooms
  const blooms = ['#d6455d', '#f2c14e', '#e98bb5', '#f6f3ea', '#9b59d0', '#f08a3c'];
  [[0.32, 'u'], [short - 0.32, 'u']].forEach(([v]) => { for (let u = 0.45; u < long - 0.3; u += 0.85 + rnd() * 0.3) {
    const [px, pz] = at(u, v); const c = blooms[Math.floor(rnd() * blooms.length)];
    E.part(g, { geo: E.geo('sph', 0.24, 10), x: px, y: 0.12, z: pz, sy: 0.75, color: '#3d6a2f', color2: '#6f9a45', pattern: 16, cast: false });
    for (let k = 0; k < 3; k++) E.part(g, { geo: E.geo('sph', 0.065, 8), x: px + (rnd() - 0.5) * 0.3, y: 0.28 + rnd() * 0.06, z: pz + (rnd() - 0.5) * 0.3, color: c, rough: 0.7, cast: false });
  } });
  // a bench and two garden lights
  if (A >= 9 && short >= 2.4) {
    const [bx, bz] = at(long * 0.5, short - 0.75), ry = alongX ? 0 : Math.PI / 2, bg = E.addGroup('bench:' + r.id, { kind: 'misc', x: bx, y: yOff + FLOOR_TOP, z: bz, rot: ry });
    const wood = { color: '#8a5f3c', pattern: 1, patScale: 3, color2: '#5d3d24', rough: 0.55 }, iron = { color: '#26282b', metal: 0.6, rough: 0.4 };
    E.part(bg, Object.assign({ geo: E.geo('box', 1.5, 0.05, 0.42), y: 0.43 }, wood)); E.part(bg, Object.assign({ geo: E.geo('box', 1.5, 0.32, 0.04), y: 0.52, z: 0.21 }, wood));
    [-0.65, 0.65].forEach(xx => E.part(bg, Object.assign({ geo: E.geo('box', 0.05, 0.86, 0.46), x: xx, y: 0 }, iron)));
  }
  [[0.4, 0.4], [long - 0.4, short - 0.4]].forEach(([u, v]) => { if (short < 1.6) return; const [px, pz] = at(u, v);
    E.part(g, { geo: E.geo('cyl', 0.06, 0.6, 1, 10), x: px, y: 0, z: pz, color: '#2a2c2f', metal: 0.5, rough: 0.4 });
    E.part(g, { geo: E.geo('cyl', 0.08, 0.1, 1, 10), x: px, y: 0.6, z: pz, color: '#f2efe6', emissive: isNight() ? '#ffd79a' : '#2e2b25', cast: false }); });
}
function buildFloor(f, active) {
  const yOff = floorY(f), H = f.height;
  const cut = S.cutaway ? 1.15 : null;
  const holesBelow = stairsBelow(f).map(stairFoot), holesUp = floorAbove(f) ? (f.stairs || []).map(stairFoot) : [];
  // floors
  f.rooms.forEach(r => {
    const fm = FLOORS[roomFloorKey(r)];
    const g = E.addGroup('room:' + r.id, { kind: 'room', ref: r.id, x: r.x + r.w / 2, y: yOff, z: r.y + r.d / 2 });
    const cx = r.x + r.w / 2, cz = r.y + r.d / 2;
    rectMinus({ x: r.x, y: r.y, w: r.w, d: r.d }, holesBelow).forEach(q => E.part(g, { geo: E.geo('box', q.w, FLOOR_TOP, q.d), x: q.x + q.w / 2 - cx, z: q.y + q.d / 2 - cz, color: fm.color, color2: fm.c2, pattern: fm.pattern, patScale: fm.scale, cast: false }));
    if (holesBelow.length || floorBelow(f)) { // structural slab between storeys
      const e = (o, c, t) => isExteriorPoint(f, o, c, t) ? WALL_T / 2 : 0; const n = e('h', r.y, cx), so = e('h', r.y + r.d, cx), w = e('v', r.x, cz), ea = e('v', r.x + r.w, cz);
      rectMinus({ x: r.x - w, y: r.y - n, w: r.w + w + ea, d: r.d + n + so }, holesBelow).forEach(q => E.part(g, { geo: E.geo('box', q.w, 0.22, q.d), x: q.x + q.w / 2 - cx, y: -0.225, z: q.y + q.d / 2 - cz, color: '#d3ccc0' }));
    }
    if (isYard(r)) { buildYard(r, f, yOff); return; }
    if (r.type === 'garage') buildGarage(r, f, yOff);
    // roof/ceiling slab (casts sunlight shadows; visible only from inside) — open above a staircase
    rectMinus({ x: r.x - 0.06, y: r.y - 0.06, w: r.w + 0.12, d: r.d + 0.12 }, holesUp).forEach(q => E.part(g, { geo: E.geo('box', q.w, 0.12, q.d), x: q.x + q.w / 2 - cx, z: q.y + q.d / 2 - cz, y: H, color: '#f4f2ee', cast: roofCasts(), showBelow: yOff + H - 0.05, noCull: true }));
    // false ceiling
    const ck = roomCeiling(r); const lightsOn = isNight() && r.lights?.ambient;
    if (ck !== 'flat') {
      const bw = ck === 'tray' ? 0.6 : ck === 'cove' ? 0.45 : 0.32, th = 0.1, y = H - (ck === 'tray' ? 0.3 : 0.22);
      const vis = { showBelow: yOff + y - 0.02, cast: false, color: '#f7f5f1' };
      E.part(g, Object.assign({ geo: E.geo('box', r.w, th, bw), y, z: -r.d / 2 + bw / 2 }, vis)); E.part(g, Object.assign({ geo: E.geo('box', r.w, th, bw), y, z: r.d / 2 - bw / 2 }, vis));
      E.part(g, Object.assign({ geo: E.geo('box', bw, th, r.d - 2 * bw), y, x: -r.w / 2 + bw / 2 }, vis)); E.part(g, Object.assign({ geo: E.geo('box', bw, th, r.d - 2 * bw), y, x: r.w / 2 - bw / 2 }, vis));
      if (ck !== 'peripheral') { const em = lightsOn || r.lights?.accent && isNight() ? '#ffcf8a' : '#000000'; const es = { showBelow: yOff + y - 0.02, cast: false, color: '#fff4dc', emissive: em };
        E.part(g, Object.assign({ geo: E.geo('box', r.w - 2 * bw, 0.025, 0.03), y: y + th, z: -r.d / 2 + bw }, es)); E.part(g, Object.assign({ geo: E.geo('box', r.w - 2 * bw, 0.025, 0.03), y: y + th, z: r.d / 2 - bw }, es)); }
      if (ck === 'tray') for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) E.part(g, { geo: E.geo('cyl', 0.06, 0.02, 1, 10), x: i * (r.w / 2 - bw / 2), y: y - 0.015, z: j * (r.d / 2 - bw / 2), color: '#ffffff', emissive: lightsOn ? '#ffe2b0' : '#222222', showBelow: yOff + y, cast: false });
    }
    if ((ck === 'flat' || ck === 'peripheral') && r.type !== 'balcony') E.part(g, { geo: E.geo('cyl', 0.18, 0.03, 1, 16), y: H - 0.03, color: '#ffffff', emissive: lightsOn ? '#fff0d0' : '#1a1a1a', showBelow: yOff + H - 0.1, cast: false });
    if (S.overlay === 'heat' && active) { /* handled in 2D */ }
  });
  // walls: two half-slabs per piece, each finished for the room (paint) or the outside (textured plaster)
  const wg = E.addGroup('walls:' + f.id, { kind: 'wall', y: yOff });
  const extCol = extColor(), ground = !floorBelow(f);
  const fc = facade(), FRAME = { color: fc.frame, metal: 0.55, rough: 0.38 };
  const box = (o, len, h, th, along, y, across, extra) => E.part(wg, Object.assign(o === 'h' ? { geo: E.geo('box', len, h, th), x: along, y, z: across } : { geo: E.geo('box', th, h, len), x: across, y, z: along }, extra));
  const isOut = r => !r || isOpenAir(r);
  wallPieces(f).forEach(p => {
    if (p.kind === 'rail') { buildRail(box, p, extCol); return; }
    let y0 = p.y0, y1 = p.y1; if (cut != null) { if (y0 >= cut) return; y1 = Math.min(y1, cut); }
    if (y1 - y0 < 0.01) return;
    // outer walls run past the line ends to close the corners; partitions stop just inside the outer face
    const len = p.b - p.a, solid = p.kind === 'solid', ext = solid ? (p.ext ? WALL_T / 2 : WALL_T / 2 - 0.018) : 0;
    const mid = (p.a + p.b) / 2;
    const sideRoom = side => { const pt = p.o === 'h' ? [mid, p.c + side * 0.2] : [p.c + side * 0.2, mid]; return roomAt(pt[0], pt[1], f); };
    const rooms = [sideRoom(-1), sideRoom(1)];
    [-1, 1].forEach((side, si) => {
      const rm = rooms[si], outside = isOut(rm);
      const col = outside ? extCol : roomWall(rm);
      const off = side * WALL_T / 4;
      box(p.o, len + ext * 2, y1 - y0, WALL_T / 2, mid, y0, p.c + off, outside ? (featureWall(rooms[1 - si], f) || { color: col, pattern: 10, patScale: 1 }) : { color: col, pattern: rm.wallpaper ? 7 : 0, color2: mixHex(col, '#ffffff', 0.25), patScale: 0.08, rough: 0.88 });
      const face = p.c + side * WALL_T / 2;
      if (outside && cut == null && !isOut(rooms[1 - si])) {
        // stone-clad plinth at the foot of the house, and a moulded band at each floor's top (slab edge)
        if (ground && y0 < 0.01) { if (fc.plinth) box(p.o, len + ext * 2 + 0.06, 0.5, 0.05, mid, -0.06, face + side * 0.02, { color: '#7d7166', color2: '#5b524a', pattern: 13 });
          else box(p.o, len + ext * 2 + 0.02, 0.1, 0.02, mid, -0.06, face + side * 0.01, { color: '#3a3b3e', rough: 0.6 }); }
        if (y1 > f.height - 0.01) {
          if (fc.band === 'timber') { if (floorAbove(f)) box(p.o, len + ext * 2 + 0.04, 0.36, 0.05, mid, f.height - 0.2, face + side * 0.025, TIMBER); }
          else box(p.o, len + ext * 2 + 0.08, 0.2, 0.07, mid, f.height - 0.08, face + side * 0.03, { color: mixHex(extCol, '#ffffff', 0.35), pattern: 10 });
        }
      }
      if (!outside && y0 < 0.01 && (p.kind === 'solid' || p.kind === 'sill') && len > 0.25) { // skirting board
        const fm = FLOORS[roomFloorKey(rm)]; box(p.o, len + ext * 2 - 0.02, 0.09, 0.014, mid, FLOOR_TOP, face + side * 0.007, { color: mixHex(fm.color, '#000000', 0.12), rough: 0.5, cast: false });
      }
    });
    if (p.kind === 'sill' && cut == null) {
      const w = p.ref, gy = w.sill, gh = w.h, outSide = isOut(rooms[0]) && !isOut(rooms[1]) ? -1 : isOut(rooms[1]) && !isOut(rooms[0]) ? 1 : 0, along = mid;
      const fd = 0.07, prof = 0.055; // frame depth and profile
      // glass, frame (outer + mullion + transom)
      box(p.o, len - 0.02, gh, 0.012, along, gy, p.c, { color: '#5d7480', pattern: 15, alpha: 0.18, cast: false });
      box(p.o, len, prof, fd, along, gy, p.c, FRAME); box(p.o, len, prof, fd, along, gy + gh - prof, p.c, FRAME);
      [p.a + prof / 2, p.b - prof / 2].forEach(t => box(p.o, prof, gh, fd, t, gy, p.c, FRAME));
      const panes = len > 1.9 ? 3 : len > 0.8 ? 2 : 1;
      for (let i = 1; i < panes; i++) box(p.o, 0.045, gh, fd * 0.8, p.a + len * i / panes, gy, p.c, FRAME);
      if (gh > 1.15) box(p.o, len, 0.045, fd * 0.8, along, gy + gh * 0.72, p.c, FRAME);
      // reveal linings so the wall thickness reads at the opening
      box(p.o, len, 0.012, WALL_T, along, gy + gh, p.c, { color: '#efebe4', cast: false });
      [p.a + 0.006, p.b - 0.006].forEach(t => box(p.o, 0.012, gh, WALL_T, t, gy, p.c, { color: '#efebe4', cast: false }));
      if (outSide) {
        // projecting stone sill and a concrete sunshade (chajja) over the window
        box(p.o, len + 0.16, 0.045, WALL_T / 2 + 0.08, along, gy - 0.045, p.c + outSide * (WALL_T / 4 + 0.04), fc.chajja ? { color: '#8a8580', color2: '#6c6863', pattern: 6, patScale: 0.5 } : { color: '#2a2b2e', metal: 0.5, rough: 0.4 });
        if (fc.chajja && gy + gh + 0.2 < f.height - 0.15) box(p.o, len + 0.36, 0.07, 0.5, along, gy + gh + 0.16, p.c + outSide * (WALL_T / 2 + 0.25), { color: mixHex(extCol, '#ffffff', 0.2), pattern: 10 });
        // interior marble ledge
        box(p.o, len, 0.025, WALL_T / 2 + 0.04, along, gy - 0.025, p.c - outSide * (WALL_T / 4 + 0.02), { color: '#ece7de', color2: '#c4bcae', pattern: 3, patScale: 0.4, cast: false });
      }
      // curtains on room side(s)
      [-1, 1].forEach(side => {
        const pt = p.o === 'h' ? [mid, p.c + side * 0.25] : [p.c + side * 0.25, mid]; const rm = roomAt(pt[0], pt[1], f);
        if (!rm || !rm.curtains || isOpenAir(rm) || ['bathroom', 'kitchen', 'utility'].includes(rm.type)) return;
        const col = roomTheme(rm).curtain; const top = Math.min(f.height - 0.08, w.sill + w.h + 0.25), hh = top - 0.08; const o = side * (WALL_T / 2 + 0.07);
        [p.a - 0.12, p.b + 0.12].forEach(t => box(p.o, 0.32, hh, 0.06, t, 0.08, p.c + o, { color: col, pattern: 7, patScale: 0.06, color2: mixHex(col, '#000000', 0.12) }));
        box(p.o, len + 0.6, 0.03, 0.03, mid, top, p.c + o, { color: '#777777', metal: 0.8, rough: 0.35 });
      });
    }
  });
  // doors
  f.doors.forEach(d => {
    if (cut != null) return;
    const hinge = d.o === 'h' ? [d.x - d.w / 2, d.y] : [d.x, d.y - d.w / 2];
    const base = d.o === 'h' ? 0 : -Math.PI / 2; const open = d.main ? -1.1 : -1.48;
    const g = E.addGroup('door:' + d.id, { kind: 'door', ref: d.id, x: hinge[0], y: yOff, z: hinge[1], rot: base + open });
    const col = d.main ? '#5a3a24' : '#b08b66', lw = d.w - 0.04, lh = DOOR_H - 0.03;
    E.part(g, { geo: E.geo('box', lw, lh, 0.045), x: lw / 2 + 0.02, y: 0.01, z: 0, color: col, color2: mixHex(col, '#000000', 0.25), pattern: 1, patScale: 2.4, rough: 0.45 });
    // raised panels on both faces (four on the main door, two on others)
    const rows = d.main ? [[0.18, 0.78], [1.05, 0.85]] : [[0.2, 0.75], [1.1, 0.75]];
    [-1, 1].forEach(sd => rows.forEach(([py, ph]) => [0.25, 0.75].forEach((fx, k) => { if (!d.main && k) return; const pw = d.main ? lw * 0.36 : lw * 0.7; E.part(g, { geo: E.geo('box', pw, ph, 0.012), x: d.main ? lw * fx + 0.02 : lw / 2 + 0.02, y: py, z: sd * 0.027, color: mixHex(col, '#000000', 0.08), color2: mixHex(col, '#000000', 0.3), pattern: 1, patScale: 2.4, rough: 0.45, cast: false }); })));
    [-1, 1].forEach(sd => E.part(g, { geo: E.geo('box', d.main ? 0.03 : 0.12, d.main ? 0.4 : 0.025, 0.03), x: lw - 0.06, y: d.main ? 0.85 : 1.0, z: sd * 0.045, color: d.main ? '#2a2a2a' : '#c9a45c', metal: 0.9, rough: 0.3 }));
    const fg = E.addGroup('doorframe:' + d.id, { kind: 'misc', x: d.x, y: yOff, z: d.y });
    const fcol = d.main ? '#3e2a1c' : '#7a5a3f', fx = { color: fcol, pattern: 1, patScale: 2, color2: mixHex(fcol, '#000000', 0.3), rough: 0.5 };
    if (d.o === 'h') { E.part(fg, Object.assign({ geo: E.geo('box', 0.06, DOOR_H, WALL_T + 0.03), x: -d.w / 2 + 0.03 }, fx)); E.part(fg, Object.assign({ geo: E.geo('box', 0.06, DOOR_H, WALL_T + 0.03), x: d.w / 2 - 0.03 }, fx)); E.part(fg, Object.assign({ geo: E.geo('box', d.w, 0.06, WALL_T + 0.03), y: DOOR_H - 0.06 }, fx)); }
    else { E.part(fg, Object.assign({ geo: E.geo('box', WALL_T + 0.03, DOOR_H, 0.06), z: -d.w / 2 + 0.03 }, fx)); E.part(fg, Object.assign({ geo: E.geo('box', WALL_T + 0.03, DOOR_H, 0.06), z: d.w / 2 - 0.03 }, fx)); E.part(fg, Object.assign({ geo: E.geo('box', WALL_T + 0.03, 0.06, d.w), y: DOOR_H - 0.06 }, fx)); }
    // main entrance: canopy, granite step and a wall light on the outside
    const ra = d.o === 'h' ? roomAt(d.x, d.y - 0.3, f) : roomAt(d.x - 0.3, d.y, f), rb = d.o === 'h' ? roomAt(d.x, d.y + 0.3, f) : roomAt(d.x + 0.3, d.y, f);
    const outS = isOut(ra) && !isOut(rb) ? -1 : isOut(rb) && !isOut(ra) ? 1 : 0;
    if (outS && (d.main || ground)) {
      const at = (along, across, extra) => Object.assign(d.o === 'h' ? { x: along, z: across } : { x: across, z: along }, extra);
      const geo = (wa, h, dc) => d.o === 'h' ? E.geo('box', wa, h, dc) : E.geo('box', dc, h, wa);
      if (d.main) {
        E.part(fg, at(0, outS * (WALL_T / 2 + 0.55), { geo: geo(d.w + 0.9, 0.09, 1.1), y: DOOR_H + 0.28, color: mixHex(extColor(), '#ffffff', 0.25), pattern: 10 }));
        E.part(fg, at(0, outS * (WALL_T / 2 + 0.55), { geo: geo(d.w + 0.92, 0.12, 1.12), y: DOOR_H + 0.37, color: '#3a3532', rough: 0.6 }));
        E.part(fg, at(d.w / 2 + 0.3, outS * (WALL_T / 2 + 0.05), { geo: geo(0.12, 0.22, 0.08), y: 1.75, color: '#222222', emissive: isNight() ? '#ffcf8a' : '#3a342a', cast: false }));
      }
      if (ground) E.part(fg, at(0, outS * (WALL_T / 2 + 0.3), { geo: geo(d.w + 0.5, 0.1, 0.6), y: -0.07, color: '#3c3b3d', color2: '#5a595c', pattern: 6, patScale: 0.6 }));
    }
  });
  if (cut == null) garageDoors(f).forEach(gd => buildGarageDoor(gd, f, yOff, box));
  if (cut == null) buildEaves(f, yOff);
  if (S.roof && cut == null) buildRoof(f, yOff);
  // furniture
  f.rooms.forEach(r => r.furniture.forEach(it => buildItem(it, r, yOff)));
  // stairs going up from this floor, and the balustrade around the opening from the floor below
  (f.stairs || []).forEach(st => buildStairs(st, f, yOff));
  if (cut == null) stairsBelow(f).forEach(st => buildStairwell(st, f, yOff));
}
/* a parapet goes where the built area really ends: indoor on one side, and nothing built for a good
   way out on the other (small gaps between detected rooms are not the edge of the roof) */
/* under the roof: built rooms, plus (modern flat roofs) a recessed balcony walled in on 2+ sides */
function roofed(f, r) {
  if (!isOpenAir(r)) return true; if (r.type !== 'balcony' || facade().roof !== 'overhang') return false;
  const built = f.rooms.filter(q => !isOpenAir(q)), touch = (o, c, a, b) => built.some(q => { const e = sharedEdge(r, q); return e && e.o === o && Math.abs(e.c - c) < 0.05 && e.hi - e.lo > 0.5 * (b - a); });
  return [touch('h', r.y, r.x, r.x + r.w), touch('h', r.y + r.d, r.x, r.x + r.w), touch('v', r.x, r.y, r.y + r.d), touch('v', r.x + r.w, r.y, r.y + r.d)].filter(Boolean).length >= 2;
}
/* small gaps the plan leaves between rooms (ducts, shafts, unlabelled bits) that are walled in on every side: the roof covers them */
const _holes = new WeakMap();
function roofHoles(f) {
  const sig = f.rooms.map(r => [r.x, r.y, r.w, r.d].join(',')).join(';'), c = _holes.get(f); if (c && c.sig === sig) return c.holes;
  const rs = f.rooms; let holes = [];
  if (rs.length) { const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.d));
    holes = rectMinus({ x: x0, y: y0, w: x1 - x0, d: y1 - y0 }, rs).filter(q => q.x > x0 + 0.05 && q.y > y0 + 0.05 && q.x + q.w < x1 - 0.05 && q.y + q.d < y1 - 0.05 && q.w * q.d < 12); }
  _holes.set(f, { sig, holes }); return holes;
}
function roofEdge(f, o, c, t) {
  const inside = (d) => { const p = o === 'h' ? [t, c + d] : [c + d, t]; return f.rooms.some(r => roofed(f, r) && inRoom(r, p[0], p[1])) || roofHoles(f).some(q => inRoom(q, p[0], p[1])); };
  const a = inside(-0.12), b = inside(0.12); if (a === b) return 0;
  return a ? (!inside(0.45) && !inside(0.8) ? 1 : 0) : (!inside(-0.45) && !inside(-0.8) ? -1 : 0);
}
function roofRunsOf(f, L0, extra = []) { // stretches of a wall line that are the edge of the roof, with their outward side
  const cuts = new Set([L0.a, L0.b]); f.rooms.concat(extra).forEach(r => (L0.o === 'h' ? [r.x, r.x + r.w] : [r.y, r.y + r.d]).forEach(v => { if (v > L0.a + 0.01 && v < L0.b - 0.01) cuts.add(v); }));
  const ts = [...cuts].sort((a, b) => a - b), out = [];
  for (let i = 0; i < ts.length - 1; i++) { const sg = roofEdge(f, L0.o, L0.c, (ts[i] + ts[i + 1]) / 2); if (!sg) continue; const last = out[out.length - 1]; if (last && last.sign === sg && Math.abs(last.b - ts[i]) < 1e-6) last.b = ts[i + 1]; else out.push({ a: ts[i], b: ts[i + 1], sign: sg }); }
  return out;
}
/* modern styles: a thin flat roof that overhangs the walls, with a dark edge */
function buildEaves(f, yOff) {
  if (facade().roof !== 'overhang') return; const pj = P(), act = pj.floors[pj.activeFloor], ab = floorAbove(f), up = ab && showFloorIn3D(ab, act) ? ab.rooms : [];
  const g = E.addGroup('eaves:' + f.id, { kind: 'misc', y: yOff }), H = f.height, ov = 0.6;
  const walledAbove = (o, c, t, sign) => { const p = o === 'h' ? [t, c - sign * 0.3] : [c - sign * 0.3, t]; return up.some(r => !isOpenAir(r) && inRoom(r, p[0], p[1])); };
  wallLines(f).forEach(L0 => roofRunsOf(f, L0, up).forEach(sg => {
    if (walledAbove(L0.o, L0.c, (sg.a + sg.b) / 2, sg.sign)) return; // the wall carries on up: no eave here
    const len = sg.b - sg.a + 2 * ov, m = (sg.a + sg.b) / 2, w = WALL_T + ov, c = L0.c + sg.sign * ov / 2;
    E.part(g, L0.o === 'h' ? { geo: E.geo('box', len, 0.26, w), x: m, y: H - 0.04, z: c, color: '#2a2b2e', rough: 0.55 } : { geo: E.geo('box', w, 0.26, len), x: c, y: H - 0.04, z: m, color: '#2a2b2e', rough: 0.55 });
    E.part(g, L0.o === 'h' ? { geo: E.geo('box', len - 0.02, 0.02, w - 0.02), x: m, y: H - 0.06, z: c, color: '#f2f1ee', cast: false } : { geo: E.geo('box', w - 0.02, 0.02, len - 0.02), x: c, y: H - 0.06, z: m, color: '#f2f1ee', cast: false }); // light soffit
  }));
}
/* the part of a lower floor's roof that sticks out past the floor above (e.g. a garage) */
function buildLowRoof(f, yOff, above) {
  if (facade().roof !== 'overhang') return; const H = f.height, g = E.addGroup('roof:' + f.id, { kind: 'misc', y: yOff });
  f.rooms.filter(r => roofed(f, r)).forEach(r => rectMinus({ x: r.x, y: r.y, w: r.w, d: r.d }, above.rooms).forEach(q => {
    if (q.w < 0.3 || q.d < 0.3) return;
    E.part(g, { geo: E.geo('box', q.w + 0.02, 0.18, q.d + 0.02), x: q.x + q.w / 2, y: H, z: q.y + q.d / 2, color: '#d4d0c9', showBelow: yOff + H - 0.05 });
    E.part(g, { geo: E.geo('box', q.w, 0.02, q.d), x: q.x + q.w / 2, y: H + 0.18, z: q.y + q.d / 2, color: '#8d8a85', color2: '#6f6c68', pattern: 8, cast: false });
  }));
}
/* roof terrace: slab, tiles, parapet with coping and a water tank — shown with the "Roof" toggle */
function buildRoof(f, yOff) {
  const pj = P(), act = pj.floors[pj.activeFloor], above = floorAbove(f);
  if (above && showFloorIn3D(above, act)) { buildLowRoof(f, yOff, above); return; }
  const H = f.height, g = E.addGroup('roof:' + f.id, { kind: 'misc', y: yOff }), ext = extColor();
  f.rooms.filter(r => roofed(f, r)).forEach(r => {
    const e = (o, c, t) => isExteriorPoint(f, o, c, t) ? WALL_T / 2 : 0; const cx = r.x + r.w / 2, cz = r.y + r.d / 2;
    const n = e('h', r.y, cx), so = e('h', r.y + r.d, cx), w = e('v', r.x, cz), ea = e('v', r.x + r.w, cz);
    E.part(g, { geo: E.geo('box', r.w + w + ea + 0.01, 0.16, r.d + n + so + 0.01), x: r.x - w + (r.w + w + ea) / 2, y: H, z: r.y - n + (r.d + n + so) / 2, color: '#cfc7ba' });
    E.part(g, { geo: E.geo('box', r.w + w + ea, 0.025, r.d + n + so), x: r.x - w + (r.w + w + ea) / 2, y: H + 0.16, z: r.y - n + (r.d + n + so) / 2, color: '#b49a80', color2: '#8c7a68', pattern: 14, patScale: 0.6, cast: false });
  });
  roofHoles(f).forEach(q => { E.part(g, { geo: E.geo('box', q.w + 0.02, 0.16, q.d + 0.02), x: q.x + q.w / 2, y: H, z: q.y + q.d / 2, color: '#cfc7ba' });
    E.part(g, { geo: E.geo('box', q.w, 0.025, q.d), x: q.x + q.w / 2, y: H + 0.16, z: q.y + q.d / 2, color: '#b49a80', color2: '#8c7a68', pattern: 14, patScale: 0.6, cast: false }); });
  if (facade().roof !== 'overhang')
  wallLines(f).forEach(L0 => roofRunsOf(f, L0).forEach(sg => {
    const L = { o: L0.o, c: L0.c, a: sg.a, b: sg.b };
    const len = L.b - L.a + WALL_T, m = (L.a + L.b) / 2;
    E.part(g, L.o === 'h' ? { geo: E.geo('box', len, 0.92, WALL_T), x: m, y: H + 0.16, z: L.c, color: ext, pattern: 10 } : { geo: E.geo('box', WALL_T, 0.92, len), x: L.c, y: H + 0.16, z: m, color: ext, pattern: 10 });
    E.part(g, L.o === 'h' ? { geo: E.geo('box', len + 0.06, 0.06, WALL_T + 0.08), x: m, y: H + 1.08, z: L.c, color: '#d9d1c4', color2: '#b8b0a3', pattern: 6, patScale: 0.8 } : { geo: E.geo('box', WALL_T + 0.08, 0.06, len + 0.06), x: L.c, y: H + 1.08, z: m, color: '#d9d1c4', color2: '#b8b0a3', pattern: 6, patScale: 0.8 });
  }));
  const big = f.rooms.filter(r => !isOpenAir(r)).sort((a, b) => area(b) - area(a))[0];
  if (big) { const tx = big.x + Math.min(1.1, big.w / 3), tz = big.y + Math.min(1.1, big.d / 3);
    E.part(g, { geo: E.geo('box', 1.3, 0.35, 1.3), x: tx, y: H + 0.18, z: tz, color: '#bdb5a8' });
    E.part(g, { geo: E.geo('cyl', 0.55, 1.15, 1, 20), x: tx, y: H + 0.53, z: tz, color: '#1f2224', rough: 0.55 });
    E.part(g, { geo: E.geo('cyl', 0.2, 0.06, 1, 14), x: tx, y: H + 1.68, z: tz, color: '#2a2d30' }); }
}
const ROLE_MAT = { metal: { rough: 0.35, metal: 0.85 }, appliance: { rough: 0.25, metal: 0.4 }, screen: { rough: 0.1 }, glass: { pattern: 15 }, glass2: { rough: 0.08 }, mirror: { rough: 0.02, metal: 1 }, stone: { rough: 0.22 }, ceramic: { rough: 0.12 }, white: { rough: 0.55 }, water: { pattern: 17 }, rubber: { rough: 0.9 }, wood: { rough: 0.5 }, cabinet: { rough: 0.4 }, mattress: { pattern: 4 }, plant: { pattern: 16 }, plant2: { pattern: 16 }, pot: { rough: 0.7 }, rattan: { pattern: 4, rough: 0.8 }, dark: { rough: 0.5 } };
function buildItem(it, room, yOff = floorY(floorOfRoom(room))) {
  const c = CATALOG[it.type]; if (!c) return;
  const g = E.addGroup('item:' + it.id, { kind: 'item', ref: it.id, x: it.x, y: yOff + FLOOR_TOP, z: it.y, rot: it.rot * Math.PI / 180 });
  const pal = palette(room, it); const night = isNight() && room.lights?.ambient !== false;
  c.build(it.w, it.d, it.h).forEach(p => {
    let col = p.role.startsWith('c:') ? p.role.slice(2) : (pal[p.role] || '#999999');
    const geo = p.k === 'box' ? E.geo('box', p.w, p.h, p.d) : p.k === 'cyl' ? E.geo('cyl', p.r, p.h, p.c || 1, 16) : E.geo('sph', p.r, 14);
    const em = p.role === 'lamp' ? (night ? '#ffd9a0' : '#3a3428') : p.role === 'led' ? mixHex(pal.accent, '#ffffff', 0.2) : p.role === 'diya' ? '#ff9a2e' : p.role === 'screen' ? '#0a0e14' : '#000000';
    const m = ROLE_MAT[p.role] || {};
    E.part(g, { geo, x: p.x, y: p.y, z: p.z, ry: p.ry || 0, rx: p.rx || 0, rz: p.rz || 0, sy: p.sy || 1, color: col, color2: p.role === 'rug' ? mixHex(col, '#000000', 0.15) : p.role === 'plant' || p.role === 'plant2' ? mixHex(col, '#9cc25a', 0.4) : col, pattern: p.pattern || m.pattern || (p.role === 'fabric' || p.role === 'rug2' || p.role === 'seat' || p.role === 'headboard' ? 4 : 0), patScale: p.patScale || 1, alpha: p.role === 'glass' ? 0.12 : 1, rough: m.rough ?? -1, metal: m.metal || 0, emissive: em, cast: p.role !== 'glass' && !c.flat });
  });
  g.pick = { w: it.w, d: it.d, h: Math.max(0.05, it.h) };
  return g;
}
const isNight = () => S.hour < 6.4 || S.hour > 18.4;
const roofCasts = () => !!(S.daylightSim || S.touring || (CTL && CTL.mode === 'walk'));
function fmtHour(h) { const hh = Math.floor(h) % 24, mm = Math.round((h - Math.floor(h)) * 60); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; }
function applyEnv() {
  if (!E) return; const h = S.hour; const env = E.env;
  const t = (h - 6) / 12.6; const el = Math.max(-0.2, Math.sin(Math.PI * t)) * 1.22; // radians, peak ~70°
  const az = sunAz(h) * Math.PI / 180 + (S.project?.north || 0) * Math.PI / 180;
  const ce = Math.cos(el); env.sunDir = V3.norm([ce * Math.sin(az), Math.max(0.03, Math.sin(el)), -ce * Math.cos(az)]);
  const k = clamp(Math.sin(el) * 1.6, 0, 1); const day = clamp((Math.sin(el) + 0.1) * 3, 0, 1);
  const warm = [2.6, 1.45, 0.7], noon = [2.5, 2.38, 2.2];
  const zen = mixHex('#0a1022', mixHex('#4c5f92', '#3c7ccc', k), day), hor = mixHex('#1c2540', mixHex('#f0b088', '#d3e3ef', k), day);
  env.zenith = zen; env.horizon = hor; env.groundCol = mixHex('#141820', '#6d7652', day);
  env.night = 1 - day; env.clouds = 0.65; env.vignette = 0.22;
  if (day > 0) {
    env.sunCol = noon.map((v, i) => (warm[i] + (v - warm[i]) * k) * day);
    env.amb = 0.55 + 0.45 * day; env.exposure = 0.82; env.shadows = day > 0.05;
  } else { // moonlight: a cool, dim key light from high in the opposite sky, so the house still reads at night
    env.sunDir = V3.norm([-0.35, 0.75, 0.45]); env.sunCol = [0.11, 0.15, 0.26];
    env.amb = 1.0; env.exposure = 1.25; env.shadows = true;
  }
  env.fog = 0.0085;
  // interior lights at night (closest 16 to camera target)
  const lights = [];
  if (isNight() || S.lightsAlways) {
    const tgt = E.cam.target; const act = S.project.floors[S.project.activeFloor];
    const rooms = act.rooms.filter(r => r.lights?.ambient !== false && !isYard(r)).map(r => ({ r, d: Math.hypot(r.x + r.w / 2 - tgt[0], r.y + r.d / 2 - tgt[2]) })).sort((a, b) => a.d - b.d).slice(0, 14);
    rooms.forEach(({ r }) => lights.push({ p: [r.x + r.w / 2, floorY(act) + act.height - 0.4, r.y + r.d / 2], c: r.lights.accent ? [2.4, 1.9, 1.3] : [1.9, 1.6, 1.15], r: Math.max(r.w, r.d) * 1.1 + 1 }));
    act.rooms.forEach(r => r.furniture.forEach(it => { if (it.type === 'floor_lamp' && lights.length < 16) lights.push({ p: [it.x, floorY(act) + 1.4, it.y], c: [1.3, 0.95, 0.55], r: 2.6 }); }));
  }
  E.setLights(lights);
  E.dirty = true;
  const el2 = document.getElementById('time-label'); if (el2) el2.textContent = fmtHour(h);
}
function setHour(h) { const wasNight = isNight(); S.hour = clamp(h, 0, 23.99); const ts = document.getElementById('time-slider'); if (ts) ts.value = S.hour; if (wasNight !== isNight()) rebuild(); else applyEnv(); if (S.view === '2d' && S.overlay === 'heat') render2D(); }

/* labels */
function updateLabels() {
  const box = document.getElementById('labels'); if (!box) return;
  if (!S.labels || CTL.mode === 'walk' || S.touring || S.view === '2d') { box.innerHTML = ''; box._k = ''; return; }
  const pj = P(); const act = pj.floors.length > 1 && S.showAllFloors && !S.cutaway ? pj.floors.slice().sort((a, b) => b.level - a.level)[0] : FL(); const yOff = floorY(act);
  const key = act.id + act.rooms.map(r => r.id + r.name).join('|');
  if (box._k !== key) { box.innerHTML = act.rooms.map(r => `<div class="lbl" data-act="select-room" data-id="${r.id}"><b>${esc(r.name)}</b><span>${r.w} × ${r.d} m</span></div>`).join(''); box._k = key; }
  [...box.children].forEach((el, i) => { const r = act.rooms[i]; if (!r) return; const p = E.project([r.x + r.w / 2, yOff + (S.cutaway ? 1.4 : act.height + 0.25), r.y + r.d / 2]); if (!p) { el.style.display = 'none'; return; } el.style.display = ''; el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%,-50%)`; el.classList.toggle('sel', S.sel && S.sel.kind === 'room' && S.sel.id === r.id); el.style.opacity = p[2] > 60 ? 0.4 : 1; });
}
function updateCompass() { const el = document.getElementById('compass-needle'); if (!el || !CTL) return; const c = E.cam; const ang = Math.atan2(c.target[0] - c.pos[0], -(c.target[2] - c.pos[2])) * 180 / Math.PI; el.style.transform = `rotate(${-(ang) - (S.project?.north || 0)}deg)`; }

/* picking & dragging */
function hitItems(px, py) {
  const ray = E.ray(px, py); let best = null;
  E.groups.forEach(g => { if (g.kind !== 'item' || !g.visible || !g.pick) return; const t = Engine.rayOBB(ray, { x: g.x, z: g.z, y0: g.y, h: g.pick.h, w: g.pick.w, d: g.pick.d, rot: g.rot }); if (t != null && (!best || t < best.t)) best = { t, g }; });
  return { best, ray };
}
function floorHit(ray, y) { if (Math.abs(ray.d[1]) < 1e-6) return null; const t = (y - ray.o[1]) / ray.d[1]; if (t < 0) return null; return [ray.o[0] + ray.d[0] * t, ray.o[2] + ray.d[2] * t]; }
function pick3D(px, py) {
  if (S.touring) return;
  const { best, ray } = hitItems(px, py);
  if (best) { select({ kind: 'item', id: best.g.ref }); return; }
  const f = FL(); const p = floorHit(ray, floorY(f) + FLOOR_TOP);
  if (p) { const r = roomAt(p[0], p[1], f); if (r) { select({ kind: 'room', id: r.id }); return; } }
  select(null);
}
let drag = null;
function dragStart3D(px, py) {
  if (S.touring || CTL.mode === 'walk') return false;
  const { best, ray } = hitItems(px, py);
  if (!best) return false;
  const f = FL(); const p = floorHit(ray, floorY(f) + FLOOR_TOP); if (!p) return false;
  const found = findItem(best.g.ref); if (!found) return false;
  drag = { g: best.g, it: found.it, room: found.room, off: [found.it.x - p[0], found.it.y - p[1]], start: [found.it.x, found.it.y], committed: false };
  select({ kind: 'item', id: found.it.id }, true);
  return true;
}
function drag3D(px, py) {
  if (!drag) return; const ray = E.ray(px, py); const p = floorHit(ray, floorY(FL()) + FLOOR_TOP); if (!p) return;
  if (!drag.committed) { commit('Move ' + CATALOG[drag.it.type].label); drag.committed = true; }
  drag.it.x = r2(snap(p[0] + drag.off[0])); drag.it.y = r2(snap(p[1] + drag.off[1]));
  drag.g.x = drag.it.x; drag.g.z = drag.it.y; drag.g.dirtyM = true; E.dirty = true;
  document.getElementById('viewport').classList.add('dragging');
}
function dragEnd3D() {
  if (!drag) return; document.getElementById('viewport').classList.remove('dragging');
  if (drag.committed) {
    const nr = roomAt(drag.it.x, drag.it.y, FL());
    if (nr && nr !== drag.room) { drag.room.furniture.splice(drag.room.furniture.indexOf(drag.it), 1); nr.furniture.push(drag.it); toast(`Moved ${CATALOG[drag.it.type].label} to ${nr.name}`); }
    else if (!nr) { drag.it.x = drag.start[0]; drag.it.y = drag.start[1]; toast('Furniture must stay inside a room'); }
    rebuild(); save();
  }
  drag = null;
}
function selectApply(sel) {
  if (!E) return; E.groups.forEach(g => g.hl = 0);
  if (!sel) return;
  const g = E.groups.get((sel.kind === 'item' ? 'item:' : 'room:') + sel.id); if (g) g.hl = sel.kind === 'item' ? 0.55 : 0.35;
}
function select(sel, silent) {
  S.sel = sel; selectApply(sel); if (E) E.dirty = true;
  if (S.view === '2d') render2D();
  renderInspector();
  if (sel && sel.kind === 'room' && !silent) { const r = findRoom(sel.id); if (r && ['space', 'light', 'transform', 'design'].includes(S.panel)) refreshSidePanel(); }
}

/* camera helpers */
function viewFrame() {
  const pj = P(); const whole = pj.floors.length > 1 && S.showAllFloors && !S.cutaway; const b = homeBounds(whole ? null : FL());
  if (!whole) return { b, c: [b.x + b.w / 2, floorY(FL()), b.y + b.d / 2], hgt: 0 };
  const top = pj.floors.slice().sort((x, y) => y.level - x.level)[0]; const hgt = floorY(top) + top.height;
  return { b, c: [b.x + b.w / 2, hgt * 0.42, b.y + b.d / 2], hgt };
}
function fitView(animate = true, top = false) {
  if (!CTL) return; const { b, c, hgt } = viewFrame(); const R = Math.max(b.w, b.d);
  const asp = E.canvas.clientWidth / Math.max(1, E.canvas.clientHeight); const half = Math.min(E.cam.fov / 2, Math.atan(Math.tan(E.cam.fov / 2) * asp));
  const rad = Math.hypot(b.w, b.d, top ? 0 : hgt) / 2 + 0.8; const r = rad / Math.sin(half) * (top ? 0.95 : 1.02); const theta = -0.62, phi = top ? 0.02 : (S.explode && hgt ? 1.02 : 0.8);
  const pos = [c[0] + r * Math.sin(phi) * Math.sin(theta), c[1] + r * Math.cos(phi), c[2] + r * Math.sin(phi) * Math.cos(theta)];
  CTL.mode = 'orbit';
  if (animate) return CTL.flyTo(pos, c, 1.3, { mode: 'orbit' });
  E.cam.pos = pos; E.cam.target = c; CTL.syncFromCam('orbit'); E.dirty = true; return Promise.resolve();
}
function presetView(v) {
  if (!CTL) return; const { b, c, hgt } = viewFrame(); const R = Math.max(b.w, b.d, hgt) * 1.3 + 4;
  const P = { top: [c[0], c[1] + R * 1.25, c[2] + 0.01], front: [c[0], c[1] + R * 0.45, c[2] + R], side: [c[0] + R, c[1] + R * 0.45, c[2]], iso: null }[v];
  if (v === 'iso' || !P) return fitView(true);
  if (CTL.mode === 'walk') setView('3d');
  CTL.flyTo(P, c, 1.1, { mode: 'orbit' });
}
function focusRoom(r) {
  if (!CTL) return; if (S.view === '2d') setView('3d');
  const f = floorOfRoom(r); if (S.project.floors.indexOf(f) !== S.project.activeFloor) { S.project.activeFloor = S.project.floors.indexOf(f); rebuild(); }
  const c = [r.x + r.w / 2, floorY(f) + 0.6, r.y + r.d / 2]; const R = Math.max(r.w, r.d) * 1.25 + 2.5;
  CTL.mode = 'orbit'; CTL.flyTo([c[0] - R * 0.32, c[1] + R * 1.25, c[2] + R * 0.5], c, 1.2, { mode: 'orbit' });
  select({ kind: 'room', id: r.id });
}
function roomShot(r, from) {
  const f = floorOfRoom(r), y = floorY(f) + 1.6; const c = [r.x + r.w / 2, floorY(f) + 1.0, r.y + r.d / 2];
  const ops = roomOpenings(r, f).filter(o => o.kind === 'door');
  let entry = null;
  if (from) entry = ops.find(o => roomSideOf(from, o.ref.o, o.ref.x, o.ref.y)) || null;
  if (!entry) entry = ops.find(o => o.ref.main) || ops[0] || null;
  const doorPt = entry ? (entry.side === 'N' || entry.side === 'S' ? [entry.t, y, entry.side === 'N' ? r.y : r.y + r.d] : [entry.side === 'W' ? r.x : r.x + r.w, y, entry.t]) : [r.x, y, r.y];
  // stand in a corner near the entry (away from the door leaf and tall furniture), looking across the room
  const small = area(r) < 6.5; const camY = small ? floorY(f) + 2.3 : y;
  const hinges = f.doors.map(d => d.o === 'h' ? [d.x - d.w / 2, d.y] : [d.x, d.y - d.w / 2]);
  const ins = small ? 0.28 : Math.min(0.55, Math.min(r.w, r.d) * 0.22);
  const cand = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.d], [r.x + r.w, r.y + r.d]].map(k => {
    const p = [k[0] + (k[0] === r.x ? ins : -ins), k[1] + (k[1] === r.y ? ins : -ins)];
    let pen = Math.hypot(k[0] - doorPt[0], k[1] - doorPt[2]);
    if (hinges.some(h => Math.hypot(h[0] - k[0], h[1] - k[1]) < 1.25)) pen += 50;
    if (!small && r.furniture.some(it => { if (CATALOG[it.type].flat || it.h < 1.1) return false; const fp = itemFootprint(it); return p[0] > fp.x - 0.35 && p[0] < fp.x + fp.w + 0.35 && p[1] > fp.y - 0.35 && p[1] < fp.y + fp.d + 0.35; })) pen += 20;
    return { k, p, pen };
  }).sort((a, b) => a.pen - b.pen);
  const k = cand[0].k; const pos = [cand[0].p[0], camY, cand[0].p[1]];
  const far = [r.x + r.w - (k[0] - r.x), floorY(f) + (small ? 0.4 : 0.9), r.y + r.d - (k[1] - r.y)];
  const target = V3.lerp([c[0], small ? floorY(f) + 0.5 : c[1], c[2]], far, 0.35);
  return { pos, target, door: entry ? doorPt : null };
}
/* stairs in walk mode: eye height follows the flight; reaching the top/bottom moves you to that floor */
function walkStairs(pos) {
  const pj = P(); const f = FL(); if (!f) return;
  const tOn = st => { if (!inRoom(stairFoot(st), pos[0], pos[2])) return null; const u = stairRun(st) === 'z' ? pos[2] - st.y : pos[0] - st.x; return clamp(u * stairDir(st) / stairLen(st) + 0.5, 0, 1); };
  const go = nf => { pj.activeFloor = pj.floors.indexOf(nf); rebuild(); renderFloorSeg(); toast(nf.name, 1400); };
  const up = floorAbove(f), lo = floorBelow(f);
  if (up) for (const st of f.stairs || []) { const t = tOn(st); if (t == null) continue; pos[1] = floorY(f) + 1.6 + t * (f.height + 0.25); if (t > 0.97) go(up); return; }
  if (lo) for (const st of stairsBelow(f)) { const t = tOn(st); if (t == null) continue; pos[1] = floorY(lo) + 1.6 + t * (lo.height + 0.25); if (t < 0.03) go(lo); return; }
  pos[1] = floorY(f) + 1.6;
}
function walkCollide(p, np) {
  if (S.touring) return true; const f = FL(); const yOff = floorY(f);
  const flights = [...(floorAbove(f) ? (f.stairs || []).map(st => [st, 'low']) : []), ...stairsBelow(f).map(st => [st, 'high'])];
  for (const [st, end] of flights) { // you can only step onto / off a flight at its walkable end (railings elsewhere)
    const ft = stairFoot(st), inN = inRoom(ft, np[0], np[2]), inP = inRoom(ft, p[0], p[2]); if (inN === inP) continue;
    const runZ = stairRun(st) === 'z', outer = inP ? np : p; const along = (runZ ? outer[2] - st.y : outer[0] - st.x) * (end === 'high' ? 1 : -1) * stairDir(st);
    const across = runZ ? Math.abs(np[0] - st.x) : Math.abs(np[2] - st.y);
    if (along < stairLen(st) / 2 - 0.08 || across > stairWidth(st) / 2) return false;
  }
  if (!f.rooms.some(r => inRoom(r, np[0], np[2], 0.6)) && !flights.some(([st]) => inRoom(stairFoot(st), np[0], np[2], 0.1))) {
    if (floorBelow(f)) return false; // upper floors: stay indoors (balcony railings stop you)
    const site = siteRect(homeBounds()), m = 0.45; // ground floor: walk anywhere inside the boundary wall
    if (np[0] < site.x0 + m || np[0] > site.x1 - m || np[2] < site.z0 + m || np[2] > site.z1 - m) return false;
  }
  if (flights.some(([st]) => inRoom(stairFoot(st), np[0], np[2]))) return true; // on the flight: side rails already enforced above
  const m = 0.22;
  for (const pc of wallPieces(f)) {
    if (pc.kind === 'lintel' || pc.kind === 'head') continue;
    if (pc.o === 'h') { if (Math.abs(np[2] - pc.c) < WALL_T / 2 + m && np[0] > pc.a - 0.02 && np[0] < pc.b + 0.02) return false; }
    else { if (Math.abs(np[0] - pc.c) < WALL_T / 2 + m && np[2] > pc.a - 0.02 && np[2] < pc.b + 0.02) return false; }
  }
  return true;
}
function startBuildAnim() { buildAnim = { t0: performance.now() }; }
function stepBuildAnim(t) {
  const k = clamp((t - buildAnim.t0) / 1800, 0, 1); const e = 1 - Math.pow(1 - k, 3);
  E.groups.forEach(g => {
    if (g.kind === 'wall') { g.sy = Math.max(0.001, e); g.dirtyM = true; }
    if (g.kind === 'door' || g.id.startsWith('doorframe')) g.visible = k > 0.7;
    if (g.kind === 'item') { if (g.baseY == null) g.baseY = g.y; const kk = clamp((k - 0.45 - (g.x * 0.013 % 0.2)) / 0.4, 0, 1); g.y = g.baseY + (1 - (1 - Math.pow(1 - kk, 3))) * 2.5; g.visible = kk > 0; g.dirtyM = true; }
  });
  E.dirty = true;
  if (k >= 1) { E.groups.forEach(g => { if (g.baseY != null) { g.y = g.baseY; delete g.baseY; } g.visible = true; g.sy = 1; g.dirtyM = true; }); buildAnim = null; }
}

/* ===================== 2D PLAN EDITOR (SVG) ===================== */
const V2 = { x: -1, y: -1, s: 50, w: 800, h: 600, init: false };
let tool2d = 'select', pendingType = null, drag2 = null;
function fit2D() {
  const el = document.getElementById('plan2d'); if (!el) return; const b = homeBounds(FL());
  V2.w = el.clientWidth || 800; V2.h = el.clientHeight || 600;
  V2.s = Math.min((V2.w - 80) / (b.w + 1), (V2.h - 80) / (b.d + 1)); V2.x = b.x + b.w / 2 - V2.w / 2 / V2.s; V2.y = b.y + b.d / 2 - V2.h / 2 / V2.s; V2.init = true;
}
const toPlan = (px, py) => [V2.x + px / V2.s, V2.y + py / V2.s];
function setTool(t, type) { tool2d = t; pendingType = type || null; document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); const el = document.getElementById('plan2d'); if (el) el.dataset.tool = t; const hint = { select: 'Drag rooms, edges and furniture. Del deletes · R rotates.', room: 'Drag to draw a new room.', door: 'Click on a wall to add a door.', window: 'Click on an outside wall to add a window.', place: `Click inside a room to place: ${pendingType ? CATALOG[pendingType].label : ''}` }[t]; const h = document.getElementById('tool-hint'); if (h) h.textContent = hint || ''; }
function render2D() {
  const el = document.getElementById('plan2d'); if (!el || !S.project) return;
  if (!V2.init || el.clientWidth !== V2.w) { const keep = V2.init; const ow = V2.w, oh = V2.h; if (!keep) fit2D(); else { V2.w = el.clientWidth; V2.h = el.clientHeight; } }
  const f = FL(), s = V2.s; const X = x => (x - V2.x) * s, Y = y => (y - V2.y) * s;
  const out = [];
  const gs = 0.5 * s; const ox = -V2.x * s % gs, oy = -V2.y * s % gs;
  out.push(`<defs><pattern id="g" width="${gs}" height="${gs}" patternUnits="userSpaceOnUse" x="${ox}" y="${oy}"><path d="M ${gs} 0 L 0 0 0 ${gs}" fill="none" stroke="rgba(148,163,184,.07)" stroke-width="1"/></pattern>
  <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#ec4899" stroke-width="3" opacity=".5"/></pattern>
  <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#22d3ee"/></marker></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>`);
  // rooms
  f.rooms.forEach(r => {
    const sel = S.sel && S.sel.kind === 'room' && S.sel.id === r.id;
    out.push(`<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w * s}" height="${r.d * s}" fill="${ROOM_TYPES[r.type].tint}" fill-opacity="${sel ? 0.3 : 0.13}" ${sel ? 'stroke="#a78bfa" stroke-width="2" stroke-dasharray="6 4"' : ''}/>`);
  });
  // heat overlay
  if (S.overlay === 'heat') { const cs = 0.25; f.rooms.forEach(r => { for (let x = r.x; x < r.x + r.w - 0.01; x += cs) for (let y = r.y; y < r.y + r.d - 0.01; y += cs) { const I = lightAt(f, x + cs / 2, y + cs / 2, S.hour); out.push(`<rect x="${X(x)}" y="${Y(y)}" width="${cs * s + 0.5}" height="${cs * s + 0.5}" fill="${I > 0.5 ? '#ffb300' : I > 0.25 ? '#ffd166' : '#5b6a8a'}" fill-opacity="${0.15 + I * 0.55}"/>`); } }); }
  // space overlay: unused corners & walkable
  if (S.overlay === 'space') f.rooms.forEach(r => { const a = analyzeSpace(r, f); if (a.corner) out.push(`<rect x="${X(a.corner.x)}" y="${Y(a.corner.y)}" width="${a.corner.w * s}" height="${a.corner.d * s}" fill="url(#hatch)" stroke="#ec4899" stroke-width="1.5"/><text x="${X(a.corner.x + a.corner.w / 2)}" y="${Y(a.corner.y + a.corner.d / 2)}" class="t-s" text-anchor="middle" fill="#f9a8d4">unused ${r2(a.corner.area)} m²</text>`); a.clear.filter(c => !c.ok).forEach(c => { const fp = itemFootprint(c.it); out.push(`<rect x="${X(fp.x)}" y="${Y(fp.y)}" width="${fp.w * s}" height="${fp.d * s}" fill="none" stroke="#ec4899" stroke-width="2.5"/>`); }); });
  // walls
  wallPieces(f).forEach(p => {
    const t = (p.ext ? 0.2 : 0.12) * s;
    if (p.kind === 'rail') { out.push(p.o === 'h' ? `<line x1="${X(p.a)}" y1="${Y(p.c)}" x2="${X(p.b)}" y2="${Y(p.c)}" stroke="#94a3b8" stroke-width="3" stroke-dasharray="2 3"/>` : `<line x1="${X(p.c)}" y1="${Y(p.a)}" x2="${X(p.c)}" y2="${Y(p.b)}" stroke="#94a3b8" stroke-width="3" stroke-dasharray="2 3"/>`); return; }
    if (p.kind === 'solid') { out.push(p.o === 'h' ? `<rect x="${X(p.a) - t / 2}" y="${Y(p.c) - t / 2}" width="${(p.b - p.a) * s + t}" height="${t}" fill="#cbd5e1"/>` : `<rect x="${X(p.c) - t / 2}" y="${Y(p.a) - t / 2}" width="${t}" height="${(p.b - p.a) * s + t}" fill="#cbd5e1"/>`); }
    else if (p.kind === 'sill') { const sel = S.sel && S.sel.kind === 'window' && S.sel.id === p.ref.id; const c = sel ? '#a78bfa' : '#22d3ee'; out.push(p.o === 'h' ? `<rect x="${X(p.a)}" y="${Y(p.c) - t / 2}" width="${(p.b - p.a) * s}" height="${t}" fill="rgba(6,182,212,.18)" stroke="${c}" stroke-width="1.5" data-win="${p.ref.id}"/><line x1="${X(p.a)}" y1="${Y(p.c)}" x2="${X(p.b)}" y2="${Y(p.c)}" stroke="${c}" stroke-width="1.5"/>` : `<rect x="${X(p.c) - t / 2}" y="${Y(p.a)}" width="${t}" height="${(p.b - p.a) * s}" fill="rgba(6,182,212,.18)" stroke="${c}" stroke-width="1.5"/><line x1="${X(p.c)}" y1="${Y(p.a)}" x2="${X(p.c)}" y2="${Y(p.b)}" stroke="${c}" stroke-width="1.5"/>`); }
  });
  f.doors.forEach(d => {
    const w = d.w * s, sel = S.sel && S.sel.kind === 'door' && S.sel.id === d.id; const c = sel ? '#a78bfa' : d.main ? '#f472b6' : '#94a3b8';
    if (d.o === 'h') { const hx = X(d.x - d.w / 2), hy = Y(d.y); out.push(`<path d="M ${hx} ${hy} L ${hx} ${hy + w} A ${w} ${w} 0 0 0 ${hx + w} ${hy}" fill="${sel ? 'rgba(124,58,237,.15)' : 'rgba(255,255,255,.03)'}" stroke="${c}" stroke-width="${d.main ? 2.2 : 1.4}"/>`); }
    else { const hx = X(d.x), hy = Y(d.y - d.w / 2); out.push(`<path d="M ${hx} ${hy} L ${hx + w} ${hy} A ${w} ${w} 0 0 1 ${hx} ${hy + w}" fill="${sel ? 'rgba(124,58,237,.15)' : 'rgba(255,255,255,.03)'}" stroke="${c}" stroke-width="${d.main ? 2.2 : 1.4}"/>`); }
    if (d.main) out.push(`<text x="${X(d.x)}" y="${Y(d.y) - (d.o === 'h' ? 8 : 0)}" class="t-s" text-anchor="middle" fill="#f472b6">ENTRY</text>`);
  });
  // furniture
  f.rooms.forEach(r => r.furniture.forEach(it => {
    const c = CATALOG[it.type]; const pal = palette(r, it); const sel = S.sel && S.sel.kind === 'item' && S.sel.id === it.id;
    const fill = c.flat ? pal.rug : '#1e293b';
    const W = it.w * s, D = it.d * s;
    out.push(`<g transform="translate(${X(it.x)} ${Y(it.y)}) rotate(${-it.rot})" class="furn${sel ? ' sel' : ''}">
      <rect x="${-W / 2}" y="${-D / 2}" width="${W}" height="${D}" rx="${Math.min(4, W / 6)}" fill="${fill}" fill-opacity="${c.flat ? 0.35 : 0.92}" stroke="${sel ? '#a78bfa' : '#64748b'}" stroke-width="${sel ? 2.2 : 1}"/>
      ${c.flat ? '' : `<rect x="${-W / 2}" y="${-D / 2}" width="${W}" height="${Math.max(2, D * 0.12)}" fill="${pal.wood}" opacity=".6"/>`}
      ${Math.min(W, D) > 16 ? `<text x="0" y="${Math.min(W, D) * 0.16}" text-anchor="middle" font-size="${Math.min(W, D) * 0.42}" transform="rotate(${it.rot})">${c.icon}</text>` : ''}</g>`);
  }));
  // stairs
  const st2d = (st, tag) => { const ft = stairFoot(st), runZ = stairRun(st) === 'z', L = stairLen(st), n = 12; const lines = Array.from({ length: n - 1 }, (_, i) => { const u = L * (i + 1) / n; return runZ ? `<line x1="${X(ft.x)}" x2="${X(ft.x + ft.w)}" y1="${Y(ft.y + u)}" y2="${Y(ft.y + u)}"/>` : `<line y1="${Y(ft.y)}" y2="${Y(ft.y + ft.d)}" x1="${X(ft.x + u)}" x2="${X(ft.x + u)}"/>`; }).join('');
    const lw = stairEnd(st, 'low', -0.15), hi = stairEnd(st, 'high', -0.15); const up = tag === 'UP'; const tp = stairEnd(st, up ? 'low' : 'high', -0.45);
    return `<g class="stair2d"><rect x="${X(ft.x)}" y="${Y(ft.y)}" width="${ft.w * s}" height="${ft.d * s}" fill="${up ? '#1e293b' : 'rgba(30,41,59,.35)'}" stroke="#f59e0b" stroke-width="1.2" ${up ? '' : 'stroke-dasharray="5 4"'}/><g stroke="#64748b" stroke-width=".7">${up ? lines : ''}</g><line x1="${X(lw[0])}" y1="${Y(lw[1])}" x2="${X(hi[0])}" y2="${Y(hi[1])}" stroke="#f59e0b" stroke-width="1.4" marker-end="url(#ar2d)"/><text x="${X(tp[0])}" y="${Y(tp[1]) + 4}" text-anchor="middle" class="t-s" fill="#f59e0b">${up ? 'UP' : 'DN'}</text></g>`; };
  out.push(`<defs><marker id="ar2d" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f59e0b"/></marker></defs>`);
  if (floorAbove(f)) (f.stairs || []).forEach(st => out.push(st2d(st, 'UP'))); stairsBelow(f).forEach(st => out.push(st2d(st, 'DN')));
  // airflow overlay
  if (S.overlay === 'air') f.rooms.forEach(r => { const ops = roomOpenings(r, f).filter(o => (o.kind === 'window' && o.ext) || o.kind === 'door'); const pt = o => o.side === 'N' || o.side === 'S' ? [o.t, o.side === 'N' ? r.y : r.y + r.d] : [o.side === 'W' ? r.x : r.x + r.w, o.t]; const wins = ops.filter(o => o.kind === 'window'); wins.forEach(w => { const targets = ops.filter(o => o !== w && o.side !== w.side); targets.slice(0, 2).forEach(o => { const a = pt(w), b = pt(o); const mx = (a[0] + b[0]) / 2 + (r.x + r.w / 2 - (a[0] + b[0]) / 2) * 0.5, my = (a[1] + b[1]) / 2 + (r.y + r.d / 2 - (a[1] + b[1]) / 2) * 0.5; out.push(`<path class="flow" d="M ${X(a[0])} ${Y(a[1])} Q ${X(mx)} ${Y(my)} ${X(b[0])} ${Y(b[1])}" fill="none" stroke="#22d3ee" stroke-width="${o.kind === 'window' ? 3 : 1.8}" stroke-dasharray="8 6" marker-end="url(#arr)" opacity=".85"/>`); }); if (!targets.length) out.push(`<circle cx="${X(pt(w)[0])}" cy="${Y(pt(w)[1])}" r="10" fill="none" stroke="#ec4899" stroke-width="2" stroke-dasharray="3 3"/>`); }); });
  // connectivity overlay
  if (S.overlay === 'graph') { const con = connectivity(f); f.rooms.forEach(a => (con.adj.get(a.id) || []).forEach(bid => { const b = findRoom(bid); if (a.id < bid) out.push(`<line x1="${X(a.x + a.w / 2)}" y1="${Y(a.y + a.d / 2)}" x2="${X(b.x + b.w / 2)}" y2="${Y(b.y + b.d / 2)}" stroke="#10b981" stroke-width="3" opacity=".7"/>`); })); f.rooms.forEach(a => out.push(`<circle cx="${X(a.x + a.w / 2)}" cy="${Y(a.y + a.d / 2)}" r="9" fill="${con.unreachable.includes(a) ? '#ec4899' : a === con.start ? '#8b5cf6' : '#10b981'}" stroke="#0b0f19" stroke-width="2"/>`)); }
  // labels
  f.rooms.forEach(r => { const fs = clamp(Math.min(r.w, r.d) * s * 0.14, 9, 15); out.push(`<g class="rlabel" transform="translate(${X(r.x + r.w / 2)} ${Y(r.y + r.d / 2)})"><text text-anchor="middle" font-size="${fs}" font-weight="700" fill="#f8fafc" y="${-fs * 0.2}">${esc(r.name)}</text><text text-anchor="middle" font-size="${fs * 0.78}" fill="#94a3b8" y="${fs}">${r.w} × ${r.d} m · ${r2(area(r))} m²</text></g>`); });
  // selection extras
  if (S.sel && S.sel.kind === 'room') { const r = findRoom(S.sel.id); if (r && f.rooms.includes(r)) {
    const hs = 7; [['n', r.x + r.w / 2, r.y], ['s', r.x + r.w / 2, r.y + r.d], ['w', r.x, r.y + r.d / 2], ['e', r.x + r.w, r.y + r.d / 2]].forEach(([k, x, y]) => out.push(`<rect class="handle" data-h="${k}" x="${X(x) - hs}" y="${Y(y) - hs}" width="${hs * 2}" height="${hs * 2}" rx="3"/>`));
    out.push(`<g class="dim"><line x1="${X(r.x)}" y1="${Y(r.y) - 18}" x2="${X(r.x + r.w)}" y2="${Y(r.y) - 18}"/><text x="${X(r.x + r.w / 2)}" y="${Y(r.y) - 23}" text-anchor="middle">${r.w} m</text><line x1="${X(r.x) - 18}" y1="${Y(r.y)}" x2="${X(r.x) - 18}" y2="${Y(r.y + r.d)}"/><text transform="translate(${X(r.x) - 23} ${Y(r.y + r.d / 2)}) rotate(-90)" text-anchor="middle">${r.d} m</text></g>`);
  } }
  if (drag2 && drag2.kind === 'draw') { const a = drag2.a, b = drag2.b; out.push(`<rect x="${X(Math.min(a[0], b[0]))}" y="${Y(Math.min(a[1], b[1]))}" width="${Math.abs(b[0] - a[0]) * s}" height="${Math.abs(b[1] - a[1]) * s}" fill="rgba(124,58,237,.15)" stroke="#a78bfa" stroke-width="2" stroke-dasharray="6 4"/><text x="${X((a[0] + b[0]) / 2)}" y="${Y((a[1] + b[1]) / 2)}" text-anchor="middle" class="t-s">${r2(Math.abs(b[0] - a[0]))} × ${r2(Math.abs(b[1] - a[1]))} m</text>`); }
  // north arrow & scale bar
  out.push(`<g transform="translate(${V2.w - 46} 46) rotate(${S.project.north || 0})"><circle r="20" fill="#111827" stroke="rgba(255,255,255,.15)"/><path d="M0,-15 L6,6 L0,2 L-6,6 z" fill="#a78bfa"/><text y="-22" text-anchor="middle" class="t-s" font-weight="700">N</text></g>`);
  out.push(`<g transform="translate(20 ${V2.h - 22})"><rect width="${s}" height="5" fill="#cbd5e1"/><rect x="${s}" width="${s}" height="5" fill="#0b0f19" stroke="#cbd5e1"/><text y="-5" class="t-s">0</text><text x="${s * 2}" y="-5" class="t-s" text-anchor="end">2 m</text></g>`);
  el.innerHTML = `<svg width="${V2.w}" height="${V2.h}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}
function hit2D(p) {
  const f = FL();
  if (S.sel && S.sel.kind === 'room') { const r = findRoom(S.sel.id); if (r) { const hs = 10 / V2.s; for (const [k, x, y] of [['n', r.x + r.w / 2, r.y], ['s', r.x + r.w / 2, r.y + r.d], ['w', r.x, r.y + r.d / 2], ['e', r.x + r.w, r.y + r.d / 2]]) if (Math.abs(p[0] - x) < hs && Math.abs(p[1] - y) < hs) return { kind: 'handle', h: k, room: r }; } }
  let items = []; f.rooms.forEach(r => r.furniture.forEach(it => { const fp = itemFootprint(it); if (p[0] >= fp.x && p[0] <= fp.x + fp.w && p[1] >= fp.y && p[1] <= fp.y + fp.d) items.push({ it, r, a: fp.w * fp.d, flat: CATALOG[it.type].flat }); }));
  items.sort((a, b) => (a.flat - b.flat) || a.a - b.a); if (items.length) return { kind: 'item', it: items[0].it, room: items[0].r };
  const tol = 0.25;
  for (const d of f.doors) { if ((d.o === 'h' && Math.abs(p[1] - d.y) < tol && Math.abs(p[0] - d.x) < d.w / 2) || (d.o === 'v' && Math.abs(p[0] - d.x) < tol && Math.abs(p[1] - d.y) < d.w / 2)) return { kind: 'door', d }; }
  for (const w of f.windows) { if ((w.o === 'h' && Math.abs(p[1] - w.y) < tol && Math.abs(p[0] - w.x) < w.w / 2) || (w.o === 'v' && Math.abs(p[0] - w.x) < tol && Math.abs(p[1] - w.y) < w.w / 2)) return { kind: 'window', w }; }
  const r = roomAt(p[0], p[1], f); if (r) return { kind: 'room', room: r };
  return null;
}
function nearestWall(p, f = FL()) { let best = null; wallLines(f).forEach(L => { const t = clamp(L.o === 'h' ? p[0] : p[1], L.a, L.b); const d = L.o === 'h' ? Math.hypot(p[0] - t, p[1] - L.c) : Math.hypot(p[0] - L.c, p[1] - t); if (d < 0.45 && (!best || d < best.d)) best = { d, L, t }; }); return best; }
function edgeSnap(v, axis, except) { let best = null; FL().rooms.forEach(r => { if (r === except) return; (axis === 'x' ? [r.x, r.x + r.w] : [r.y, r.y + r.d]).forEach(e => { if (Math.abs(e - v) < 0.2 && (!best || Math.abs(e - v) < Math.abs(best - v))) best = e; }); }); return best != null ? best : snap(v); }
function init2D() {
  const el = document.getElementById('plan2d');
  el.addEventListener('pointerdown', e => {
    if (S.view !== '2d') return; el.setPointerCapture(e.pointerId);
    const rc = el.getBoundingClientRect(); const px = e.clientX - rc.left, py = e.clientY - rc.top; const p = toPlan(px, py);
    if (tool2d === 'room') { drag2 = { kind: 'draw', a: [snap(p[0]), snap(p[1])], b: [snap(p[0]), snap(p[1])] }; return; }
    if (tool2d === 'door' || tool2d === 'window') {
      const nw = nearestWall(p); if (!nw) { toast('Click closer to a wall'); return; }
      const L = nw.L; const w = tool2d === 'door' ? 0.9 : 1.2; if (L.b - L.a < w + 0.1) { toast('That wall segment is too short'); return; }
      const t = clamp(snap(nw.t), L.a + w / 2 + 0.05, L.b - w / 2 - 0.05);
      if (tool2d === 'window' && !isExteriorPoint(FL(), L.o, L.c, t)) { toast('Windows go on outside walls'); return; }
      commit('Add ' + tool2d);
      const o = { id: uid(tool2d[0]), o: L.o, x: L.o === 'h' ? t : L.c, y: L.o === 'h' ? L.c : t, w };
      if (tool2d === 'door') FL().doors.push(o); else FL().windows.push(Object.assign(o, { sill: 0.9, h: 1.25 }));
      S.sel = { kind: tool2d, id: o.id }; setTool('select'); rebuild(); renderInspector(); save(); return;
    }
    if (tool2d === 'place' && pendingType) {
      const r = roomAt(p[0], p[1]); if (!r) { toast('Click inside a room'); return; }
      commit('Place ' + CATALOG[pendingType].label); const it = makeItem(pendingType, r, { x: r2(snap(p[0])), y: r2(snap(p[1])) }); r.furniture.push(it);
      S.sel = { kind: 'item', id: it.id }; setTool('select'); rebuild(); renderInspector(); save(); return;
    }
    const h = hit2D(p);
    if (h && h.kind === 'handle') drag2 = { kind: 'resize', h: h.h, room: h.room, p0: p, r0: { ...h.room }, committed: false };
    else if (h && h.kind === 'item') { S.sel = { kind: 'item', id: h.it.id }; drag2 = { kind: 'item', it: h.it, room: h.room, off: [h.it.x - p[0], h.it.y - p[1]], committed: false, start: [h.it.x, h.it.y] }; }
    else if (h && h.kind === 'door') { S.sel = { kind: 'door', id: h.d.id }; drag2 = { kind: 'opening', o: h.d, committed: false }; }
    else if (h && h.kind === 'window') { S.sel = { kind: 'window', id: h.w.id }; drag2 = { kind: 'opening', o: h.w, committed: false }; }
    else if (h && h.kind === 'room') { S.sel = { kind: 'room', id: h.room.id }; drag2 = { kind: 'moveroom', room: h.room, p0: p, r0: { x: h.room.x, y: h.room.y }, committed: false }; }
    else { S.sel = null; drag2 = { kind: 'pan', px, py, x: V2.x, y: V2.y }; }
    selectApply(S.sel); renderInspector(); render2D();
  });
  el.addEventListener('pointermove', e => {
    if (!drag2) return; const rc = el.getBoundingClientRect(); const px = e.clientX - rc.left, py = e.clientY - rc.top; const p = toPlan(px, py);
    const once = label => { if (!drag2.committed) { commit(label); drag2.committed = true; } };
    if (drag2.kind === 'pan') { V2.x = drag2.x - (px - drag2.px) / V2.s; V2.y = drag2.y - (py - drag2.py) / V2.s; render2D(); return; }
    if (drag2.kind === 'draw') { drag2.b = [snap(p[0]), snap(p[1])]; render2D(); return; }
    if (drag2.kind === 'item') { once('Move furniture'); drag2.it.x = r2(snap(p[0] + drag2.off[0])); drag2.it.y = r2(snap(p[1] + drag2.off[1])); render2D(); return; }
    if (drag2.kind === 'opening') { const o = drag2.o; const nw = nearestWall(p); if (!nw) return; once('Move opening'); const L = nw.L; const t = clamp(snap(nw.t), L.a + o.w / 2 + 0.05, L.b - o.w / 2 - 0.05); o.o = L.o; o.x = L.o === 'h' ? t : L.c; o.y = L.o === 'h' ? L.c : t; render2D(); return; }
    if (drag2.kind === 'moveroom') {
      const r = drag2.room; const dx = snap(p[0] - drag2.p0[0]), dy = snap(p[1] - drag2.p0[1]); if (!drag2.committed && Math.abs(dx) + Math.abs(dy) < 0.05) return; once('Move room');
      const nx = edgeSnap(drag2.r0.x + dx, 'x', r), ny = edgeSnap(drag2.r0.y + dy, 'y', r); const mx = nx - r.x, my = ny - r.y;
      if (!drag2.ops) { const f = FL(); drag2.ops = [...f.doors, ...f.windows].filter(o => roomSideOf(r, o.o, o.x, o.y) && isExteriorPoint(f, o.o, o.o === 'h' ? o.y : o.x, o.o === 'h' ? o.x : o.y)); }
      r.x = r2(nx); r.y = r2(ny); r.furniture.forEach(it => { it.x = r2(it.x + mx); it.y = r2(it.y + my); }); drag2.ops.forEach(o => { o.x = r2(o.x + mx); o.y = r2(o.y + my); }); render2D(); return;
    }
    if (drag2.kind === 'resize') {
      const r = drag2.room, r0 = drag2.r0; once('Resize ' + r.name);
      if (!drag2.warned) { const f = FL(); const mid = drag2.h === 'n' ? ['h', r0.y, r0.x + r0.w / 2] : drag2.h === 's' ? ['h', r0.y + r0.d, r0.x + r0.w / 2] : drag2.h === 'w' ? ['v', r0.x, r0.y + r0.d / 2] : ['v', r0.x + r0.w, r0.y + r0.d / 2]; drag2.ext = isExteriorPoint(f, mid[0], mid[1], mid[2]); drag2.warned = true; }
      if (drag2.h === 'e') r.w = r2(Math.max(0.8, edgeSnap(p[0], 'x', r) - r.x));
      if (drag2.h === 's') r.d = r2(Math.max(0.8, edgeSnap(p[1], 'y', r) - r.y));
      if (drag2.h === 'w') { const nx = Math.min(edgeSnap(p[0], 'x', r), r0.x + r0.w - 0.8); r.w = r2(r0.x + r0.w - nx); r.x = r2(nx); }
      if (drag2.h === 'n') { const ny = Math.min(edgeSnap(p[1], 'y', r), r0.y + r0.d - 0.8); r.d = r2(r0.y + r0.d - ny); r.y = r2(ny); }
      render2D(); renderInspector(); return;
    }
  });
  el.addEventListener('pointerup', () => {
    if (!drag2) return; const d = drag2; drag2 = null;
    if (d.kind === 'draw') { const a = d.a, b = d.b; const w = r2(Math.abs(b[0] - a[0])), dd = r2(Math.abs(b[1] - a[1])); if (w >= 0.8 && dd >= 0.8) { commit('Add room'); const r = makeRoom({ name: 'New Room', type: 'empty', x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w, d: dd }); FL().rooms.push(r); S.sel = { kind: 'room', id: r.id }; setTool('select'); rebuild(); renderInspector(); save(); toast('Room added — set its type in the inspector'); } else render2D(); return; }
    if (d.kind === 'item' && d.committed) { const nr = roomAt(d.it.x, d.it.y); if (nr && nr !== d.room) { d.room.furniture.splice(d.room.furniture.indexOf(d.it), 1); nr.furniture.push(d.it); } else if (!nr) { d.it.x = d.start[0]; d.it.y = d.start[1]; } }
    if (d.kind === 'resize' && d.committed && d.ext) { const msg = `${d.room.name}: an outer wall was moved. External walls are typically load-bearing — have a structural engineer review this change.`; S.structuralLog.push(msg); toast('⚠️ Structural warning: outer wall moved — flagged for professional review', 4200); }
    if (d.kind === 'resize' && d.committed && !d.ext) toast('Partition wall moved. Check adjoining room sizes.');
    if (d.committed) { rebuild(); save(); }
  });
  el.addEventListener('wheel', e => { if (S.view !== '2d') return; e.preventDefault(); const rc = el.getBoundingClientRect(); const px = e.clientX - rc.left, py = e.clientY - rc.top; const p = toPlan(px, py); V2.s = clamp(V2.s * (e.deltaY > 0 ? 0.9 : 1.1), 8, 300); V2.x = p[0] - px / V2.s; V2.y = p[1] - py / V2.s; render2D(); }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select')) return; if (!S.project || document.getElementById('app').dataset.screen !== 'work') return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); deleteSelected(); }
    if (e.key.toLowerCase() === 'r' && S.sel && S.sel.kind === 'item' && CTL?.mode !== 'walk') rotateSelected();
    if (e.key === 'Escape') { setTool('select'); if (S.touring) stopTour(); else if (CTL && CTL.mode === 'walk' && S.view === 'walk') setView('3d'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  });
}
function deleteSelected() {
  const s = S.sel; if (!s) return; commit('Delete');
  if (s.kind === 'item') { const f = findItem(s.id); if (f) f.room.furniture.splice(f.room.furniture.indexOf(f.it), 1); }
  else if (s.kind === 'room') { const r = findRoom(s.id); const f = floorOfRoom(r); f.rooms.splice(f.rooms.indexOf(r), 1); }
  else if (s.kind === 'door') { const f = FL(); f.doors = f.doors.filter(d => d.id !== s.id); }
  else if (s.kind === 'window') { const f = FL(); f.windows = f.windows.filter(d => d.id !== s.id); }
  S.sel = null; rebuild(); renderInspector(); save();
}
function rotateSelected(deg = 90) { const f = S.sel && findItem(S.sel.id); if (!f) return; commit('Rotate'); f.it.rot = (f.it.rot + deg + 360) % 360; rebuild(); renderInspector(); save(); }

/* ===================== ARIA'S ANIMATED HOME TOUR ===================== */
const TOUR = { order: [], i: -1, token: 0, paused: false, voice: true, narr: {}, speaking: false };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function pickVoice() { try { const vs = speechSynthesis.getVoices(); return vs.find(v => /en-IN/i.test(v.lang) && /female|veena|heera|neerja/i.test(v.name)) || vs.find(v => /en-IN/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang) && /female/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)); } catch (e) { return null; } }
function speak(text, tok) {
  setCaption(text); setTalking(true);
  const words = text.split(/\s+/).length; const est = Math.max(3500, words / 2.6 * 1000);
  return new Promise(res => {
    let finished = false; const done = () => { if (finished) return; finished = true; setTalking(false); res(); };
    if (TOUR.voice && 'speechSynthesis' in window) {
      try {
        speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); const v = pickVoice(); if (v) u.voice = v; u.rate = 1.0; u.pitch = 1.05;
        u.onend = done; u.onerror = () => setTimeout(done, est); speechSynthesis.speak(u);
        setTimeout(() => { if (!finished && !speechSynthesis.speaking && !speechSynthesis.pending && !TOUR.paused) { (async () => { let t = 1200; while (t < est && !finished) { await sleep(200); if (tok !== TOUR.token) break; if (!TOUR.paused) t += 200; } done(); })(); } }, 1200);
        // safety: some browsers never fire onend
        const guard = async () => { const t0 = Date.now(); while (!finished) { await sleep(250); if (tok !== TOUR.token) return done(); if (TOUR.paused) continue; if (Date.now() - t0 > est * 1.6 + 3000) return done(); } }; guard();
        return;
      } catch (e) { }
    }
    (async () => { let t = 0; while (t < est) { await sleep(200); if (tok !== TOUR.token) break; if (!TOUR.paused) t += 200; } done(); })();
  });
}
function setCaption(t) { const el = document.getElementById('tour-caption'); if (el) { el.classList.remove('in'); void el.offsetWidth; el.textContent = t; el.classList.add('in'); } }
function setTalking(on) { TOUR.speaking = on; document.querySelectorAll('.aria-avatar').forEach(a => a.classList.toggle('talking', on)); }
async function waitPaused(tok) { while (TOUR.paused && tok === TOUR.token) await sleep(150); return tok === TOUR.token; }
function tourOrder() {
  const out = []; const floors = P().floors.slice().sort((a, b) => a.level - b.level);
  floors.forEach((f, k) => {
    const con = connectivity(f); let start = con.start;
    if (k > 0) { const st = stairsBelow(f)[0]; if (st) start = roomAt(...stairEnd(st, 'high', 0.5), f) || start; }
    const ids = [], seen = new Set(); const q = start ? [start.id] : []; if (start) seen.add(start.id);
    while (q.length) { const id = q.shift(); ids.push(id); (con.adj.get(id) || []).forEach(n => { if (!seen.has(n)) { seen.add(n); q.push(n); } }); }
    f.rooms.forEach(r => { if (!seen.has(r.id)) ids.push(r.id); });
    const wells = [...(f.stairs || []), ...stairsBelow(f)].map(stairFoot);
    out.push(...ids.map(findRoom).filter(r => r && !(r.type === 'hall' && (area(r) < 3 || /stair|landing/i.test(r.name) || wells.some(w => rectOverlap(w, r) > area(r) * 0.35)))));
  });
  return out;
}
/* camera path up (or down) the staircase between two floors */
function stairPath(fromF, toF) {
  const goingUp = toF.level > fromF.level; const lo = goingUp ? fromF : toF, up = goingUp ? toF : fromF; const st = (lo.stairs || [])[0]; if (!st || Math.abs(toF.level - fromF.level) !== 1) return null;
  const yl = floorY(lo) + 1.6, yu = floorY(up) + 1.6; const lw0 = stairEnd(st, 'low', 0.9), lw = stairEnd(st, 'low', 0), hi = stairEnd(st, 'high', 0.15), hi1 = stairEnd(st, 'high', 1.0);
  const pts = [[lw0[0], yl, lw0[1]], [lw[0], yl + 0.1, lw[1]], [hi[0], yu, hi[1]], [hi1[0], yu, hi1[1]]];
  const look = (a, b) => { const d = V3.sub(b, a); return V3.add(b, V3.scale(V3.norm(d), 2)); };
  if (!goingUp) pts.reverse();
  return { pos: pts, tgt: pts.map((p, i) => look(pts[Math.max(0, i - 1)], pts[Math.min(pts.length - 1, i + 1)])), arrive: goingUp ? roomAt(hi1[0], hi1[1], up) : roomAt(lw0[0], lw0[1], lo) };
}
async function startTour(fromIndex = 0) {
  if (!S.project || !E) return;
  if (S.view === '2d') setView('3d');
  if (CTL.mode === 'walk') { CTL.mode = 'orbit'; }
  stopSpeech();
  const tok = ++TOUR.token; TOUR.paused = false; S.touring = true; select(null);
  TOUR.order = (await serverTourOrder()) || tourOrder(); TOUR.i = fromIndex - 1;
  if (TOUR.order[0]) P().activeFloor = P().floors.indexOf(floorOfRoom(TOUR.order[Math.max(0, fromIndex)] || TOUR.order[0]));
  TOUR.narr = {}; TOUR.order.forEach(r => TOUR.narr[r.id] = templateNarration(r));
  TOUR.intro = `Hi, I'm Aria, your DIMORA guide! Welcome to ${P().name}: ${P().floors.length > 1 ? P().floors.length + ' floors, ' : ''}${allRooms().length} rooms and about ${Math.round(allRooms().reduce((s, r) => s + area(r), 0) * SQFT)} square feet, styled ${P().theme}. Let's walk through it together — you can pause anytime and ask me to change things.`;
  TOUR.outro = `That's the tour! The complete interior is estimated at ${inr(homeCost().total)}. Ask me to tweak anything, or open the Home Decision Report for the full breakdown.`;
  document.getElementById('app').classList.add('touring'); CTL.enabled = false;
  renderTourUI(); rebuild();
  if (aiOn()) { setTourStatus(`${modelLabel()} is writing your personalised narration…`); serverNarrations(TOUR.order).then(j => { if (tok !== TOUR.token) return; if (j.intro) TOUR.intro = j.intro; if (j.outro) TOUR.outro = j.outro; Object.entries(j.rooms || {}).forEach(([k, v]) => { if (TOUR.narr[k] && v) TOUR.narr[k] = v; }); setTourStatus('Narration by ' + (j.via ? 'Qwen' : modelLabel())); }).catch(e => setTourStatus('Narration: on-device (' + modelLabel() + ' unavailable)')); }
  else setTourStatus(S.backendOK ? 'Narration: on-device · connect Qwen in ⚙ for AI-written narration' : 'Narration: on-device · start the DIMORA backend for AI narration');
  const b = homeBounds(FL()), c = [b.x + b.w / 2, floorY(FL()), b.y + b.d / 2], R = Math.max(b.w, b.d);
  if (fromIndex === 0) {
    const ring = [0, 1, 2].map(i => { const a = -0.6 + i * 0.75; return [c[0] + Math.sin(a) * R * 1.15, c[1] + R * 0.75, c[2] + Math.cos(a) * R * 1.15]; });
    const sp = speak(TOUR.intro, tok);
    await CTL.flyPath(ring, ring.map(() => c), 7.5);
    await sp; if (!(await waitPaused(tok))) return;
  }
  await tourLoop(tok);
}
async function tourLoop(tok) {
  while (tok === TOUR.token) {
    TOUR.i++;
    if (TOUR.i >= TOUR.order.length) break;
    const r = TOUR.order[TOUR.i]; let prev = TOUR.order[TOUR.i - 1];
    const fr = floorOfRoom(r), pj = P();
    if (pj.floors.indexOf(fr) !== pj.activeFloor) { // change floor: ride the staircase
      const fromF = pj.floors[pj.activeFloor]; pj.activeFloor = pj.floors.indexOf(fr); rebuild(); renderTourUI();
      const sp = prev ? stairPath(fromF, fr) : null;
      if (sp) { const say = speak(fr.level > fromF.level ? `Let's head up the stairs to the ${fr.name}.` : `Now back down to the ${fr.name}.`, tok);
        // walk through the door of the room the flight starts in, then ride the stairs
        const p0 = sp.pos[0], sr = roomAt(p0[0], p0[2], fromF); const via = [], vt = [];
        if (sr && prev && sr !== prev) { const sh = roomShot(sr, prev); if (sh.door) { const out = V3.add(sh.door, V3.scale(V3.norm(V3.sub(sh.door, p0)), 0.8)); via.push(out, sh.door); vt.push(sh.door, p0); } }
        await CTL.flyPath([...via, ...sp.pos], [...vt, ...sp.tgt], 3.2 + via.length * 0.8); await say; if (tok !== TOUR.token) return; prev = sp.arrive || null; }
      else prev = null;
    }
    renderTourUI();
    const shot = roomShot(r, prev);
    const via = [];
    if (shot.door) { const tc = [shot.target[0], shot.door[1], shot.target[2]]; const out = V3.add(shot.door, V3.scale(V3.norm(V3.sub(shot.door, tc)), 0.9)); const inn = V3.add(shot.door, V3.scale(V3.norm(V3.sub(tc, shot.door)), 0.5)); if (!prev) via.push([out[0], out[1] + 2.5, out[2]]); via.push(out, shot.door, inn); }
    const targets = via.map(() => shot.target);
    await CTL.flyPath([...via, shot.pos], [...targets, shot.target], prev ? 2.6 : 3.4);
    if (tok !== TOUR.token) return;
    // slow cinematic drift while narrating
    const drift = V3.lerp(shot.pos, [shot.target[0], shot.pos[1], shot.target[2]], 0.12); const side = [shot.target[0] + (shot.target[2] - shot.pos[2]) * 0.3, shot.target[1], shot.target[2] - (shot.target[0] - shot.pos[0]) * 0.3];
    const narr = TOUR.narr[r.id] || templateNarration(r);
    CTL.flyTo(drift, side, Math.max(6, narr.split(/\s+/).length / 2.6), { locked: true, ease: t => t });
    await speak(narr, tok);
    if (!(await waitPaused(tok))) return;
    await sleep(350);
  }
  if (tok !== TOUR.token) return;
  TOUR.i = TOUR.order.length; renderTourUI();
  const b = homeBounds(FL()), c = [b.x + b.w / 2, floorY(FL()), b.y + b.d / 2], R = Math.max(b.w, b.d);
  CTL.flyTo([c[0] - R * 0.6, c[1] + R * 1.1, c[2] + R * 0.9], c, 3, { locked: true });
  await speak(TOUR.outro, tok);
  if (tok === TOUR.token) { setTourStatus('Tour complete — ask Aria for changes or replay.'); document.getElementById('tour-play').innerHTML = '↻'; TOUR.ended = true; }
}
function stopSpeech() { try { speechSynthesis.cancel(); } catch (e) { } setTalking(false); }
function stopTour() {
  TOUR.token++; stopSpeech(); S.touring = false; TOUR.ended = false;
  document.getElementById('app').classList.remove('touring'); if (CTL) { CTL.enabled = true; CTL.anim = null; CTL.syncFromCam('orbit'); }
  rebuild(); fitView(true);
}
function tourJump(delta) {
  if (!S.touring) return; const tok = ++TOUR.token; stopSpeech(); TOUR.paused = false; TOUR.ended = false;
  TOUR.i = clamp(TOUR.i + delta, 0, TOUR.order.length - 1) - 1; if (CTL) CTL.anim = null;
  tourLoop(tok);
}
function tourGo(idx) { if (!S.touring) return; const tok = ++TOUR.token; stopSpeech(); TOUR.paused = false; TOUR.i = idx - 1; if (CTL) CTL.anim = null; tourLoop(tok); }
function tourTogglePause() {
  if (TOUR.ended) { TOUR.ended = false; startTour(0); return; }
  TOUR.paused = !TOUR.paused;
  try { TOUR.paused ? speechSynthesis.pause() : speechSynthesis.resume(); } catch (e) { }
  renderTourUI();
}
function setTourStatus(t) { const el = document.getElementById('tour-status'); if (el) el.textContent = t; }
function tourRoom() { return S.touring && TOUR.order[TOUR.i] ? TOUR.order[TOUR.i] : null; }
function renderTourUI() {
  const el = document.getElementById('tour'); if (!el) return;
  const r = tourRoom();
  document.getElementById('tour-play').innerHTML = TOUR.paused ? '▶' : '❚❚';
  document.getElementById('tour-voice').classList.toggle('off', !TOUR.voice);
  const mf = P().floors.length > 1; document.getElementById('tour-chips').innerHTML = TOUR.order.map((x, i) => `${mf && (i === 0 || floorOfRoom(x) !== floorOfRoom(TOUR.order[i - 1])) ? `<span class="tour-floor">${esc(floorOfRoom(x).name)}</span>` : ''}<button class="chip ${i === TOUR.i ? 'on' : i < TOUR.i ? 'done' : ''}" data-act="tour-go" data-i="${i}">${ROOM_TYPES[x.type].icon} ${esc(x.name)}</button>`).join('');
  document.getElementById('tour-room').innerHTML = r ? `<b>${esc(r.name)}</b><span>${r.w} × ${r.d} m · ${r2(area(r))} m² · ${inr(roomCost(r).total)}</span>` : `<b>${esc(P().name)}</b><span>${P().theme} · ${allRooms().length} rooms</span>`;
  renderTourEdit();
  renderMinimap();
}
function renderTourEdit() {
  const box = document.getElementById('tour-edit'); if (!box) return; const r = tourRoom();
  if (!r) { box.innerHTML = `<p class="muted">Changes apply to the room you're in. Wait for the first room, or type below to change the whole home.</p>`; return; }
  const sug = paintSuggestions(r);
  box.innerHTML = `
    <div class="te-row"><label>Wall colour</label><div class="swatches">${sug.map(s => `<button class="sw" title="${esc(s.name)} — ${esc(s.why)}" style="background:${s.hex}" data-act="tour-wall" data-c="${s.hex}" data-n="${esc(s.name)}"></button>`).join('')}<input type="color" value="${roomWall(r)}" data-act-input="tour-wall-custom"></div></div>
    <div class="te-row"><label>Flooring</label><select data-act-change="tour-floor">${Object.entries(FLOORS).map(([k, v]) => `<option value="${k}" ${roomFloorKey(r) === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
    <div class="te-row"><label>Style</label><div class="mini-chips">${Object.keys(THEMES).map(t => `<button class="chip ${(r.theme || P().theme) === t ? 'on' : ''}" data-act="tour-theme" data-t="${t}">${t}</button>`).join('')}</div></div>
    <div class="te-row"><label>Transform</label><div class="mini-chips">${TRANSFORMS.filter(t => t.to !== r.type).slice(0, 6).map(t => `<button class="chip" data-act="tour-transform" data-t="${t.to}">${ROOM_TYPES[t.to].icon} ${t.label}</button>`).join('')}</div></div>
    <div class="te-row"><button class="btn sm" data-act="tour-refurnish">↻ Re-arrange furniture</button><button class="btn sm" data-act="tour-budget">💸 Make it cheaper</button></div>`;
}
function renderMinimap() {
  const el = document.getElementById('tour-map'); if (!el) return; const f = FL(), b = homeBounds(f); const s = Math.min(170 / b.w, 120 / b.d); const r = tourRoom();
  el.innerHTML = `<svg width="${b.w * s + 10}" height="${b.d * s + 10}"><g transform="translate(5 5)">${f.rooms.map(x => `<rect x="${(x.x - b.x) * s}" y="${(x.y - b.y) * s}" width="${x.w * s}" height="${x.d * s}" fill="${x === r ? '#8b5cf6' : TOUR.order.indexOf(x) < TOUR.i && TOUR.order.includes(x) ? '#0e7490' : '#1e293b'}" stroke="#05050a" stroke-width="1.5"/>`).join('')}${TOUR.order.slice(0, Math.max(0, TOUR.i + 1)).map((x, i, a) => i ? `<line x1="${(a[i - 1].x + a[i - 1].w / 2 - b.x) * s}" y1="${(a[i - 1].y + a[i - 1].d / 2 - b.y) * s}" x2="${(x.x + x.w / 2 - b.x) * s}" y2="${(x.y + x.d / 2 - b.y) * s}" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 2"/>` : '').join('')}${r ? `<circle cx="${(r.x + r.w / 2 - b.x) * s}" cy="${(r.y + r.d / 2 - b.y) * s}" r="5" fill="#fff" class="pulse"/>` : ''}</g></svg>`;
}
async function tourApply(actions, msg) {
  const r = tourRoom(); TOUR.paused = true; try { speechSynthesis.cancel(); } catch (e) { } setTalking(false);
  const res = execActions(actions, r);
  const line = msg || res.done.join(' ') || 'Done.';
  renderTourUI(); if (r) { TOUR.narr[r.id] = templateNarration(r); }
  addChat('aria', line);
  const tok = TOUR.token; TOUR.paused = false; await speak(line, tok); if (tok === TOUR.token) { TOUR.paused = true; renderTourUI(); setTourStatus('Paused after your change — press ▶ to continue the tour.'); }
}
async function tourAsk(text) {
  const r = tourRoom(); TOUR.paused = true; try { speechSynthesis.cancel(); } catch (e) { }
  addChat('user', text); setTourStatus('Aria is thinking…');
  const out = await askAria(text, r);
  addChat('aria', out.reply, out.via);
  renderTourUI(); const tok = TOUR.token; TOUR.paused = false; await speak(out.reply, tok);
  if (tok === TOUR.token && S.touring) { TOUR.paused = true; renderTourUI(); setTourStatus('Paused — press ▶ to continue the tour.'); }
}

/* ===================== APP SHELL, PANELS & INTERACTIONS ===================== */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
function toast(msg, ms = 2600) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), ms); }
function show(screen) { if (!['login', 'intro', 'landing'].includes(screen) && !currentUser()) { screen = 'login'; renderAuth(); } else if (!['login', 'intro', 'landing'].includes(screen) && !currentUser().answers?.done) { screen = 'intro'; renderIntro(); } $('#app').dataset.screen = screen; window.scrollTo(0, 0); if (screen === 'dash') renderDash(); try { updateUserChips(); } catch (e) { } }
function commit(label) { if (!S.project) return; S.history.push(JSON.stringify(S.project)); if (S.history.length > 40) S.history.shift(); S.future = []; }
function undo() { if (!S.history.length) return toast('Nothing to undo'); S.future.push(JSON.stringify(S.project)); S.project = JSON.parse(S.history.pop()); S.sel = null; rebuild(); renderInspector(); save(); toast('Undone'); }
function redo() { if (!S.future.length) return toast('Nothing to redo'); S.history.push(JSON.stringify(S.project)); S.project = JSON.parse(S.future.pop()); S.sel = null; rebuild(); renderInspector(); save(); }
let saveT = null;
function save(withThumb) {
  if (!S.project) return; S.project.updated = Date.now();
  clearTimeout(saveT); saveT = setTimeout(() => {
    const pj = Object.assign({}, S.project, { planImage: null });
    store.set('proj_' + pj.id, pj);
    const list = store.get('projects', []).filter(p => p.id !== pj.id);
    let thumb = (store.get('projects', []).find(p => p.id === pj.id) || {}).thumb;
    if ((withThumb || !thumb) && E && S.view !== '2d' && !S.touring) { try { thumb = E.snapshot(360, 220); } catch (e) { } }
    list.unshift({ id: pj.id, name: pj.name, updated: pj.updated, thumb, rooms: allRooms().length, cost: homeCost().total, theme: pj.theme, owner: projOwner() });
    store.set('projects', list.slice(0, 40));
    if (isCloud()) { setSyncChip('busy'); cloudPush(pj, thumb); }
  }, 500);
}
function updateAIBadge() {
  const a = S.backend && S.backend.ai;
  const st = !S.backendOK ? ['key', 'Browser mode'] : !a || !a.active ? ['key', 'Qwen · not connected'] : a.active === 'ollama' ? ['ok', 'Qwen · local'] : ['ok', 'Qwen · OpenRouter'];
  $$('.gbadge').forEach(b => { b.className = 'gbadge ' + st[0]; b.textContent = st[1]; b.title = S.backendOK ? modelLabel() : 'Running the in-browser engine. For the accurate detector and Qwen AI, run the DIMORA backend (run.bat) and open http://127.0.0.1:8000'; });
  const ce = $('#chat-engine'); if (ce) ce.textContent = aiOn() ? modelLabel() : S.backendOK ? 'Rule-based engine · connect Qwen in ⚙' : 'In-browser engine · backend offline';
}
function updateTopStats() {
  const el = $('#top-stats'); if (!el || !S.project) return; const c = homeCost(); const built = allRooms().filter(r => !isYard(r)); const A = built.reduce((s, r) => s + area(r), 0);
  el.innerHTML = `${P().floors.length > 1 ? `<span><b>${P().floors.length}</b> floors</span>` : ''}<span><b>${built.length}</b> rooms</span><span title="Built-up area (parking and garden not included)"><b>${Math.round(A * SQFT).toLocaleString('en-IN')}</b> sq ft</span><span><b>${inr(c.total)}</b> est.</span><span>${P().theme}</span>`;
}

/* ---------- views ---------- */
function setView(v, opts = {}) {
  if (S.touring && v !== '3d') stopTour();
  const prev = S.view; S.view = v; $('#app').dataset.view = v; renderFloorSeg();
  $$('#view-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === '2d') { V2.init = false; render2D(); setTool('select'); renderInspector(); return; }
  if (!E) return;
  if (v === 'walk' && opts.outside) { walkOutside(prev); E.dirty = true; renderInspector(); return; }
  if (v === 'walk') {
    const f = FL(); const con = connectivity(f); const r = con.start || f.rooms[0]; const sh = roomShot(r);
    CTL.mode = 'walk'; rebuild();
    CTL.flyTo(sh.pos, sh.target, prev === '2d' ? 0.01 : 1.4, { mode: 'walk' }).then(() => toast('Walk mode: W A S D / arrow keys, drag to look'));
  } else {
    const wasWalk = CTL.mode === 'walk'; CTL.mode = 'orbit'; rebuild();
    if (prev === '2d') { fitView(false, true); setTimeout(() => fitView(true), 60); }
    else if (wasWalk) fitView(true);
  }
  E.dirty = true; renderInspector();
}

/* start a walk outside: at the gate (or in front of the house), at eye level, facing the house */
function walkOutside(prev) {
  const pj = P(); const g = pj.floors.slice().sort((a, b) => a.level - b.level)[0]; pj.activeFloor = pj.floors.indexOf(g);
  S.showAllFloors = true; S.cutaway = false; S.roof = true; $('#t-cut')?.classList.remove('on'); $('#t-roof')?.classList.add('on');
  const site = siteRect(homeBounds()), hb = houseBounds() || homeBounds(), cx = hb.x + hb.w / 2, cz = hb.y + hb.d / 2, y = floorY(g) + 1.6;
  const d = site.door; // without a drawn parking, the gate is on the path in line with the main door
  const along = site.gate != null ? site.gate : d ? (d.o === 'h' ? d.x : d.y) : (site.side === 'N' || site.side === 'S' ? cx : cz);
  const inset = 1.3, P0 = { N: [along, site.z0 + inset], S: [along, site.z1 - inset], W: [site.x0 + inset, along], E: [site.x1 - inset, along] }[site.side] || [cx, site.z1 - inset];
  const look = [cx - P0[0], cz - P0[1]], L = Math.hypot(...look) || 1;
  CTL.mode = 'walk'; rebuild(); renderFloorSeg();
  CTL.flyTo([P0[0], y, P0[1]], [P0[0] + look[0] / L, y - 0.05, P0[1] + look[1] / L], prev === '2d' ? 0.01 : 1.6, { mode: 'walk' })
    .then(() => toast('Walking outside: W A S D / arrows to move · drag to look around · Shift to hurry · walk in through the door', 5000));
}

/* ---------- side panels ---------- */
function openPanel(p) {
  S.panel = p; $$('#rail button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  $('#app').classList.add('side-open'); refreshSidePanel();
  if (p === 'light' && !S.daylightSim) { /* keep user choice */ }
}
function selRoom() { if (S.sel && S.sel.kind === 'room') return findRoom(S.sel.id); if (S.sel && S.sel.kind === 'item') { const f = findItem(S.sel.id); return f && f.room; } return null; }
function roomPicker(label = 'Pick a room') { return `<div class="card"><p class="muted" style="margin:0 0 8px">${label} — click it in the 3D/2D view, or:</p><div class="mini-chips">${FL().rooms.map(r => `<button class="chip" data-act="select-room" data-id="${r.id}">${ROOM_TYPES[r.type].icon} ${esc(r.name)}</button>`).join('')}</div></div>`; }
function scoreRing(v) { const c = v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ec4899'; return `<div class="score" style="background:conic-gradient(${c} ${v * 3.6}deg, #1e293b 0);box-shadow:0 0 18px ${c}33"><div style="width:46px;height:46px;border-radius:50%;background:var(--panel2);display:grid;place-items:center">${v}</div></div>`; }
function refreshSidePanel() {
  const el = $('#side-body'); if (!el || !S.project) return;
  const fn = { design: panelDesign, furniture: panelFurniture, space: panelSpace, budget: panelBudget, light: panelLight, transform: panelTransform, arch: panelArch, compare: panelCompare, report: panelReport }[S.panel] || panelDesign;
  const st = el.parentElement.scrollTop; el.innerHTML = fn(); el.parentElement.scrollTop = st;
}
function panelDesign() {
  const r = selRoom(); const th = P().theme;
  let h = `<h2>AI Interior Designer</h2><p class="muted">Themes, paint, materials, ceilings, lighting &amp; decor — applied live to your 3D home.</p>
  <h3>Theme for the whole home</h3><div class="theme-grid">${Object.entries(THEMES).map(([n, t]) => `<button class="theme ${th === n ? 'on' : ''}" data-act="theme" data-t="${n}"><b>${n}</b><div class="dots">${[t.walls[0], t.wood, t.fabric, t.accent].map(c => `<i style="background:${c}"></i>`).join('')}</div></button>`).join('')}</div>
  <div class="row" style="margin-top:10px"><button class="btn sm" data-act="furnish-all">🪄 Auto-furnish every room</button><button class="btn sm ghost" data-act="furnish-all" data-v="1">↻ Alternative layouts</button></div>`;
  const fk0 = P().facade || 'modern', exc = P().exterior;
  h += `<h3>Exterior style</h3><div class="theme-grid">${Object.entries(FACADES).map(([k, v]) => `<button class="theme ${fk0 === k ? 'on' : ''}" data-act="facade" data-k="${k}" title="${esc(v.desc)}"><b>${v.label}</b><div class="dots">${v.sw.map(c => `<i style="background:${c}"></i>`).join('')}</div></button>`).join('')}</div>
  <div class="row" style="margin-top:8px;flex-wrap:wrap"><span class="muted">Outside paint</span>${['#efeeea', '#e9e2d4', '#dacbb2', '#c9c6bf', '#8d8f8c', '#3b3d40'].map(c => `<button class="sw ${exc === c ? 'on' : ''}" style="background:${c};width:22px;height:22px" data-act="ext-color" data-c="${c}" title="${c}"></button>`).join('')}<input type="color" value="${extColor()}" data-act-input="ext-custom">${exc ? `<button class="btn sm ghost" data-act="ext-color" data-c="">Style default</button>` : ''}</div>
  <p class="muted" style="margin:6px 0 0;font-size:12px">Mark a ground-floor room as a garage (Space panel → Transform) and it gets a roll-up door, an SUV, a motorbike and a cobbled driveway.</p>`;
  if (!r) h += `<h3>Room design</h3>` + roomPicker('Select a room to get paint, material, ceiling & lighting suggestions');
  else {
    const sug = paintSuggestions(r), la = lightingAdvice(r), ca = ceilingAdvice(r), da = decorAdvice(r); const fk = roomFloorKey(r), ck = roomCeiling(r);
    h += `<h3>${ROOM_TYPES[r.type].icon} ${esc(r.name)} — AI paint suggestions</h3><div class="card">${sug.map(s => `<div class="sugg"><button class="sw" style="background:${s.hex}" data-act="wall" data-c="${s.hex}"></button><div><b>${esc(s.name)}</b><small>${esc(s.why)}</small></div><button class="btn sm ghost" data-act="wall" data-c="${s.hex}">Apply</button></div>`).join('')}
      <div class="row" style="margin-top:8px"><span class="muted">Custom</span><input type="color" value="${roomWall(r)}" data-act-input="wall-custom"><label class="row muted"><input type="checkbox" ${r.wallpaper ? 'checked' : ''} data-act-change="wallpaper"> Striped wallpaper</label></div></div>
    <h3>Flooring material</h3><div class="mini-chips">${Object.entries(FLOORS).map(([k, v]) => `<button class="chip ${fk === k ? 'on' : ''}" data-act="floor" data-k="${k}"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${v.color};vertical-align:middle"></i> ${v.label}</button>`).join('')}</div>
    <h3>Ceiling designer</h3><div class="card"><p style="margin-top:0">${esc(ca.why)}</p><div class="seg sm">${Object.entries(CEILINGS).map(([k, v]) => `<button class="${ck === k ? 'on' : ''}" data-act="ceiling" data-k="${k}">${v.label.split(' ')[0]}</button>`).join('')}</div>${ca.type !== ck ? `<button class="btn sm" style="margin-top:8px" data-act="ceiling" data-k="${ca.type}">Use AI pick: ${CEILINGS[ca.type].label}</button>` : ''}</div>
    <h3>Lighting designer</h3><div class="card"><div class="kv"><span>Ambient</span><b style="font-weight:600">${la.ambient}</b><span>Task</span><b style="font-weight:600">${la.task}</b><span>Accent</span><b style="font-weight:600">${la.accent}</b><span>Colour temp.</span><b style="font-weight:600">${la.temp}</b></div>
      <div class="row" style="margin-top:8px">${['ambient', 'task', 'accent'].map(k => `<label class="row muted"><input type="checkbox" ${r.lights?.[k] ? 'checked' : ''} data-act-change="light-tog" data-k="${k}"> ${k}</label>`).join('')}</div><button class="btn sm ghost" data-act="time-eve">See it at 8 PM →</button></div>
    <h3>Curtains &amp; decor</h3><div class="card"><div class="kv"><span>Curtains</span><b style="font-weight:600">${da.curtains}</b><span>Rug</span><b style="font-weight:600">${da.rug}</b><span>Decor</span><b style="font-weight:600">${da.decor}</b></div><label class="row muted" style="margin-top:8px"><input type="checkbox" ${r.curtains ? 'checked' : ''} data-act-change="curtains"> Show curtains in 3D</label></div>
    <h3>Furniture style</h3><div class="two"><label class="field">Wood finish<select data-act-change="finish"><option value="">Theme default</option>${Object.keys(WOOD_FINISHES).map(k => `<option ${r.furniture[0]?.finish === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label><label class="field">Quality tier<select data-act-change="tier">${TIERS.map(t => `<option ${r.tier === t ? 'selected' : ''} value="${t}">${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></label></div>
    <label class="field">Room-only theme<select data-act-change="room-theme"><option value="">Same as home (${th})</option>${Object.keys(THEMES).map(k => `<option ${r.theme === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>`;
  }
  h += `<h3>Recreate an inspiration photo</h3><div class="card"><p style="margin-top:0" class="muted">Upload a Pinterest / Instagram interior and Aria recreates the style in ${r ? esc(r.name) : 'your home'}.</p><input type="file" id="insp-in" accept="image/*" hidden><button class="btn sm" data-act="pick-insp">📌 Upload inspiration</button><div id="insp-out">${S.insp ? inspHTML(S.insp) : ''}</div></div>`;
  return h;
}
function inspHTML(x) { return `<div style="margin-top:10px"><div class="row">${x.url ? `<img src="${x.url}" style="width:70px;height:70px;object-fit:cover;border-radius:10px">` : ''}<div><b>${x.style}</b><div class="dots" style="margin:5px 0">${x.palette.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join('')}</div><small class="muted">via ${esc(x.via)}</small></div></div>${x.description ? `<p>${esc(x.description)}</p>` : ''}<button class="btn sm primary" data-act="apply-insp">Apply this look</button></div>`; }
function panelFurniture() {
  const r = selRoom(); S.cat = S.cat || 'Bedroom';
  const cats = CAT_ORDER.filter(c => Object.values(CATALOG).some(i => i.cat === c));
  let h = `<h2>Furniture</h2><p class="muted">${r ? `Click to add to <b>${esc(r.name)}</b> — DIMORA finds a spot that keeps walkways and doors clear.` : 'Select a room first, or use 2D view to click-place anywhere.'}</p>
  <div class="cat-tabs">${cats.map(c => `<button class="${S.cat === c ? 'on' : ''}" data-act="cat" data-c="${c}">${c}</button>`).join('')}</div>
  <div class="fgrid">${Object.entries(CATALOG).filter(([, v]) => v.cat === S.cat).map(([k, v]) => `<button class="fitem" data-act="add-item" data-t="${k}"><i>${v.icon}</i><b>${v.label}</b><small>${v.w}×${v.d} m · from ${inr(v.price[0])}</small></button>`).join('')}</div>`;
  if (r) h += `<h3>In ${esc(r.name)} (${r.furniture.length})</h3>${r.furniture.map(it => `<div class="sugg"><span style="font-size:18px">${CATALOG[it.type].icon}</span><div><b>${CATALOG[it.type].label}</b><small>${it.w}×${it.d} m · ${it.tier} · ${inr(CATALOG[it.type].price[TIER_IX[it.tier]])}</small></div><div class="row"><button class="btn sm ghost" data-act="select-item" data-id="${it.id}">Edit</button><button class="btn sm ghost" data-act="del-item" data-id="${it.id}">✕</button></div></div>`).join('') || '<p class="muted">Empty.</p>'}<div class="row" style="margin-top:8px"><button class="btn sm" data-act="furnish-room">🪄 Auto-furnish</button><button class="btn sm ghost" data-act="furnish-room" data-v="1">↻ Another layout</button><button class="btn sm ghost" data-act="clear-room">Clear</button></div>`;
  return h;
}
function panelSpace() {
  const r = selRoom(); const f = FL();
  const all = f.rooms.map(x => ({ x, a: analyzeSpace(x, f) }));
  let h = `<h2>Intelligent Space Analyzer</h2><p class="muted">Dimensions, utilisation, walking clearance, door swings and wasted space.</p>
  <button class="btn sm ghost" data-act="overlay-plan" data-o="space">Show unused space on plan</button>
  <table class="t" style="margin-top:10px"><tr><th>Room</th><th class="r">m²</th><th>Status</th><th class="r">Score</th></tr>${all.map(({ x, a }) => `<tr class="click" data-act="select-room" data-id="${x.id}"><td>${esc(x.name)}</td><td class="r">${r2(area(x))}</td><td><span class="tag ${a.status === 'Balanced' ? 'ok' : a.status === 'Overcrowded' ? 'warn' : 'mid'}">${a.status}</span></td><td class="r">${a.score}</td></tr>`).join('')}</table>`;
  const st = storageReport();
  if (r) {
    const a = analyzeSpace(r, floorOfRoom(r));
    h += `<h3>${esc(r.name)}</h3><div class="card"><div class="row">${scoreRing(a.score)}<div class="kv" style="flex:1"><span>Size</span><b>${r.w} × ${r.d} m</b><span>Area</span><b>${r2(area(r))} m² · ${Math.round(area(r) * SQFT)} sq ft</b><span>Furniture cover</span><b>${Math.round(a.coverage * 100)}%</b><span>Walkable floor</span><b>${Math.round(a.walkable * 100)}%</b></div></div><p class="muted">${a.sizeNote}</p></div>
    ${a.issues.length ? a.issues.map(i => `<div class="issue">${esc(i)}</div>`).join('') : '<div class="issue ok">Walking clearances and door swings are comfortable.</div>'}
    ${a.clear.length ? `<h3>Clearance in front of furniture</h3><table class="t"><tr><th>Item</th><th class="r">Has</th><th class="r">Needs</th></tr>${a.clear.map(c => `<tr><td>${CATALOG[c.it.type].label}</td><td class="r" style="color:${c.ok ? '#7fd9a4' : '#ff9a8a'}">${c.dist} m</td><td class="r">${c.req} m</td></tr>`).join('')}</table>` : ''}
    ${a.corner ? `<h3>Unused space found</h3><div class="card"><p style="margin-top:0">A <b>${r2(a.corner.w)} × ${r2(a.corner.d)} m</b> corner (${r2(a.corner.area)} m²) isn't doing anything. Convert it into:</p><div class="row"><button class="btn sm" data-act="corner" data-k="study">💻 Study corner</button><button class="btn sm" data-act="corner" data-k="reading">📖 Reading nook</button><button class="btn sm" data-act="corner" data-k="storage">🗄️ Storage</button></div></div>` : ''}
    <h3>Layout improvement</h3><div class="row"><button class="btn sm" data-act="furnish-room" data-v="1">↻ Try an alternative arrangement</button><button class="btn sm ghost" data-act="furnish-room">Reset to AI layout</button></div>
    <h3>Room purpose ideas</h3><div class="mini-chips">${a.purpose.map(p => `<button class="chip" data-act="transform" data-t="${p}">${ROOM_TYPES[p].icon} ${ROOM_TYPES[p].label}</button>`).join('')}</div>
    <h3>Furniture fit checker</h3><div class="card"><div class="two"><label class="field">Item<select id="fit-type">${Object.entries(CATALOG).map(([k, v]) => `<option value="${k}" ${S.fitType === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label><div class="two"><label class="field">W m<input id="fit-w" type="number" step="0.05" placeholder="auto"></label><label class="field">D m<input id="fit-d" type="number" step="0.05" placeholder="auto"></label></div></div><button class="btn sm" data-act="fit-check">Check fit</button><div id="fit-out">${S.fitOut || ''}</div></div>`;
  } else h += `<h3>Room detail</h3>` + roomPicker('Pick a room for clearance, wasted space and fit checks');
  h += `<h3>Storage optimisation</h3><div class="card"><div class="kv"><span>Storage you have</span><b>${st.have} m³</b><span>Recommended for ${S.prefs.family} people</span><b>${st.need} m³</b></div><div class="bar" style="margin:8px 0"><i style="width:${Math.min(100, st.have / st.need * 100)}%;background:${st.have >= st.need ? 'var(--sage)' : 'var(--acc)'}"></i></div>${st.tips.map(t => `<p class="muted">${t}</p>`).join('')}</div>`;
  return h;
}
function costIfTier(tier) { const saved = S.project; S.project = deep(saved); allRooms().forEach(r => { r.tier = tier; r.furniture.forEach(i => i.tier = tier); if (tier === 'premium') { if (FLOORS[roomFloorKey(r)].rate < 150 && !['bathroom', 'utility', 'balcony'].includes(r.type)) r.floor = 'marble'; r.lights.accent = true; } if (tier === 'budget') { const fk = roomFloorKey(r); if (FLOOR_CHEAPER[fk]) r.floor = FLOOR_CHEAPER[fk]; r.ceiling = 'flat'; r.lights.accent = false; } }); const c = homeCost(); S.project = saved; return c; }
function panelBudget() {
  const c = homeCost(), B = S.prefs.budget, over = c.total > B; const r = selRoom();
  const cats = [['Furniture', c.furniture], ['Flooring', c.flooring], ['Wall painting', c.paint], ['Lighting', c.lighting], ['False ceiling', c.ceiling], ['Decor & curtains', c.decor]];
  const mx = Math.max(...cats.map(x => x[1]), 1);
  const tb = ['budget', 'standard', 'premium'].map(t => [t, costIfTier(t).total]);
  let h = `<h2>Budget &amp; Cost Estimator</h2><p class="muted">India-focused, room-wise and explainable. Illustrative figures only, not market quotations.</p>
  <div class="card"><label class="field">Your total budget<div class="inline"><span>₹</span><input type="number" step="10000" value="${B}" data-act-change="budget" style="flex:1"></div></label>
  <div class="row" style="justify-content:space-between"><div><small class="muted">Current design</small><div style="font-family:var(--disp);font-size:28px">${inr(c.total)}</div></div><span class="tag ${over ? 'warn' : 'ok'}">${over ? inr(c.total - B) + ' over' : inr(B - c.total) + ' to spare'}</span></div>
  <div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, c.total / B * 100)}%;background:${over ? 'var(--red)' : 'var(--sage)'}"></i></div>${over ? `<button class="btn sm primary" style="margin-top:10px;width:100%" data-act="optimize-all">💸 Fit the whole home into ${inr(B)}</button>` : ''}</div>
  <h3>Where the money goes</h3>${cats.map(([n, v]) => `<div style="margin:7px 0"><div class="row" style="justify-content:space-between"><span>${n}</span><b>${inr(v)}</b></div><div class="bar"><i style="width:${v / mx * 100}%"></i></div></div>`).join('')}
  <h3>Room-wise costs</h3><table class="t"><tr><th>Room</th><th class="r">Furniture</th><th class="r">Total</th></tr>${c.rooms.map(({ r: x, c: cc }) => `<tr class="click" data-act="select-room" data-id="${x.id}"><td>${esc(x.name)}</td><td class="r">${inr(cc.furniture)}</td><td class="r"><b>${inr(cc.total)}</b></td></tr>`).join('')}</table>
  <h3>Budget vs Premium design</h3><div class="two" style="grid-template-columns:1fr 1fr 1fr">${tb.map(([t, v]) => `<div class="card" style="text-align:center;margin:0"><small class="muted">${t[0].toUpperCase() + t.slice(1)}</small><div style="font-weight:800">${inr(v)}</div><button class="btn sm ghost" style="margin-top:6px" data-act="set-tier-all" data-t="${t}">Use</button></div>`).join('')}</div>
  <h3>Budget optimiser</h3><div class="card"><p style="margin-top:0" class="muted">e.g. “Design my bedroom under ₹30,000.”</p><div class="two"><label class="field">Room<select id="opt-room"><option value="all">Whole home</option>${allRooms().map(x => `<option value="${x.id}" ${r === x ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label><label class="field">Max ₹<input id="opt-amt" type="number" step="1000" value="${r ? Math.round(roomCost(r).total * 0.7 / 1000) * 1000 : Math.round(B / 1000) * 1000}"></label></div><button class="btn sm primary" data-act="optimize">Optimise</button>
  ${S.lastOptimize ? `<div style="margin-top:10px"><b>${S.lastOptimize.ok ? '✓ Within budget' : '⚠ Closest possible'}:</b> ${inr(S.lastOptimize.start)} → ${inr(S.lastOptimize.end)}<ul style="padding-left:18px;margin:6px 0;color:var(--muted);font-size:12.5px">${S.lastOptimize.steps.slice(0, 10).map(s => `<li>${esc(s)}</li>`).join('')}${S.lastOptimize.steps.length > 10 ? `<li>…and ${S.lastOptimize.steps.length - 10} more</li>` : ''}</ul></div>` : ''}</div>`;
  if (r) { const rc = roomCost(r); const alts = cheaperAlternatives(r);
    h += `<h3>Why ${esc(r.name)} costs ${inr(rc.total)}</h3><div class="card">${[['Painting', 'paint'], ['Flooring', 'flooring'], ['Furniture', 'furniture'], ['Decor', 'decor'], ['Lighting', 'lighting'], ['Ceiling', 'ceiling']].map(([n, k]) => `<div style="margin:6px 0"><div class="row" style="justify-content:space-between"><b>${n}</b><b>${inr(rc[k])}</b></div><small class="muted">${esc(rc.explain[k])}</small></div>`).join('')}</div>
    <h3>Cheaper alternatives</h3>${alts.length ? alts.slice(0, 6).map((a, i) => `<div class="sugg"><span>💡</span><div><b style="font-weight:600">${esc(a.what)}</b><small>saves ${inr(a.save)}</small></div><button class="btn sm ghost" data-act="alt" data-i="${i}">Apply</button></div>`).join('') : '<p class="muted">Already the leanest choices.</p>'}`; }
  else h += `<h3>Explain a room's estimate</h3>` + roomPicker('Pick a room to see the line-by-line explanation');
  return h;
}
function panelLight() {
  const f = FL(); const r = selRoom(); const all = f.rooms.map(x => ({ x, L: analyzeLight(x, f) }));
  let h = `<h2>Natural Light &amp; Ventilation</h2><p class="muted">Window-to-floor ratio, orientation, sun path and airflow.</p>
  <div class="card"><label class="row"><input type="checkbox" ${S.daylightSim ? 'checked' : ''} data-act-change="daylight"> <b>Daylight simulation</b> — sun enters only through windows</label>
  <label class="field">Time of day: <b id="lt-h">${fmtHour(S.hour)}</b><input type="range" min="5" max="21" step="0.1" value="${S.hour}" data-act-input="hour"></label>
  <label class="field">Plan orientation — where is North? (${P().north || 0}° from plan-up)<input type="range" min="0" max="359" step="1" value="${P().north || 0}" data-act-input="north"></label>
  <div class="row"><button class="btn sm" data-act="play-day">▶ Simulate a full day</button><button class="btn sm ghost" data-act="overlay-plan" data-o="heat">Light heatmap</button><button class="btn sm ghost" data-act="overlay-plan" data-o="air">Airflow paths</button></div></div>
  <table class="t"><tr><th>Room</th><th>Daylight</th><th>Faces</th><th class="r">Score</th></tr>${all.map(({ x, L }) => `<tr class="click" data-act="select-room" data-id="${x.id}"><td>${esc(x.name)}</td><td><span class="tag ${L.rating === 'Excellent' || L.rating === 'Good' ? 'ok' : L.rating === 'Limited' ? 'mid' : 'warn'}">${L.rating}</span></td><td>${L.dirs.join(', ') || '—'}</td><td class="r">${L.score}</td></tr>`).join('')}</table>
  <h3>Rooms with limited windows</h3>${all.filter(a => ['Limited', 'Poor', 'No daylight'].includes(a.L.rating) && !['hall', 'closet', 'utility'].includes(a.x.type)).map(a => `<div class="issue">${esc(a.x.name)}: ${a.L.rating.toLowerCase()} (window/floor ratio ${Math.round(a.L.wfr * 100)}%).</div>`).join('') || '<div class="issue ok">Every habitable room gets reasonable daylight.</div>'}`;
  if (r) { const L = analyzeLight(r, floorOfRoom(r));
    h += `<h3>${esc(r.name)}</h3><div class="card"><div class="row">${scoreRing(L.score)}<div class="kv" style="flex:1"><span>Window area</span><b>${L.winA} m²</b><span>Window : floor</span><b>${Math.round(L.wfr * 100)}% <small class="muted">(aim ≥ 10%)</small></b><span>Ventilation</span><b>${L.vent}</b></div></div></div>
    ${L.notes.map(n => `<div class="issue info">${esc(n)}</div>`).join('')}${L.sugg.map(n => `<div class="issue">${esc(n)}</div>`).join('')}
    ${L.suggestWindow ? `<button class="btn sm primary" data-act="add-window-sugg">＋ Add the suggested ${L.suggestWindow.compass} window</button>` : ''}`; }
  else h += `<h3>Room detail</h3>` + roomPicker('Pick a room for orientation and airflow advice');
  return h;
}
function panelTransform() {
  const r = selRoom();
  let h = `<h2>Smart Room Transformation</h2><p class="muted">Change what a room is for. DIMORA re-plans furniture, paint and cost.</p>`;
  if (!r) return h + roomPicker('Pick a room to transform');
  h += `<div class="card"><b>${ROOM_TYPES[r.type].icon} ${esc(r.name)}</b> <span class="muted">· ${r.w} × ${r.d} m · ${ROOM_TYPES[r.type].label}</span></div><div class="tgrid">${TRANSFORMS.filter(t => t.to !== r.type).map(t => { const ok = area(r) >= ROOM_TYPES[t.to].min * 0.8; return `<button class="tcard" data-act="transform" data-t="${t.to}" ${ok ? '' : 'title="Room is smaller than ideal"'}><i>${ROOM_TYPES[t.to].icon}</i><b>${esc(r.type === 'balcony' && t.to === 'reading' ? 'Balcony reading corner' : t.label)}</b><br><small class="muted">${ok ? 'Good fit' : 'Tight fit'} · min ${ROOM_TYPES[t.to].min} m²</small></button>`; }).join('')}</div>`;
  if (S.lastTransform && S.lastTransform.room === r.id) { const t = S.lastTransform; h += `<h3>Before → After</h3><div class="ba"><figure><img src="${t.before}"><figcaption>${esc(ROOM_TYPES[t.from].label)} · ${inr(t.c0)}</figcaption></figure><figure><img src="${t.after}"><figcaption>${esc(ROOM_TYPES[t.to].label)} · ${inr(t.c1)}</figcaption></figure></div><button class="btn sm ghost" style="margin-top:8px" data-act="undo">↶ Undo transformation</button>`; }
  return h;
}
const GA = { key: '', data: null, busy: false };
async function loadGraphAnalysis() {
  const el = document.getElementById('graph-ana'); if (!el || !S.project) return;
  const geo = projectGeometry(); const key = JSON.stringify(geo);
  if (GA.key === key && GA.data) { el.innerHTML = graphHTML(GA.data); return; }
  await API.health(); if (!S.backendOK) { el.innerHTML = `<p class="muted" style="margin:0">Start the DIMORA backend to see graph analytics (BFS order, chokepoint rooms, walking distances).</p>`; return; }
  if (GA.busy) return; GA.busy = true;
  try { GA.data = await API.req('/api/analyze', { body: { project: geo }, timeout: 15000 }); GA.key = key; const e2 = document.getElementById('graph-ana'); if (e2) e2.innerHTML = graphHTML(GA.data); }
  catch (e) { const e2 = document.getElementById('graph-ana'); if (e2) e2.innerHTML = `<p class="muted" style="margin:0">Graph analysis failed: ${esc(e.message)}</p>`; }
  GA.busy = false;
}
function graphHTML(a) {
  const pj = P(), fl = a.floors.find(x => x.floor === FL().name) || a.floors[pj.activeFloor] || a.floors[0]; if (!fl) return '';
  const nm = id => { const r = findRoom(id); return r ? esc(r.name) : '?'; };
  const dist = Object.entries(fl.distances || {}).filter(([id]) => id !== fl.start).sort((x, y) => y[1] - x[1]);
  const max = dist.length ? dist[0][1] : 1;
  return `<p class="muted" style="margin:0 0 8px;font-size:12.5px">${fl.rooms} rooms joined by ${fl.doors} doors on the ${esc(fl.floor)}${fl.components > 1 ? ` · <b style="color:#f9a8d4">${fl.components} separate groups</b>` : ' · fully connected'}. Start: <b>${nm(fl.start)}</b>.</p>
  ${fl.articulation.length ? `<p style="margin:6px 0;font-size:13px"><b>Chokepoint rooms</b> <span class="muted">(articulation points: every route passes through them)</span><br>${fl.articulation.map(nm).join(', ')}</p>` : `<p style="margin:6px 0;font-size:13px"><b>No chokepoints</b> <span class="muted">— every room can be reached by more than one route.</span></p>`}
  ${fl.through_bedroom.length ? `<p style="margin:6px 0;font-size:13px;color:#fbbf24">Reachable only through a bedroom: ${fl.through_bedroom.map(nm).join(', ')}</p>` : ''}
  ${dist.length ? `<p style="margin:10px 0 4px;font-size:13px"><b>Walking distance from ${nm(fl.start)}</b> <span class="muted">(Dijkstra, metres via doors)</span></p>${dist.slice(0, 6).map(([id, m]) => `<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin:3px 0"><span style="width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm(id)}</span><i style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.08)"><i style="display:block;height:100%;width:${Math.round(m / max * 100)}%;border-radius:3px;background:var(--acc)"></i></i><b>${m.toFixed(1)} m</b></div>`).join('')}` : ''}
  ${(fl.stairs || []).map(st => `<p style="margin:8px 0 0;font-size:12.5px"><b>Staircase</b> ${st.width} m wide · ${st.risers} risers of ${st.riser_mm} mm · ${st.tread_mm} mm treads</p>`).join('')}
  ${pj.floors.length > 1 && a.house ? `<p class="muted" style="margin:8px 0 0;font-size:12.5px">Whole house: ${a.house.rooms} rooms across ${pj.floors.length} floors, ${a.house.connected ? 'all connected via the stairs' : '<b style="color:#f9a8d4">not fully connected</b>'}${a.house.farthest_from_entrance ? ` · farthest from the main door: ${esc(a.house.farthest_from_entrance.name)} (${esc(a.house.farthest_from_entrance.floor)}, ${a.house.farthest_from_entrance.metres} m)` : ''}.</p>` : ''}
  <p class="muted" style="margin:8px 0 0;font-size:11px">Algorithms: sweep-line adjacency · BFS · Tarjan articulation points · Dijkstra (NetworkX)</p>`;
}
function panelArch() {
  setTimeout(loadGraphAnalysis, 0);
  const checks = archChecks(FL()); const pj = P();
  let h = `<h2>Architectural Intelligence</h2><p class="muted">Plan validation, circulation, clearances, structure and floors.</p>
  ${checks.map(c => `<div class="issue ${c.lv === 'ok' ? 'ok' : c.lv === 'info' ? 'info' : ''}"><div><b>${esc(c.t)}</b><br><span class="muted">${esc(c.d)}</span>${c.fix ? `<br><button class="btn sm ghost" style="margin-top:5px" data-act="fix" data-k="${c.fix}">${c.fix === 'snap' ? 'Auto-align walls' : 'Add missing doors'}</button>` : ''}</div></div>`).join('')}
  <h3>Room graph <small class="muted" style="font-weight:500">· computed on the backend</small></h3><div id="graph-ana" class="card"><p class="muted" style="margin:0">Analysing the room graph…</p></div>
  <div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="overlay-plan" data-o="graph">Show room connectivity</button><button class="btn sm ghost" data-act="view" data-v="2d">Edit walls, doors &amp; windows</button></div>
  <h3>Floors</h3>${pj.floors.map((f, i) => `<div class="sugg"><span>${i === pj.activeFloor ? '●' : '○'}</span><div><b>${esc(f.name)}</b><small>${f.rooms.length} rooms · ceiling ${f.height} m${f.stairs?.length ? ' · staircase' : ''}</small></div><button class="btn sm ghost" data-act="floor-switch" data-i="${i}">${i === pj.activeFloor ? 'Active' : 'View'}</button></div>`).join('')}
  <div class="row" style="margin-top:8px"><button class="btn sm" data-act="add-floor">＋ Add floor above</button><label class="row muted"><input type="checkbox" ${S.showAllFloors ? 'checked' : ''} data-act-change="all-floors"> Show all floors stacked</label></div>
  <label class="field">Ceiling height of ${esc(FL().name)} (m)<input type="number" step="0.05" min="2.4" max="4.5" value="${FL().height}" data-act-change="floor-h"></label>
  <h3>Doors</h3><table class="t"><tr><th>Door</th><th class="r">Width</th><th></th></tr>${FL().doors.map(d => { const rs = FL().rooms.filter(r => roomSideOf(r, d.o, d.x, d.y)).map(r => r.name); return `<tr><td>${d.main ? '<b>Main entry</b> · ' : ''}${esc(rs.join(' ↔ ') || 'exterior')}</td><td class="r">${d.w} m</td><td class="r"><button class="btn sm ghost" data-act="select-door" data-id="${d.id}">Edit</button></td></tr>`; }).join('')}</table>`;
  return h;
}
function panelCompare() {
  const r = selRoom();
  let h = `<h2>Smart Design Comparison</h2><p class="muted">Save variants, compare them side by side, and see before vs after.</p>
  <div class="row"><input id="var-name" placeholder="Variant name" value="Design ${S.variants.length + 1}" style="flex:1"><button class="btn sm primary" data-act="save-variant">Save current</button></div>`;
  if (S.variants.length) {
    h += `<h3>Saved variants</h3>${S.variants.map((v, i) => `<div class="card var"><img src="${v.thumb}"><div><b>${esc(v.name)}</b><br><small class="muted">${v.theme} · ${inr(v.cost)}</small></div><div class="row" style="flex-direction:column;gap:4px"><label class="muted"><input type="checkbox" ${v.cmp ? 'checked' : ''} data-act-change="var-cmp" data-i="${i}"> compare</label><button class="btn sm ghost" data-act="var-restore" data-i="${i}">Restore</button></div></div>`).join('')}`;
    const sel = S.variants.filter(v => v.cmp).slice(0, 3);
    if (sel.length >= 2) h += `<h3>Side by side</h3><div style="overflow:auto"><table class="t"><tr><th></th>${sel.map(v => `<th>${esc(v.name)}</th>`).join('')}</tr>${[['Theme', v => v.theme], ['Total cost', v => inr(v.cost)], ['Furniture', v => inr(v.furniture)], ['Pieces', v => v.pieces], ['Space score', v => v.space], ['Light score', v => v.light], ['Within budget', v => v.cost <= S.prefs.budget ? '✓' : '✗']].map(([n, f]) => `<tr><td class="muted">${n}</td>${sel.map(v => `<td>${f(v)}</td>`).join('')}</tr>`).join('')}</table></div>`;
    else h += `<p class="muted">Tick two or three variants to compare.</p>`;
  } else h += `<div class="card muted">No variants yet. Save one, change the theme or layout, then save another.</div>`;
  h += `<h3>Before / After</h3><button class="btn sm" data-act="before-after">Compare original vs current</button><div id="ba-out">${S.baHTML || ''}</div>
  <h3>Multi-theme comparison</h3>${r ? `<p class="muted">The same ${esc(r.name)} in three styles.</p><button class="btn sm" data-act="multi-theme">Render ${esc(r.name)} in 3 themes</button><div id="mt-out">${S.mtHTML || ''}</div>` : roomPicker('Pick a room to preview in multiple themes')}`;
  return h;
}
function panelReport() {
  const c = homeCost();
  return `<h2>Home Decision Report</h2><p class="muted">One document with dimensions, furniture fit, space utilisation, materials, light and the estimated budget.</p>
  <div class="card"><div class="kv"><span>Rooms</span><b>${allRooms().length}</b><span>Carpet area</span><b>${r2(allRooms().reduce((s, r) => s + area(r), 0))} m²</b><span>Estimated interior</span><b>${inr(c.total)}</b><span>Your budget</span><b>${inr(S.prefs.budget)}</b></div></div>
  <button class="btn primary" data-act="report">📄 Generate report</button>`;
}

/* ---------- inspector ---------- */
function renderInspector() {
  const el = $('#inspector'); if (!el) return; const s = S.sel;
  if (!s || S.touring || (S.view === 'walk' && s.kind !== 'item')) { el.classList.remove('on'); return; }
  let h = '<button class="x" data-act="deselect">✕</button>';
  if (s.kind === 'item') { const f = findItem(s.id); if (!f) { el.classList.remove('on'); return; } const it = f.it, c = CATALOG[it.type];
    h += `<h4>${c.icon} ${c.label}</h4><small class="muted">in ${esc(f.room.name)} · ${inr(c.price[TIER_IX[it.tier]])}</small>
    <div class="two"><label class="field">Width (m)<input type="number" step="0.05" min="0.2" value="${it.w}" data-act-change="it-dim" data-k="w"></label><label class="field">Depth (m)<input type="number" step="0.05" min="0.2" value="${it.d}" data-act-change="it-dim" data-k="d"></label></div>
    <div class="two"><label class="field">Tier<select data-act-change="it-tier">${TIERS.map(t => `<option ${it.tier === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="field">Wood finish<select data-act-change="it-finish"><option value="">Theme</option>${Object.keys(WOOD_FINISHES).map(k => `<option ${it.finish === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label></div>
    <label class="field">Upholstery / colour<div class="row"><input type="color" value="${it.color || palette(f.room, it).fabric}" data-act-input="it-color"><button class="btn sm ghost" data-act="it-color-reset">Theme colour</button></div></label>
    <div class="row"><button class="btn sm" data-act="rot" data-d="-90">⟲ 90°</button><button class="btn sm" data-act="rot" data-d="90">⟳ 90°</button><button class="btn sm ghost" data-act="dup">Duplicate</button><button class="btn sm ghost" data-act="del">Delete</button></div><p class="muted" style="font-size:11.5px">Drag it in 3D or 2D to move. R rotates.</p>`; }
  else if (s.kind === 'room') { const r = findRoom(s.id); if (!r) { el.classList.remove('on'); return; } const c = roomCost(r);
    h += `<h4>${ROOM_TYPES[r.type].icon} <input value="${esc(r.name)}" data-act-change="r-name" style="width:180px"></h4>
    <div class="two"><label class="field">Type<select data-act-change="r-type">${Object.entries(ROOM_TYPES).map(([k, v]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label><label class="field">Wall<input type="color" value="${roomWall(r)}" data-act-input="wall-custom"></label></div>
    <div class="two"><label class="field">Width (m)<input type="number" step="0.05" value="${r.w}" data-act-change="r-dim" data-k="w"></label><label class="field">Depth (m)<input type="number" step="0.05" value="${r.d}" data-act-change="r-dim" data-k="d"></label></div>
    <label class="field">Floor<select data-act-change="r-floor">${Object.entries(FLOORS).map(([k, v]) => `<option value="${k}" ${roomFloorKey(r) === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    <div class="kv" style="margin:6px 0"><span>Area</span><b>${r2(area(r))} m² · ${Math.round(area(r) * SQFT)} sq ft</b><span>Estimate</span><b>${inr(c.total)}</b></div>
    <div class="row"><button class="btn sm" data-act="furnish-room">🪄 Furnish</button><button class="btn sm ghost" data-act="focus-room">Focus</button><button class="btn sm ghost" data-act="ask-room">Ask Aria</button><button class="btn sm ghost" data-act="del">Delete</button></div>`; }
  else if (s.kind === 'door' || s.kind === 'window') { const f = FL(); const o = (s.kind === 'door' ? f.doors : f.windows).find(x => x.id === s.id); if (!o) { el.classList.remove('on'); return; }
    h += `<h4>${s.kind === 'door' ? '🚪 Door' : '🪟 Window'}</h4><label class="field">Width (m)<input type="number" step="0.05" min="0.5" max="4" value="${o.w}" data-act-change="op-w"></label>
    ${s.kind === 'window' ? `<div class="two"><label class="field">Sill (m)<input type="number" step="0.05" value="${o.sill}" data-act-change="op-k" data-k="sill"></label><label class="field">Height (m)<input type="number" step="0.05" value="${o.h}" data-act-change="op-k" data-k="h"></label></div>` : `<label class="row muted"><input type="checkbox" ${o.main ? 'checked' : ''} data-act-change="op-main"> Main entrance</label>`}
    <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="del">Delete</button></div><p class="muted" style="font-size:11.5px">Drag it along walls in 2D view.</p>`; }
  el.innerHTML = h; el.classList.add('on');
}

/* ---------- chat ---------- */
function addChat(role, text, via) {
  const log = $('#chat-log'); if (!log) return; const m = document.createElement('div'); m.className = 'msg ' + role; m.textContent = text;
  if (role === 'aria' && via) { const s = document.createElement('small'); s.textContent = via === 'on-device' ? 'on-device engine' : 'via ' + via; m.appendChild(s); }
  if (role === 'aria' && S.paintChips) { const w = document.createElement('div'); w.className = 'swatches'; w.innerHTML = S.paintChips.list.map(s => `<button class="sw" title="${esc(s.name)}: ${esc(s.why)}" style="background:${s.hex}" data-act="chat-paint" data-r="${S.paintChips.room}" data-c="${s.hex}" data-n="${esc(s.name)}"></button>`).join(''); m.appendChild(w); S.paintChips = null; }
  log.appendChild(m); log.scrollTop = log.scrollHeight;
}
function chatSuggestions() {
  const r = selRoom(); const rs = allRooms(); const bed = rs.find(x => ['master', 'bedroom'].includes(x.type)), study = rs.find(x => ['study', 'empty', 'guest'].includes(x.type)) || rs.find(x => x.type === 'bedroom');
  const list = [r ? `Paint ${r.name} sage green` : 'Give me a tour', bed ? `Design ${bed.name} under ₹30,000` : null, study ? `Convert ${study.name} into a home office` : null, 'Make the whole home Japandi', 'Italian marble in the living room', 'Show me sunset light', r ? `Suggest colours for ${r.name}` : 'Which room has the least daylight?'].filter(Boolean);
  $('#chat-sugg').innerHTML = list.slice(0, 5).map(t => `<button data-act="chat-sugg" data-t="${esc(t)}">${esc(t)}</button>`).join('');
}
async function sendChat(text) {
  if (!text.trim()) return; addChat('user', text); chatSuggestions();
  const log = $('#chat-log'); const ty = document.createElement('div'); ty.className = 'msg aria'; ty.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; log.appendChild(ty); log.scrollTop = log.scrollHeight;
  const out = await askAria(text, tourRoom() || selRoom());
  ty.remove(); addChat('aria', out.reply, out.via); refreshSidePanel(); renderInspector();
  if (out.via === 'on-device' && aiOn() && S.lastAIError) { toast(modelLabel() + ': ' + S.lastAIError.slice(0, 110), 4500); S.lastAIError = null; }
}

/* ---------- dashboard / onboarding / settings ---------- */
function confirmDel(id) { const t = Date.now(); if (confirmDel.id === id && t - confirmDel.t < 4000) { confirmDel.id = null; return true; } confirmDel.id = id; confirmDel.t = t; toast('Click delete again to remove this project'); return false; }
function renderDash() {
  const pf = S.prefs; const cu = currentUser(); $('#dash-hello').textContent = cu ? `Welcome, ${firstName(cu)}` : 'Welcome to DIMORA'; updateUserChips();
  $('#dash-prefs').innerHTML = `<span>Style <b>${pf.style}</b></span><span>Budget <b>${inr(pf.budget)}</b></span><span>Family <b>${pf.family}</b></span>${pf.kids ? '<span><b>Kids</b></span>' : ''}${pf.pets ? '<span><b>Pets</b></span>' : ''}${pf.wfh ? '<span><b>Works from home</b></span>' : ''}<span>Storage <b>${pf.storage}</b></span><span>Furniture <b>${pf.furniture}</b></span>`;
  const own = projOwner(); const local = store.get('projects', []).filter(p => (p.owner || 'device') === own);
  const merged = local.slice(); (CLOUD.list || []).forEach(c => { const i = merged.findIndex(p => p.id === c.id); if (i < 0) merged.push(Object.assign({ cloud: true }, c)); else if (c.updated > merged[i].updated) merged[i] = Object.assign({}, merged[i], c, { cloud: true }); });
  const list = merged.sort((a, b) => b.updated - a.updated);
  if (isCloud() && !renderDash.fetching) { renderDash.fetching = true; cloudList().then(l => { renderDash.fetching = false; if (l && $('#app').dataset.screen === 'dash' && JSON.stringify(l.map(x => [x.id, x.updated])) !== renderDash.lastSig) { renderDash.lastSig = JSON.stringify(l.map(x => [x.id, x.updated])); renderDash(); } }); }
  API.health().then(() => { if (aiOn() || !$('#dash-prefs') || $('#dash-ai')) return; $('#dash-prefs').insertAdjacentHTML('beforeend', `<div id="dash-ai" class="card" style="width:100%;display:flex;gap:14px;align-items:center;margin-top:10px"><span style="font-size:24px">✦</span><div style="flex:1"><b>${S.backendOK ? 'Connect the Qwen AI' : 'Start the DIMORA backend'}</b><div class="muted" style="font-size:13px">${S.backendOK ? 'The backend is running but no AI is connected. Run Qwen locally with Ollama (<code>ollama pull qwen3.5:9b</code>) or add an OpenRouter key so AI can read room labels, power Aria and write your tour narration.' : 'Plan detection, room graphs and the Qwen AI run on the Python backend. Start it with <code>python backend/app.py</code> and open http://127.0.0.1:8000. Until then DIMORA runs a simpler in-browser engine.'}</div></div><button class="btn primary sm" data-act="settings">Settings</button></div>`); });
  $('#proj-grid').innerHTML = `<div class="pcard new" data-act="new-upload"><div><div>＋</div><b>New from floor plan</b><small>JPG · PNG · PDF</small></div></div>` + list.map(p => `<div class="pcard" data-act="open-proj" data-id="${p.id}"><div class="th" style="${p.thumb ? `background-image:url(${p.thumb})` : ''}">${p.thumb ? '' : '◇'}</div><div class="pb"><b>${esc(p.name)}</b><small>${p.rooms} rooms · ${esc(p.theme || '')} · ${inr(p.cost || 0)} · ${new Date(p.updated).toLocaleDateString('en-IN')}</small></div><button class="del" data-act="del-proj" data-id="${p.id}">🗑</button></div>`).join('');
  updateAIBadge();
}
let ob = null;
function openOnboarding() {
  ob = { step: 0, p: deep(S.prefs) }; renderOnboarding(); $('#modal').classList.add('on');
}
function renderOnboarding() {
  const p = ob.p; const sw = ['#b5c4a8', '#c5d6e3', '#e3d4b8', '#efc2c8', '#cfc3e3', '#f1dc8f', '#c56c4b', '#4f8a8b', '#2e3f5c', '#f4f3ef', '#8a8f5c', '#d4a73a'];
  let body = '';
  if (ob.step === 0) body = `<h3 style="margin:0 0 10px">Preferred interior style</h3><div class="style-grid">${Object.entries(THEMES).map(([n, t]) => `<button class="opt ${p.style === n ? 'on' : ''}" data-act="ob-set" data-k="style" data-v="${n}"><b>${n}</b><div class="dots" style="margin-top:6px">${[t.walls[0], t.wood, t.fabric, t.accent].map(c => `<i style="background:${c}"></i>`).join('')}</div></button>`).join('')}</div>`;
  if (ob.step === 1) body = `<label class="field">Total interior budget: <b style="color:var(--text)">${inr(p.budget)}</b><input type="range" min="100000" max="5000000" step="50000" value="${p.budget}" data-act-input="ob-budget"></label>
    <h3 style="margin:14px 0 8px">Favourite colours <small class="muted">(pick up to 3)</small></h3><div class="swatches">${sw.map(c => `<button class="sw" style="background:${c};${p.colors.includes(c) ? 'outline:3px solid var(--acc);outline-offset:2px' : ''}" data-act="ob-color" data-c="${c}"></button>`).join('')}</div>
    <label class="field" style="margin-top:14px">Furniture preference<div class="seg">${TIERS.map(t => `<button class="${p.furniture === t ? 'on' : ''}" data-act="ob-set" data-k="furniture" data-v="${t}">${{ budget: 'Budget-friendly', standard: 'Mid-range', premium: 'Premium' }[t]}</button>`).join('')}</div></label>`;
  if (ob.step === 2) body = `<div class="two"><label class="field">Family members<input type="number" min="1" max="15" value="${p.family}" data-act-change="ob-num" data-k="family"></label><label class="field">Storage needs<select data-act-change="ob-sel" data-k="storage">${['low', 'medium', 'high'].map(s => `<option ${p.storage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
    ${[['kids', '👶 Children at home'], ['pets', '🐾 Pets'], ['wfh', '💻 Work from home — needs a desk setup']].map(([k, l]) => `<label class="row" style="margin:10px 0"><input type="checkbox" ${p[k] ? 'checked' : ''} data-act-change="ob-chk" data-k="${k}"> ${l}</label>`).join('')}`;
  $('#modal-card').innerHTML = `<button class="x" data-act="modal-close">✕</button><p class="eyebrow">Personalise DIMORA</p><h2>${['How should your home feel?', 'Budget & colours', 'Who lives here?'][ob.step]}</h2><div class="ob-steps">${[0, 1, 2].map(i => `<i class="${i <= ob.step ? 'on' : ''}"></i>`).join('')}</div>${body}
  <div class="row end" style="margin-top:20px">${ob.step ? '<button class="btn ghost" data-act="ob-back">Back</button>' : ''}<button class="btn primary" data-act="ob-next">${ob.step < 2 ? 'Next' : 'Save preferences'}</button></div>`;
}
function aiStatusHTML() {
  if (!S.backendOK) return `<div class="tag err">Backend offline</div><p class="muted" style="font-size:13px;margin:6px 0 0">Nothing answered at <code>${esc(API.base())}</code>. Start it with <code>python backend/app.py</code>.</p>`;
  const a = S.backend.ai, o = a.ollama, r = a.openrouter;
  return `<div class="tag ok">Backend v${esc(S.backend.version)} connected</div>
  <ul class="muted" style="font-size:13px;line-height:1.7;padding-left:18px;margin:8px 0 0">
  <li>Ollama (local): ${o.running ? (o.model_installed ? `✓ running with <b>${esc(o.model)}</b>` : `running, but <b>${esc(o.model)}</b> isn't installed — run <code>ollama pull ${esc(o.model)}</code>`) : 'not running'}</li>
  <li>OpenRouter (hosted): ${r.configured ? `✓ key set · <b>${esc(r.model)}</b>` : 'no key'}</li>
  <li>Active AI: <b>${a.active ? esc(modelLabel()) : 'none — Aria uses the rule-based engine'}</b></li></ul>`;
}
function openSettings() {
  $('#modal-card').innerHTML = `<button class="x" data-act="modal-close">✕</button><p class="eyebrow">Settings</p><h2>Backend &amp; AI</h2>
  <p class="muted">DIMORA's engine runs on a Python server: plan detection (OpenCV), room graphs (NetworkX) and the AI. The AI is <b>Qwen 3.5</b>, an open-source (Apache-2.0) vision-language model, run locally through <b>Ollama</b> or hosted on <b>OpenRouter</b>.</p>
  <div id="set-status" class="card" style="margin:10px 0">${aiStatusHTML()}</div>
  <label class="field">Backend URL<input id="set-url" value="${esc(S.backendUrl)}" placeholder="${esc(API.base())} (automatic)"></label>
  <label class="field">AI provider<select id="set-prov">${[['auto', 'Automatic: local Ollama first, then OpenRouter'], ['ollama', 'Local only (Ollama)'], ['openrouter', 'Hosted only (OpenRouter)']].map(([k, v]) => `<option value="${k}" ${S.aiProvider === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
  <label class="field">Ollama model<input id="set-ollama" value="${esc(S.ollamaModel)}" placeholder="qwen3.5:9b"></label>
  <label class="field">OpenRouter model<select id="set-or-model">${Object.entries(OR_MODELS).map(([k, v]) => `<option value="${k}" ${S.orModel === k ? 'selected' : ''}>${v} — ${k}</option>`).join('')}</select></label>
  <label class="field">OpenRouter API key <small class="muted">(optional — or set OPENROUTER_API_KEY in backend/.env)</small><input type="password" id="set-or-key" value="${esc(S.orKey)}" placeholder="sk-or-…" autocomplete="off"></label>
  <div class="row"><button class="btn primary" data-act="set-save">Save</button><button class="btn ghost" data-act="set-test">Test AI</button><span id="set-msg" class="muted"></span></div>
  <p class="muted" style="font-size:12px;margin-top:16px">Settings are stored only in this browser. The OpenRouter key is sent only to your own DIMORA backend, which forwards it to openrouter.ai. Better: keep it in <code>backend/.env</code> so it never touches the browser.</p>
  <h3 style="margin-top:20px">Graphics</h3>
  <label class="field">3D quality <small class="muted">(applies instantly)</small><select data-act-change="gfx">${[['ultra', 'Ultra: sharpest, full resolution'], ['high', 'High: realistic (recommended)'], ['balanced', 'Balanced: for laptops and phones'], ['low', 'Low: fastest']].map(([k, v]) => `<option value="${k}" ${(E ? E.quality : Engine.defaultQuality()) === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
  <h3 style="margin-top:20px">Data</h3><button class="btn sm ghost" data-act="clear-data">Clear all saved projects &amp; settings</button>`;
  $('#modal').classList.add('on');
  API.health(true).then(() => { const el = $('#set-status'); if (el) el.innerHTML = aiStatusHTML(); });
}
function readSettingsForm() {
  S.backendUrl = $('#set-url').value.trim(); S.aiProvider = $('#set-prov').value; S.ollamaModel = $('#set-ollama').value.trim() || 'qwen3.5:9b'; S.orModel = $('#set-or-model').value; S.orKey = $('#set-or-key').value.trim();
  store.set('ai', { backendUrl: S.backendUrl, aiProvider: S.aiProvider, ollamaModel: S.ollamaModel, orModel: S.orModel, orKey: S.orKey });
}
/* ---------- upload & detection flow ---------- */
let detectRes = null;
function resetUpload() { $('#up-drop').hidden = false; $('#up-result').hidden = true; $('#det-tools').hidden = true; DET.sel = null; $('#file-in').value = ''; $('#st-detect').className = ''; const n = $('#ai-note');
  const paint = () => { $('#use-ai').checked = aiOn(); $('#use-ai').disabled = !aiOn(); if (n) n.innerHTML = aiOn() ? `Using <b>${esc(modelLabel())}</b> on the backend` : S.backendOK ? `No AI connected — <a data-act="settings" style="color:var(--acc);cursor:pointer">connect Qwen</a> so it can read labels, dimensions, stairs &amp; floor names. The backend's computer vision still finds walls, rooms and floors.` : `Backend offline — DIMORA will use its simpler in-browser engine. Start it with <code>python backend/app.py</code>.`; };
  paint(); API.health().then(paint); }
/* input: a data URL, or a list of sheets [{url, name}] (one per file / PDF page). Every sheet may hold one or several floor plans. */
/* Server path: the Python backend detects, scales, orders, aligns and connects every floor. */
function applyServerFloors(list) {
  const pj = P();
  pj.floors = list.map(fl => { const f = newFloor(fl.name, fl.level); f.height = fl.height || 2.9;
    f.rooms = fl.rooms.map(r => makeRoom({ id: r.id, name: r.name, type: r.type, x: r.x, y: r.y, w: r.w, d: r.d, group: r.group || null }));
    f.doors = (fl.doors || []).map(d => Object.assign({}, d)); f.windows = (fl.windows || []).map(w => Object.assign({ sill: 0.9, h: 1.25 }, w));
    f.stairs = (fl.stairs || []).map(st => Object.assign({}, st)); f._stairRects = fl.stair_rects || []; return f; });
  pj.activeFloor = 0;
}
async function runServerDetection(input, opts = {}) {
  const files = input.files ? input.files : typeof input === 'string' ? [new File([dataURLtoBlob(input)], (opts.name || 'plan').replace(/[^\w -]+/g, '') + '.png', { type: 'image/png' })] : input.map((sh, i) => new File([dataURLtoBlob(sh.url)], (sh.name || 'sheet ' + (i + 1)).replace(/[^\w -]+/g, '') + '.png', { type: 'image/png' }));
  $('#up-drop').hidden = true; $('#up-result').hidden = false; $('#btn-gen').disabled = true;
  const first = files[0]; $('#up-img').src = typeof input === 'string' ? input : /^image\//.test(first.type) ? URL.createObjectURL(first) : '';
  $('#up-ov').innerHTML = ''; $$('#up-stage .ovl').forEach(x => x.remove()); $('#det-log').innerHTML = ''; $('#det-rooms').innerHTML = ''; $('#det-counts').innerHTML = ''; $('#det-floors').innerHTML = '';
  $('#up-stage').classList.add('scanning'); $('#st-detect').className = 'on';
  const log = m => { const li = document.createElement('li'); li.textContent = m; $('#det-log').appendChild(li); $('#det-log').scrollTop = 1e6; };
  S.project = newProject(opts.name || 'My Home'); S.history = []; S.future = []; S.variants = []; S.structuralLog = []; S.sel = null; S.showAllFloors = false; S.explode = false;
  DET.sel = null; detSetTool('select');
  const fd = new FormData(); files.forEach(f => fd.append('files', f, f.name));
  fd.append('use_ai', $('#use-ai').checked ? '1' : '0'); fd.append('width_m', String(+(opts.widthM ?? $('#plan-width').value) || 0));
  fd.append('floors', String(+(opts.floors ?? ($('#floor-count') && $('#floor-count').value)) || 0)); if (opts.defaultWidth) fd.append('default_width', String(opts.defaultWidth));
  log(`Sending ${files.length} file${files.length > 1 ? 's' : ''} to the DIMORA backend (${API.base()})…`);
  try {
    const res = await API.req('/api/plans/detect', { form: fd, timeout: 600000 });
    (res.log || []).forEach(log);
    applyServerFloors(res.floors);
    P().wallThickness = res.wall_thickness; P().scaleNote = res.scale_note; P().planImage = res.floors[0].overlay.image || (typeof input === 'string' ? input : null);
    detectRes = { server: true, cur: 0, floors: res.floors.map(fl => ({ url: fl.overlay.image || $('#up-img').src, rd: { cv: { W: fl.overlay.W, H: fl.overlay.H }, mpp: fl.overlay.mpp, bx0: fl.overlay.bx0, by0: fl.overlay.by0, off: fl.overlay.off, source: res.source + ' (backend)' } })) };
    renderDetection(); $('#btn-gen').disabled = false;
  } catch (e) {
    console.error(e); log('⚠ ' + e.message);
    if (e.code === 'offline') { log('Switching to the in-browser engine…'); $('#up-stage').classList.remove('scanning'); const sheets = input.files ? await filesToSheets(input.files) : input; return runDetection(sheets, Object.assign({}, opts, { local: true })); }
    toast(e.message, 5000);
  }
  $('#up-stage').classList.remove('scanning');
}
async function runDetection(input, opts = {}) {
  if (!opts.local) { await API.health(); if (S.backendOK) return runServerDetection(input, opts); }
  if (input && input.files) input = await filesToSheets(input.files);
  const sheets = typeof input === 'string' ? [{ url: input, name: opts.name || '' }] : input;
  $('#up-drop').hidden = true; $('#up-result').hidden = false; $('#btn-gen').disabled = true;
  $('#up-img').src = sheets[0].url; $('#up-ov').innerHTML = ''; $$('#up-stage .ovl').forEach(x => x.remove()); $('#det-log').innerHTML = ''; $('#det-rooms').innerHTML = ''; $('#det-counts').innerHTML = ''; $('#det-floors').innerHTML = '';
  $('#up-stage').classList.add('scanning'); $('#st-detect').className = 'on';
  const log = m => { const li = document.createElement('li'); li.textContent = m; $('#det-log').appendChild(li); $('#det-log').scrollTop = 1e6; };
  S.project = newProject(opts.name || 'My Home'); S.project.planImage = sheets[0].url; S.history = []; S.future = []; S.variants = []; S.structuralLog = []; S.sel = null; S.showAllFloors = false; S.explode = false;
  const useAI = $('#use-ai').checked, widthM = +(opts.widthM ?? $('#plan-width').value) || 0;
  const forced = sheets.length === 1 ? (+(opts.floors ?? ($('#floor-count') && $('#floor-count').value)) || 0) : 0;
  try {
    await sleep(350);
    // 1) find every floor plan on every sheet
    const plans = [];
    for (let si = 0; si < sheets.length; si++) {
      const sh = sheets[si]; const img = await loadImage(sh.url);
      let boxes = splitSheet(img), how = 'computer vision', repeat = 0;
      if (forced && boxes.length !== forced) {
        if (forced === 1) boxes = [{ x0: 0, y0: 0, x1: 1, y1: 1 }];
        else if (boxes.length < forced) repeat = forced - boxes.length; // fewer plans than storeys: typical floor
        else boxes = boxes.slice(0, forced);
      }
      const padded = boxes.length > 1 ? padBoxes(boxes) : boxes;
      if (boxes.length > 1) log(`${sheets.length > 1 ? (sh.name || 'Sheet ' + (si + 1)) + ': ' : ''}found ${boxes.length} separate floor plans on the sheet (${how}).`);
      padded.forEach((b, i) => plans.push({ url: boxes.length > 1 ? cropToURL(img, b) : sh.url, sheet: si, name: sh.name || '', hint: boxes[i].label || '', hintLevel: boxes[i].level, idx: plans.length }));
      if (repeat) { const last = plans[plans.length - 1]; log(`${boxes.length} plan${boxes.length === 1 ? '' : 's'} drawn for ${forced} storeys — repeating the top plan as a typical floor for the ${repeat} floor${repeat === 1 ? '' : 's'} above.`);
        for (let k = 0; k < repeat; k++) plans.push(Object.assign({}, last, { idx: plans.length, hint: '', hintLevel: null, typicalOf: last.idx })); }
    }
    const multi = plans.length > 1;
    if (!multi) {
      const rd = await detectPlan(plans[0].url, { log, widthM, useAI, defaultWidth: opts.defaultWidth });
      detectRes = { floors: [{ rd, url: plans[0].url }], cur: 0 };
      log(`Built ${FL().rooms.length} rooms, ${FL().doors.length} doors and ${FL().windows.length} windows · ${P().scaleNote}`);
    } else {
      log(`Reading ${plans.length} floors one by one…`);
      // 2) read each floor
      for (const p of plans) { if (p.typicalOf != null) { const src = plans.find(q => q.idx === p.typicalOf); p.rd = Object.assign({}, src.rd, { level: null, label: '' }); continue; } p.rd = await readPlan(p.url, { log, useAI, multi: true, tag: `Plan ${p.idx + 1}` }); }
      // 3) order floors: AI level → printed title → file name → position on the sheet
      plans.forEach(p => { const lv = p.rd.level ?? (p.hintLevel != null && isFinite(+p.hintLevel) ? +p.hintLevel : null) ?? parseLevel(p.rd.label) ?? parseLevel(p.hint) ?? (sheets.length > 1 ? parseLevel(p.name) : null); p.sortKey = lv == null ? 1000 + p.idx : lv * 100 + p.idx; p.title = p.rd.label || p.hint || ''; });
      plans.sort((a, b) => a.sortKey - b.sortKey);
      // 4) scale: one sheet = one drawing scale (metres per native pixel)
      const natW = p => p.rd.pxW * p.rd.nat; const sheetMpp = {};
      if (widthM) sheetMpp[plans[0].sheet] = widthM / natW(plans[0]);
      [...new Set(plans.map(p => p.sheet))].forEach(si => { if (sheetMpp[si]) return; const v = plans.filter(p => p.sheet === si && p.rd.widthM).map(p => p.rd.widthM / natW(p)).sort((a, b) => a - b); if (v.length) sheetMpp[si] = v[Math.floor(v.length / 2)]; });
      if (!Object.keys(sheetMpp).length) sheetMpp[plans[0].sheet] = (opts.defaultWidth || 12) / natW(plans[0]);
      const g0 = plans[0], gWidth = sheetMpp[g0.sheet] ? natW(g0) * sheetMpp[g0.sheet] : null;
      plans.forEach(p => { if (!sheetMpp[p.sheet]) sheetMpp[p.sheet] = (gWidth || plans.map(q => sheetMpp[q.sheet] && natW(q) * sheetMpp[q.sheet]).find(Boolean) || 12) / natW(p); });
      // 5) build floors
      const pj = P(); pj.floors = plans.map((p, k) => { const f = newFloor(cleanFloorName(p.title, k), k); buildFloorFromReading(p.rd, f, sheetMpp[p.sheet] * p.rd.nat, { main: k === 0 }); return f; });
      // make floor names unique
      pj.floors.forEach((f, k) => { if (pj.floors.some((o, j) => j < k && o.name === f.name)) f.name = floorName(k); });
      const offs = plans.map(() => [0, 0]); alignAndConnectFloors(pj.floors, offs); plans.forEach((p, k) => p.rd.off = offs[k]);
      pj.activeFloor = 0; setThicknessFrom(plans[0].rd);
      const srcs = [...new Set(plans.map(p => p.rd.source))].join(' / ');
      pj.scaleNote = `${srcs} · ${pj.floors.length} floors · scale ${r2(plans[0].rd.mpp * 100)} cm/px · ground floor width ${r2(homeBounds(pj.floors[0]).w)} m`;
      detectRes = { floors: plans.map(p => ({ rd: p.rd, url: p.url })), cur: 0 };
      pj.floors.forEach(f => log(`${f.name}: ${f.rooms.length} rooms, ${f.doors.length} doors, ${f.windows.length} windows${f.stairs.length ? ', staircase going up' : ''}`));
      const st = pj.floors.filter(f => f.stairs.length).length; log(`Stacked ${pj.floors.length} floors and connected them with ${st} staircase${st === 1 ? '' : 's'} · ${pj.scaleNote}`);
    }
    renderDetection();
    $('#btn-gen').disabled = false;
  } catch (e) { console.error(e); log('⚠ ' + e.message); toast(e.message, 5000); }
  $('#up-stage').classList.remove('scanning');
}
/* ---------- detection-screen editor: fix rooms, doors and windows before generating ---------- */
const DET = { tool: 'select', sel: null, drag: null, ghost: null };
function detGeo() {
  const D = detectRes; if (!D || !S.project) return null; const fi = clamp(D.cur, 0, P().floors.length - 1); const res = D.floors[fi].rd, off = res.off || [0, 0];
  return { f: P().floors[fi], fi, toM: (px, py) => [r2(((px / 100 * res.cv.W) - res.bx0) * res.mpp + off[0]), r2(((py / 100 * res.cv.H) - res.by0) * res.mpp + off[1])] };
}
function detPointer(e) { const r = $('#up-img').getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100]; }
function detSetTool(t) {
  DET.tool = t; DET.ghost = null; $$('[data-act=det-tool]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $('#up-stage').dataset.tool = t;
  $('#det-hint').textContent = { select: 'Click a room, door or window to select it. Drag a room to move it.', room: 'Drag on the plan to draw a room.', door: 'Click on a wall to add a door.', window: 'Click on an outside wall to add a window.' }[t];
}
function detSnapEdge(v, f, axis, except) { let best = null; f.rooms.forEach(r => { if (r === except) return; (axis === 'x' ? [r.x, r.x + r.w] : [r.y, r.y + r.d]).forEach(e => { if (Math.abs(e - v) < 0.25 && (best == null || Math.abs(e - v) < Math.abs(best - v))) best = e; }); }); return best != null ? best : r2(snap(v, 0.05)); }
function detDelete(sel = DET.sel) {
  const g = detGeo(); if (!g || !sel) return; const f = g.f, id = sel.id;
  if (sel.kind === 'room') f.rooms = f.rooms.filter(r => r.id !== id); else if (sel.kind === 'door') f.doors = f.doors.filter(d => d.id !== id);
  else if (sel.kind === 'window') f.windows = f.windows.filter(d => d.id !== id); else if (sel.kind === 'stair') f.stairs = (f.stairs || []).filter(d => d.id !== id);
  DET.sel = null; renderDetection();
}
function initDetEditor() {
  const st = $('#up-stage'); if (!st || st._det) return; st._det = true;
  st.addEventListener('pointerdown', e => {
    const g = detGeo(); if (!g || $('#up-result').hidden || $('#btn-gen').disabled) return; const m = g.toM(...detPointer(e)), f = g.f; P().activeFloor = g.fi;
    if (DET.tool === 'room') { DET.drag = { kind: 'draw', a: m }; DET.ghost = { a: m, b: m }; st.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (DET.tool === 'door' || DET.tool === 'window') {
      const nw = nearestWall(m, f); if (!nw) { toast('Click closer to a wall'); return; }
      const L = nw.L, w = Math.min(DET.tool === 'door' ? 0.9 : 1.2, L.b - L.a - 0.1); const t = clamp(nw.t, L.a + w / 2 + 0.05, L.b - w / 2 - 0.05);
      if (DET.tool === 'window' && !isExteriorPoint(f, L.o, L.c, t)) { toast('Windows go on outside walls'); return; }
      const o = { id: uid(DET.tool === 'door' ? 'd' : 'w'), o: L.o, x: r2(L.o === 'h' ? t : L.c), y: r2(L.o === 'h' ? L.c : t), w: r2(w) };
      if (DET.tool === 'door') f.doors.push(o); else f.windows.push(Object.assign(o, { sill: 0.9, h: 1.25 }));
      DET.sel = { kind: DET.tool, id: o.id }; renderDetection(); return;
    }
    const el = e.target.closest('[data-k]');
    if (el) { DET.sel = { kind: el.dataset.k, id: el.dataset.id }; if (el.dataset.k === 'room') { const r = f.rooms.find(x => x.id === el.dataset.id); if (r) { DET.drag = { kind: 'move', r, start: m, x: r.x, y: r.y }; st.setPointerCapture(e.pointerId); } } }
    else DET.sel = null;
    renderDetection();
  });
  st.addEventListener('pointermove', e => { const d = DET.drag; if (!d) return; const g = detGeo(); if (!g) return; const m = g.toM(...detPointer(e));
    if (d.kind === 'draw') { DET.ghost.b = m; renderDetection(); }
    else if (d.kind === 'move') { d.r.x = r2(d.x + m[0] - d.start[0]); d.r.y = r2(d.y + m[1] - d.start[1]); d.moved = true; renderDetection(); } });
  st.addEventListener('pointerup', () => { const d = DET.drag; DET.drag = null; if (!d) return; const g = detGeo(); if (!g) return; const f = g.f;
    if (d.kind === 'draw') { const a = DET.ghost.a, b = DET.ghost.b; DET.ghost = null;
      let x0 = detSnapEdge(Math.min(a[0], b[0]), f, 'x'), x1 = detSnapEdge(Math.max(a[0], b[0]), f, 'x'), y0 = detSnapEdge(Math.min(a[1], b[1]), f, 'y'), y1 = detSnapEdge(Math.max(a[1], b[1]), f, 'y');
      if (x1 - x0 >= 0.8 && y1 - y0 >= 0.8) { const r = makeRoom({ name: 'New Room', type: 'empty', x: r2(x0), y: r2(y0), w: r2(x1 - x0), d: r2(y1 - y0) }); f.rooms.push(r); DET.sel = { kind: 'room', id: r.id }; detSetTool('select'); toast('Room added — name it and pick its type in the list'); }
      else toast('Drag a bigger rectangle (at least 0.8 × 0.8 m)');
      renderDetection(); }
    if (d.kind === 'move' && d.moved) { const r = d.r; const nx = detSnapEdge(r.x, f, 'x', r), nx1 = detSnapEdge(r.x + r.w, f, 'x', r), ny = detSnapEdge(r.y, f, 'y', r), ny1 = detSnapEdge(r.y + r.d, f, 'y', r);
      const dx = Math.abs(nx - r.x) <= Math.abs(nx1 - r.x - r.w) ? nx - r.x : nx1 - r.x - r.w, dy = Math.abs(ny - r.y) <= Math.abs(ny1 - r.y - r.d) ? ny - r.y : ny1 - r.y - r.d;
      r.x = r2(r.x + dx); r.y = r2(r.y + dy); renderDetection(); } });
  document.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && DET.sel && !$('#up-result').hidden && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); detDelete(); } });
}
function renderDetection() {
  const D = detectRes; if (!D) return; const pj = P(); const fi = clamp(D.cur, 0, pj.floors.length - 1); const e = D.floors[fi]; const res = e.rd, f = pj.floors[fi]; const cv = res.cv; const off = res.off || [0, 0];
  if ($('#up-img').getAttribute('src') !== e.url) $('#up-img').src = e.url;
  const toPct = (mx, my) => [(((mx - off[0]) / res.mpp) + res.bx0) / cv.W * 100, (((my - off[1]) / res.mpp) + res.by0) / cv.H * 100];
  const ov = []; $$('#up-stage .ovl').forEach(x => x.remove());
  const isSel = (k, id) => DET.sel && DET.sel.kind === k && DET.sel.id === id;
  f.rooms.forEach((r, i) => { const [x0, y0] = toPct(r.x, r.y), [x1, y1] = toPct(r.x + r.w, r.y + r.d); const sel = isSel('room', r.id); ov.push(`<rect data-k="room" data-id="${r.id}" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${ROOM_TYPES[r.type].tint}" fill-opacity="${sel ? 0.7 : 0.45}" stroke="${sel ? '#f59e0b' : '#7c3aed'}" stroke-width="${sel ? 3 : 1.2}" ${r.group ? 'stroke-dasharray="6 4"' : ''} vector-effect="non-scaling-stroke" ${D.animated ? '' : `style="animation:pop .4s ease ${i * 0.08}s both"`}/>`);
    const lb = document.createElement('div'); lb.className = 'ovl'; lb.style.cssText = `position:absolute;left:${(x0 + x1) / 2}%;top:${(y0 + y1) / 2}%;transform:translate(-50%,-50%);background:rgba(11,15,25,.85);color:#fff;border-radius:6px;padding:2px 6px;font-size:11px;font-weight:700;white-space:nowrap;pointer-events:none`; lb.textContent = `${r.name} · ${r.w}×${r.d}`; $('#up-stage').appendChild(lb); });
  const seg = (o, k, col) => { const a = o.o === 'h' ? toPct(o.x - o.w / 2, o.y) : toPct(o.x, o.y - o.w / 2), b = o.o === 'h' ? toPct(o.x + o.w / 2, o.y) : toPct(o.x, o.y + o.w / 2); const sel = isSel(k, o.id);
    ov.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${sel ? '#f59e0b' : col}" stroke-width="${sel ? 7 : 4}" stroke-linecap="round" vector-effect="non-scaling-stroke"/><line data-k="${k}" data-id="${o.id}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke"/>`); };
  f.doors.forEach(d => seg(d, 'door', d.main ? '#ef4444' : '#ec4899')); f.windows.forEach(w => seg(w, 'window', '#2f8fd0'));
  if (DET.ghost) { const [x0, y0] = toPct(Math.min(DET.ghost.a[0], DET.ghost.b[0]), Math.min(DET.ghost.a[1], DET.ghost.b[1])), [x1, y1] = toPct(Math.max(DET.ghost.a[0], DET.ghost.b[0]), Math.max(DET.ghost.a[1], DET.ghost.b[1])); ov.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="rgba(124,58,237,.18)" stroke="#a78bfa" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`); }
  const stairBox = (st, dash) => { const ft = stairFoot(st); const [x0, y0] = toPct(ft.x, ft.y), [x1, y1] = toPct(ft.x + ft.w, ft.y + ft.d); const lw = toPct(...stairEnd(st, 'low')), hi = toPct(...stairEnd(st, 'high')); ov.push(`<rect ${dash ? '' : `data-k="stair" data-id="${st.id}"`} x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#f59e0b" fill-opacity="${dash ? 0.12 : 0.35}" stroke="#f59e0b" stroke-width="2" ${dash ? 'stroke-dasharray="4 3"' : ''} vector-effect="non-scaling-stroke"/>`); if (!dash) ov.push(`<line x1="${lw[0]}" y1="${lw[1]}" x2="${hi[0]}" y2="${hi[1]}" stroke="#b45309" stroke-width="2" marker-end="url(#det-arrow)" vector-effect="non-scaling-stroke"/>`); };
  (f.stairs || []).forEach(st => stairBox(st, false)); stairsBelow(f).forEach(st => stairBox(st, true));
  $('#up-ov').setAttribute('viewBox', '0 0 100 100'); $('#up-ov').setAttribute('preserveAspectRatio', 'none'); $('#up-ov').innerHTML = `<defs><marker id="det-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b45309"/></marker></defs>` + ov.join('');
  const multi = pj.floors.length > 1;
  $('#det-floors').innerHTML = multi ? `<div class="det-floor-tabs">${pj.floors.map((x, i) => `<button class="chip ${i === fi ? 'on' : ''}" data-act="det-floor" data-i="${i}">${esc(x.name)} <small>${x.rooms.length}</small></button>`).join('')}</div>
    <div class="det-floor-row"><input value="${esc(f.name)}" data-act-change="det-floor-name" title="Floor name"><button class="icon-btn" data-act="det-floor-move" data-d="-1" title="Move this floor down a level" ${fi === 0 ? 'disabled' : ''}>↓</button><button class="icon-btn" data-act="det-floor-move" data-d="1" title="Move this floor up a level" ${fi === pj.floors.length - 1 ? 'disabled' : ''}>↑</button></div>
    <small class="muted">${f.stairs?.length ? `Staircase ${stairWidth(f.stairs[0])} m wide rises to ${esc(floorAbove(f)?.name || 'the floor above')} (orange, arrow = up).` : stairsBelow(f).length ? 'Dashed orange = stair opening from the floor below.' : ''}</small>` : `<div class="det-floor-row"><small class="muted" style="flex:1">One floor found. Is the building taller (a typical floor plan)?</small></div>`;
  $('#det-floors').insertAdjacentHTML('beforeend', `<button class="btn sm ghost" data-act="det-floor-add" title="Copy this floor as a new storey on top, with a staircase up to it">＋ Add floor above (copy of ${esc(f.name)})</button>`);
  const walls = wallLines(f).length;
  $('#det-counts').innerHTML = [['Walls', walls], ['Rooms', f.rooms.length], ['Doors', f.doors.length], ['Windows', f.windows.length]].concat(multi ? [['Floors', pj.floors.length]] : []).map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('');
  $('#det-rooms').innerHTML = `<small class="muted">${esc(res.source)} · check names &amp; types before generating</small>` + f.rooms.map(r => `<div class="det-room ${DET.sel && DET.sel.id === r.id ? 'sel' : ''}"><i style="background:${ROOM_TYPES[r.type].tint}"></i><input value="${esc(r.name)}" data-act-change="det-name" data-id="${r.id}"><select data-act-change="det-type" data-id="${r.id}">${Object.entries(ROOM_TYPES).map(([k, v]) => `<option value="${k}" ${k === r.type ? 'selected' : ''}>${v.label}</option>`).join('')}</select><small>${r.w}×${r.d} m</small><button class="x" data-act="det-del-room" data-id="${r.id}" title="Delete room">✕</button></div>`).join('');
  $('#det-tools').hidden = false; D.animated = true;
  $('#btn-gen').textContent = multi ? `Generate ${pj.floors.length}-floor 3D model →` : 'Generate 3D model →';
}
/* swap two floors' levels (user says "this is actually the first floor"), then re-align and re-connect the stairs */
async function detMoveFloor(d) {
  const D = detectRes, pj = P(); const i = D.cur, j = i + d; if (j < 0 || j >= pj.floors.length) return;
  if (D.server) {
    const geo = projectGeometry(pj).floors, offs = D.floors.map(e => e.rd.off);
    [geo[i], geo[j]] = [geo[j], geo[i]]; [offs[i], offs[j]] = [offs[j], offs[i]];
    try { const r = await API.req('/api/plans/restack', { body: { floors: geo, offsets: offs }, timeout: 30000 }); [D.floors[i], D.floors[j]] = [D.floors[j], D.floors[i]]; applyServerFloors(r.floors); D.floors.forEach((e, k) => e.rd.off = r.offsets[k]); }
    catch (e) { toast('Could not re-stack: ' + e.message, 4000); return; }
    D.cur = j; pj.activeFloor = j; renderDetection(); return;
  }
  pj.floors.forEach((f, k) => shiftFloor(f, -D.floors[k].rd.off[0], -D.floors[k].rd.off[1]));
  [pj.floors[i], pj.floors[j]] = [pj.floors[j], pj.floors[i]]; [D.floors[i], D.floors[j]] = [D.floors[j], D.floors[i]];
  pj.floors.forEach((f, k) => { f.level = k; if (FLOOR_NAMES.includes(f.name) || /^\d+(st|nd|rd|th) Floor$/.test(f.name)) f.name = floorName(k); f.doors = f.doors.filter(x => !x.main); });
  autoOpenings(pj.floors[0], { windows: false });
  const offs = pj.floors.map(() => [0, 0]); alignAndConnectFloors(pj.floors, offs); D.floors.forEach((e, k) => e.rd.off = offs[k]);
  D.cur = j; pj.activeFloor = j; renderDetection();
}
/* add a storey on top: a copy of the floor being viewed (typical floor), then re-align and add the stairs */
async function detAddFloor() {
  const D = detectRes, pj = P(); if (!D || !pj) return; const i = D.cur, src = pj.floors[i];
  if (pj.floors.length >= 30) { toast('That is a lot of floors — 30 is the limit'); return; }
  const c = deep(src); const n = pj.floors.length;
  c.id = uid('f'); c.level = n; c.name = floorName(n); c.stairs = [];
  c.rooms.forEach(r => { r.id = uid('r'); r.furniture = []; }); c.doors = c.doors.filter(d => !d.main).map(d => Object.assign(d, { id: uid('d') })); c.windows.forEach(w => { w.id = uid('w'); });
  const e = D.floors[i]; const entry = { rd: Object.assign({}, e.rd, { off: (e.rd.off || [0, 0]).slice() }), url: e.url };
  if (D.server) {
    const geo = projectGeometry(pj).floors.concat([projectGeometry({ floors: [c] }).floors[0]]), offs = D.floors.map(x => x.rd.off || [0, 0]).concat([entry.rd.off]);
    try { const r = await API.req('/api/plans/restack', { body: { floors: geo, offsets: offs }, timeout: 30000 }); D.floors.push(entry); applyServerFloors(r.floors); D.floors.forEach((x, k) => x.rd.off = r.offsets[k]); }
    catch (err) { toast('Could not add the floor: ' + err.message, 4000); return; }
  } else {
    pj.floors.push(c); D.floors.push(entry);
    pj.floors.forEach((f, k) => shiftFloor(f, -(D.floors[k].rd.off || [0, 0])[0], -(D.floors[k].rd.off || [0, 0])[1]));
    pj.floors.forEach(f => { f.stairs = []; });
    const offs = pj.floors.map(() => [0, 0]); alignAndConnectFloors(pj.floors, offs); D.floors.forEach((x, k) => x.rd.off = offs[k]);
  }
  D.cur = pj.floors.length - 1; pj.activeFloor = D.cur; DET.sel = null; renderDetection(); toast(`Added ${pj.floors[D.cur].name}`);
}
async function generate3D() {
  const pj = P(); if (!allRooms().length) return;
  const beds = allRooms().filter(r => ['bedroom', 'master', 'guest'].includes(r.type)).length || 1;
  if (pj.name === 'My Home') pj.name = pj.floors.length === 2 ? `${beds}BHK Duplex` : pj.floors.length > 2 ? `${beds}BHK G+${pj.floors.length - 1} Home` : `${beds}BHK Home`;
  pj.floors.forEach(f => delete f._stairRects);
  pj.theme = S.prefs.style; furnishAll(); clearStairFurniture();
  pj.activeFloor = 0; S.showAllFloors = pj.floors.length > 1; S.explode = false;
  S.original = deep(S.project);
  openWorkspace(true);
}
function openWorkspace(fresh) {
  show('work');
  if (!E) { init3D(); init2D(); }
  $('#proj-name').value = P().name;
  S.sel = null; S.view = '3d'; $('#app').dataset.view = '3d'; $$('#view-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === '3d'));
  if (!S.original) S.original = deep(S.project);
  rebuild(); renderFloorSeg();
  fitView(false); if (fresh) { CTL.orbit.r *= 1.25; CTL.apply(); fitView(true); startBuildAnim(); }
  openPanel(S.panel || 'design'); renderInspector(); updateAIBadge(); chatSuggestions();
  if (S.chatFor !== P().id) { S.chatFor = P().id; $('#chat-log').innerHTML = ''; const pc = S.paintChips; S.paintChips = null; (P().chat || []).slice(-20).forEach(m => addChat(m.role === 'aria' ? 'aria' : 'user', m.text)); S.paintChips = pc; }
  if (!$('#chat-log').children.length) addChat('aria', `Hi${currentUser() ? ' ' + firstName(currentUser()) : ''}! I'm Aria. ${ariaGoalLine()}Your ${P().name} is ready in 3D with ${allRooms().length} rooms, furnished in ${P().theme} style. Ask me to change anything — or press “AI Home Tour” and I'll walk you through it.`);
  if (fresh && window.innerWidth > 1480) $('#app').classList.add('chat-open');
  setTimeout(() => save(true), 2600);
}
function renderFloorSeg() {
  const pj = P(); if (!pj) return; const multi = pj.floors.length > 1;
  const btns = pj.floors.map((f, i) => `<button class="${i === pj.activeFloor && !(S.showAllFloors && S.view !== '2d') ? 'on' : ''}" data-act="floor-switch" data-i="${i}" title="${esc(f.name)}">${esc(f.name.replace(/ Floor$/, ''))}</button>`).join('');
  $$('.floor-seg').forEach(el => { el.style.display = multi ? '' : 'none'; el.innerHTML = btns + (el.id === 'floor-seg' ? `<button class="${S.showAllFloors ? 'on' : ''}" data-act="floor-all" title="Show the whole building">All</button><button class="${S.explode ? 'on' : ''}" data-act="floor-explode" title="Pull the floors apart">⇕ Explode</button>` : ''); });
}

/* ---------- compare helpers ---------- */
function renderWith(project, pos, target, w = 420, h = 270) {
  const saved = S.project, cam = { p: E.cam.pos.slice(), t: E.cam.target.slice() };
  S.project = project; rebuild(); E.cam.pos = pos; E.cam.target = target; const img = E.snapshot(w, h);
  S.project = saved; rebuild(); E.cam.pos = cam.p; E.cam.target = cam.t; E.dirty = true; return img;
}
function roomCam(r) { const f = floorOfRoom(r); const c = [r.x + r.w / 2, floorY(f) + 0.5, r.y + r.d / 2]; const R = Math.max(r.w, r.d) * 1.1 + 2; return { pos: [c[0] - R * 0.5, c[1] + R * 0.95, c[2] + R * 0.75], target: c }; }
function homeCam() { const { b, c, hgt } = viewFrame(); const R = Math.max(b.w, b.d, hgt) * 1.25 + 4; return { pos: [c[0] - R * 0.5, c[1] + R * 0.85, c[2] + R * 0.7], target: c }; }

/* ---------- report ---------- */
function planSVGStatic(f, W = 760) {
  const b = homeBounds(f), s = (W - 40) / b.w, H = b.d * s + 40; const X = x => 20 + (x - b.x) * s, Y = y => 20 + (y - b.y) * s; const o = [];
  f.rooms.forEach(r => o.push(`<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w * s}" height="${r.d * s}" fill="${ROOM_TYPES[r.type].tint}"/>`));
  f.rooms.forEach(r => r.furniture.forEach(it => o.push(`<g transform="translate(${X(it.x)} ${Y(it.y)}) rotate(${-it.rot})"><rect x="${-it.w * s / 2}" y="${-it.d * s / 2}" width="${it.w * s}" height="${it.d * s}" fill="#fff" fill-opacity=".7" stroke="#8a7f70" stroke-width=".8"/></g>`)));
  wallPieces(f).forEach(p => { const t = (p.ext ? 0.2 : 0.12) * s; if (p.kind === 'rail') o.push(p.o === 'h' ? `<line x1="${X(p.a)}" y1="${Y(p.c)}" x2="${X(p.b)}" y2="${Y(p.c)}" stroke="#6b7280" stroke-width="2" stroke-dasharray="3 2"/>` : `<line x1="${X(p.c)}" y1="${Y(p.a)}" x2="${X(p.c)}" y2="${Y(p.b)}" stroke="#6b7280" stroke-width="2" stroke-dasharray="3 2"/>`); else if (p.kind === 'solid') o.push(p.o === 'h' ? `<rect x="${X(p.a) - t / 2}" y="${Y(p.c) - t / 2}" width="${(p.b - p.a) * s + t}" height="${t}" fill="#2c2924"/>` : `<rect x="${X(p.c) - t / 2}" y="${Y(p.a) - t / 2}" width="${t}" height="${(p.b - p.a) * s + t}" fill="#2c2924"/>`); else if (p.kind === 'sill') o.push(p.o === 'h' ? `<line x1="${X(p.a)}" y1="${Y(p.c)}" x2="${X(p.b)}" y2="${Y(p.c)}" stroke="#2f8fd0" stroke-width="${t * 0.6}"/>` : `<line x1="${X(p.c)}" y1="${Y(p.a)}" x2="${X(p.c)}" y2="${Y(p.b)}" stroke="#2f8fd0" stroke-width="${t * 0.6}"/>`); });
  f.rooms.forEach(r => o.push(`<text x="${X(r.x + r.w / 2)}" y="${Y(r.y + r.d / 2)}" text-anchor="middle" font-size="11" font-weight="700" font-family="Manrope,Arial">${esc(r.name)}</text><text x="${X(r.x + r.w / 2)}" y="${Y(r.y + r.d / 2) + 13}" text-anchor="middle" font-size="9.5" fill="#5f5649" font-family="Manrope,Arial">${r.w} × ${r.d} m</text>`));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${o.join('')}</svg>`;
}
async function openReport() {
  const pj = P(), c = homeCost(), f = FL(); const rooms = allRooms(); const A = rooms.reduce((s, r) => s + area(r), 0);
  let img = ''; try { const hc = homeCam(); img = renderWith(S.project, hc.pos, hc.target, 900, 520); } catch (e) { }
  const sp = rooms.map(r => ({ r, a: analyzeSpace(r), L: analyzeLight(r), c: roomCost(r) }));
  const avgS = Math.round(sp.reduce((s, x) => s + x.a.score, 0) / sp.length), avgL = Math.round(sp.reduce((s, x) => s + x.L.score, 0) / sp.length);
  const checks = archChecks(f); const saves = rooms.flatMap(r => cheaperAlternatives(r).slice(0, 2).map(a => ({ r, a }))).sort((x, y) => y.a.save - x.a.save).slice(0, 6);
  const recs = [...sp.filter(x => x.a.corner).map(x => `${x.r.name}: convert the unused ${r2(x.a.corner.w)}×${r2(x.a.corner.d)} m corner into a study/reading corner or storage.`), ...sp.filter(x => x.L.suggestWindow).map(x => `${x.r.name}: add a ${x.L.suggestWindow.compass}-facing window for ${['Limited', 'Poor', 'No daylight'].includes(x.L.rating) ? 'daylight' : 'cross-ventilation'}.`), ...sp.flatMap(x => x.a.issues.slice(0, 1).map(i => `${x.r.name}: ${i}`))].slice(0, 10);
  const summaryId = 'rep-sum';
  const localSum = `${pj.name} offers ${r2(A)} m² (${Math.round(A * SQFT)} sq ft) across ${rooms.length} rooms in a ${pj.theme} scheme. The full interior is estimated at ${inr(c.total)} against a budget of ${inr(S.prefs.budget)} (${c.total <= S.prefs.budget ? 'within budget' : inr(c.total - S.prefs.budget) + ' over'}). Average space-utilisation score is ${avgS}/100 and daylight score ${avgL}/100. ${recs[0] ? 'Top opportunity — ' + recs[0] : ''}`;
  const html = `<div class="rep-bar"><b>Home Decision Report</b><button class="btn sm" data-act="rep-print">🖨 Print / PDF</button><button class="btn sm" data-act="rep-download">⬇ Download HTML</button><button class="btn sm" data-act="rep-copy">Copy summary</button><button class="btn sm primary" data-act="rep-close">Close</button></div>
  <div class="rep" id="rep-doc"><p style="letter-spacing:.2em;font-size:11px;font-weight:800;color:#9a4d12;margin:0">DIMORA · HOME DECISION REPORT</p><h1>${esc(pj.name)}</h1><p class="note">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · Theme: ${esc(pj.theme)} · Household of ${S.prefs.family}${S.prefs.kids ? ' with children' : ''}${S.prefs.pets ? ' and pets' : ''}${S.prefs.wfh ? ', works from home' : ''} · ${esc(pj.scaleNote || '')}</p>
  <div class="kpis"><div><b>${r2(A)} m²</b><span>carpet area · ${Math.round(A * SQFT)} sq ft</span></div><div><b>${inr(c.total)}</b><span>estimated interior</span></div><div><b>${avgS}/100</b><span>space utilisation</span></div><div><b>${avgL}/100</b><span>daylight &amp; airflow</span></div></div>
  <h2>Executive summary</h2><p id="${summaryId}">${esc(localSum)}</p>
  ${img ? `<img src="${img}" alt="3D view">` : ''}<h2>Floor plan — ${esc(f.name)}</h2>${planSVGStatic(f)}
  <h2>Room schedule</h2><table><tr><th>Room</th><th>Size</th><th class="r">Area</th><th>Walls</th><th>Floor</th><th>Space</th><th>Daylight</th><th class="r">Estimate</th></tr>${sp.map(x => `<tr><td><b>${esc(x.r.name)}</b><br><span class="note">${ROOM_TYPES[x.r.type].label}</span></td><td>${x.r.w} × ${x.r.d} m</td><td class="r">${r2(area(x.r))} m²</td><td><span class="sw" style="background:${roomWall(x.r)}"></span> ${roomWall(x.r)}</td><td>${FLOORS[roomFloorKey(x.r)].label}</td><td>${x.a.status} (${x.a.score})</td><td>${x.L.rating}${x.L.dirs.length ? ' · ' + x.L.dirs.join('/') : ''}</td><td class="r">${inr(x.c.total)}</td></tr>`).join('')}</table>
  <h2>Budget breakdown</h2><table><tr><th>Category</th><th class="r">Estimate</th><th class="r">Share</th></tr>${[['Furniture', c.furniture], ['Flooring', c.flooring], ['Wall painting', c.paint], ['Lighting', c.lighting], ['False ceiling', c.ceiling], ['Decor & curtains', c.decor]].map(([n, v]) => `<tr><td>${n}</td><td class="r">${inr(v)}</td><td class="r">${Math.round(v / c.total * 100)}%</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="r"><b>${inr(c.total)}</b></td><td class="r">Budget ${inr(S.prefs.budget)}</td></tr></table>
  ${saves.length ? `<h3>Ways to save</h3><ul>${saves.map(x => `<li>${esc(x.r.name)} — ${esc(x.a.what)}: save ${inr(x.a.save)}</li>`).join('')}</ul>` : ''}
  <h2>Furniture fit &amp; space utilisation</h2><table><tr><th>Room</th><th>Furniture</th><th class="r">Cover</th><th>Findings</th></tr>${sp.map(x => `<tr><td>${esc(x.r.name)}</td><td>${x.r.furniture.map(i => CATALOG[i.type].label).join(', ') || '—'}</td><td class="r">${Math.round(x.a.coverage * 100)}%</td><td>${esc(x.a.issues[0] || (x.a.corner ? `Unused ${r2(x.a.corner.area)} m² corner` : 'Comfortable clearances'))}</td></tr>`).join('')}</table>
  <h2>Selected materials &amp; finishes</h2><table><tr><th>Room</th><th>Flooring</th><th>Paint tier</th><th>Ceiling</th><th>Lighting</th></tr>${rooms.map(r => `<tr><td>${esc(r.name)}</td><td>${FLOORS[roomFloorKey(r)].label}</td><td>${PAINT[r.tier].label}</td><td>${CEILINGS[roomCeiling(r)].label}</td><td>${['ambient', 'task', 'accent'].filter(k => r.lights?.[k]).join(', ') || '—'}</td></tr>`).join('')}</table>
  <h2>Light &amp; ventilation</h2><ul>${sp.map(x => `<li><b>${esc(x.r.name)}</b>: ${x.L.rating} daylight (window/floor ${Math.round(x.L.wfr * 100)}%), ${x.L.vent.toLowerCase()}.${x.L.sugg[0] ? ' ' + esc(x.L.sugg[0]) : ''}</li>`).join('')}</ul>
  <h2>Architectural checks</h2><ul>${checks.map(ch => `<li><b>${esc(ch.t)}</b> — ${esc(ch.d)}</li>`).join('')}</ul>
  <h2>Recommendations</h2><ul>${recs.map(r => `<li>${esc(r)}</li>`).join('') || '<li>The layout is well balanced.</li>'}</ul>
  <p class="note" style="margin-top:30px">Cost figures are illustrative estimates for Indian metro markets, not market quotations. Structural observations are indicative only — consult a licensed architect or structural engineer before construction.</p></div>`;
  $('#report').innerHTML = html; $('#report').classList.add('on'); $('#report').scrollTop = 0;
  if (aiOn()) { const el = document.getElementById(summaryId); el.innerHTML = esc(localSum) + ` <span class="note">(${esc(modelLabel())} is writing a sharper summary…)</span>`;
    try { const j = await API.req('/api/report-summary', { body: { facts: localSum + ' Recommendations: ' + recs.join(' '), room_facts: rooms.map(r => roomFacts(r).line).join(' | ') }, timeout: 90000 }); el.textContent = (j.summary || localSum).trim(); } catch (e) { el.textContent = localSum; } }
}

/* ---------- action dispatcher ---------- */
const ACT = {
  'go-landing': () => show('landing'), 'go-dash': () => { if (S.touring) stopTour(); show('dash'); }, scroll: el => document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: 'smooth' }),
  start: () => { if (!S.prefs.onboarded) { show('dash'); openOnboarding(); } else show('dash'); },
  onboard: () => openOnboarding(), settings: () => openSettings(), 'modal-close': () => $('#modal').classList.remove('on'),
  sample: () => { sampleHome(); P().theme = S.prefs.style; S.history = []; S.future = []; S.variants = []; S.structuralLog = []; furnishAll(); S.original = deep(S.project); openWorkspace(true); },
  'new-upload': () => { show('upload'); resetUpload(); }, 'pick-file': () => $('#file-in').click(),
  'sample-plan': () => { const keep = S.project; sampleHome(); const { url, widthM } = drawPlanImage(S.project); S.project = keep; runDetection(url, { widthM, name: 'Sample Plan — 2BHK' }); },
  'sample-duplex': async () => { const keep = S.project; const sp = sampleDuplex(); S.project = keep; const { url, widthM } = await withProject(sp, () => drawSheetImage(sp)); runDetection(url, { widthM, name: 'Sample Duplex — G+1', floors: 0 }); },
  'det-floor': el => { detectRes.cur = +el.dataset.i; P().activeFloor = detectRes.cur; DET.sel = null; renderDetection(); },
  'det-floor-move': el => detMoveFloor(+el.dataset.d),
  'det-floor-add': () => detAddFloor(),
  'det-tool': el => { detSetTool(el.dataset.t); renderDetection(); }, 'det-del': () => { if (DET.sel) detDelete(); else toast('Select a room, door or window first'); },
  'det-del-room': el => detDelete({ kind: 'room', id: el.dataset.id }),
  generate: () => generate3D(),
  'open-proj': async el => { const id = el.dataset.id; let p = store.get('proj_' + id); const c = (CLOUD.list || []).find(x => x.id === id);
    if (isCloud() && c && (!p || c.updated > (p.updated || 0))) { toast('Opening from your account…'); try { p = await cloudFetch(id); store.set('proj_' + id, p); } catch (e) { if (!p) return toast('Could not open: ' + e.message, 4000); } }
    if (!p) return toast('Project not found'); S.project = p; S.history = []; S.future = []; S.variants = []; S.original = deep(p); S.structuralLog = []; openWorkspace(false); },
  'del-proj': async (el, e) => { e.stopPropagation(); const id = el.dataset.id; if (!confirmDel(id)) return; try { localStorage.removeItem('dimora_proj_' + id); } catch (x) { } store.set('projects', store.get('projects', []).filter(p => p.id !== id));
    if (isCloud()) { try { await API.req('/api/projects/' + encodeURIComponent(id), { method: 'DELETE', timeout: 20000 }); } catch (x) { toast('Removed here, but the copy in your account could not be deleted: ' + x.message, 5000); } CLOUD.list = (CLOUD.list || []).filter(p => p.id !== id); }
    renderDash(); },
  'ob-set': el => { ob.p[el.dataset.k] = el.dataset.v; renderOnboarding(); }, 'ob-color': el => { const c = el.dataset.c, a = ob.p.colors; const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); else { a.push(c); if (a.length > 3) a.shift(); } renderOnboarding(); },
  'ob-back': () => { ob.step--; renderOnboarding(); }, 'ob-next': () => { if (ob.step < 2) { ob.step++; renderOnboarding(); } else { ob.p.onboarded = true; setTimeout(cloudSavePrefs, 50); S.prefs = ob.p; store.set('prefs', S.prefs); $('#modal').classList.remove('on'); toast('Preferences saved — DIMORA will design around them'); renderDash(); if (S.project) { refreshSidePanel(); } } },
  'set-save': async () => { readSettingsForm(); const m = $('#set-msg'); m.textContent = 'Checking…'; await API.health(true); $('#set-status').innerHTML = aiStatusHTML(); m.textContent = ''; $('#modal').classList.remove('on'); toast(!S.backendOK ? 'Saved — but the backend is not reachable' : aiOn() ? 'Connected · ' + modelLabel() : 'Backend connected · no AI yet (rule-based engine)', 4500); },
  'set-test': async () => { readSettingsForm(); const m = $('#set-msg'); m.textContent = 'Testing…'; m.style.color = ''; await API.health(true); $('#set-status').innerHTML = aiStatusHTML();
    try { const j = await API.req('/api/ai/test', { body: {}, timeout: 90000 }); m.textContent = j.ok ? `✓ ${j.model} answered in ${(j.ms / 1000).toFixed(1)} s` : `? ${j.model} replied oddly`; m.style.color = j.ok ? '#34d399' : '#fbbf24'; } catch (e) { m.textContent = '✗ ' + e.message.slice(0, 160); m.style.color = '#f9a8d4'; } },
  'clear-data': () => { try { Object.keys(localStorage).filter(k => k.startsWith('dimora_')).forEach(k => localStorage.removeItem(k)); } catch (e) { } location.reload(); },
  view: el => setView(el.dataset.v), preset: el => presetView(el.dataset.v),
  panel: el => { if (S.panel === el.dataset.p && $('#app').classList.contains('side-open') && window.innerWidth < 820) { $('#app').classList.remove('side-open'); return; } openPanel(el.dataset.p); },
  'toggle-chat': () => { $('#app').classList.toggle('chat-open'); if (E) E.dirty = true; if (S.view === '2d') { V2.init = false; render2D(); } },
  undo: () => undo(), redo: () => redo(),
  'toggle-cut': () => { S.cutaway = !S.cutaway; $('#t-cut').classList.toggle('on', S.cutaway); if (S.cutaway && S.roof) { S.roof = false; $('#t-roof').classList.remove('on'); } rebuild(); },
  'toggle-labels': () => { S.labels = !S.labels; $('#t-lab').classList.toggle('on', S.labels); E.dirty = true; },
  'walk-outside': () => setView('walk', { outside: true }),
  'kbd-help': () => toast(S.view === 'walk' ? 'Walk: W A S D or arrows to move · drag to look · Shift to hurry' : 'Fly around: W A S D / arrows to glide · Q E to circle · Z X to zoom · T G to tilt · Shift = faster · drag to orbit', 6000),
  'toggle-roof': () => { S.roof = !S.roof; if (S.roof && S.cutaway) { S.cutaway = false; $('#t-cut').classList.remove('on'); } $('#t-roof').classList.toggle('on', S.roof); rebuild(); },
  'toggle-sun': () => { S.daylightSim = !S.daylightSim; $('#t-sun').classList.toggle('on', S.daylightSim); rebuild(); if (S.daylightSim) toast('Sunlight now enters only through windows & doors — move the time slider'); },
  'play-day': () => { if (S.dayTimer) { clearInterval(S.dayTimer); S.dayTimer = null; return; } if (!S.daylightSim) { S.daylightSim = true; $('#t-sun').classList.add('on'); rebuild(); } let h = 6; S.dayTimer = setInterval(() => { h += 0.08; setHour(h); const lh = $('#lt-h'); if (lh) lh.textContent = fmtHour(h); if (h >= 19.2) { clearInterval(S.dayTimer); S.dayTimer = null; } }, 50); },
  tool: el => setTool(el.dataset.t), overlay: el => { S.overlay = el.dataset.o; $$('[data-act=overlay]').forEach(b => b.classList.toggle('on', b.dataset.o === S.overlay)); render2D(); },
  'overlay-plan': el => { setView('2d'); S.overlay = el.dataset.o; $$('[data-act=overlay]').forEach(b => b.classList.toggle('on', b.dataset.o === S.overlay)); render2D(); },
  'select-room': el => { const r = findRoom(el.dataset.id); if (!r) return; select({ kind: 'room', id: r.id }); if (S.view !== '2d') focusRoom(r); refreshSidePanel(); },
  'select-item': el => { select({ kind: 'item', id: el.dataset.id }); }, 'select-door': el => { setView('2d'); select({ kind: 'door', id: el.dataset.id }); },
  deselect: () => select(null), 'focus-room': () => { const r = selRoom(); if (r) focusRoom(r); },
  'ask-room': () => { const r = selRoom(); $('#app').classList.add('chat-open'); $('#chat-input').value = r ? `Make ${r.name} ` : ''; $('#chat-input').focus(); },
  facade: el => { commit('Exterior style'); P().facade = el.dataset.k; P().exterior = null; rebuild(); save(true); refreshSidePanel(); toast(`${FACADES[el.dataset.k].label}: ${FACADES[el.dataset.k].desc}`); },
  'ext-color': el => { commit('Exterior colour'); P().exterior = el.dataset.c || null; rebuild(); save(true); refreshSidePanel(); },
  theme: el => { commit('Theme'); applyTheme(el.dataset.t); rebuild(); save(true); toast(`${el.dataset.t}: ${THEMES[el.dataset.t].desc}`); },
  'furnish-all': el => { commit('Furnish all'); S.project.floors.forEach(f => f.rooms.forEach(r => autoFurnish(r, f, el.dataset.v ? 1 + Math.floor(Math.random() * 3) : 0))); rebuild(); save(); toast('Furnished every room with clearances respected'); },
  'furnish-room': el => { const r = selRoom(); if (!r) return; commit('Furnish'); autoFurnish(r, floorOfRoom(r), el.dataset.v ? 1 + Math.floor(Math.random() * 3) : 0); rebuild(); save(); toast(`${el.dataset.v ? 'New arrangement for' : 'Furnished'} ${r.name}`); },
  'clear-room': () => { const r = selRoom(); if (!r) return; commit('Clear'); r.furniture = []; rebuild(); save(); },
  wall: el => { const r = selRoom(); if (!r) return; commit('Paint'); r.wall = el.dataset.c; rebuild(); save(); },
  floor: el => { const r = selRoom(); if (!r) return; commit('Floor'); r.floor = el.dataset.k; rebuild(); save(); },
  ceiling: el => { const r = selRoom(); if (!r) return; commit('Ceiling'); r.ceiling = el.dataset.k; rebuild(); save(); toast('Ceilings are visible from inside — try Walk mode'); },
  'time-eve': () => setHour(20),
  cat: el => { S.cat = el.dataset.c; refreshSidePanel(); },
  'add-item': el => { const r = selRoom(); const t = el.dataset.t; if (!r) { if (S.view !== '2d') setView('2d'); setTool('place', t); return; } const res = execActions([{ do: 'add', room: r.id, item: t }], r); toast(res.done[0] || res.fail[0] || 'Could not place'); refreshSidePanel(); },
  'del-item': el => { const f = findItem(el.dataset.id); if (!f) return; commit('Delete'); f.room.furniture.splice(f.room.furniture.indexOf(f.it), 1); rebuild(); save(); },
  rot: el => rotateSelected(+el.dataset.d), del: () => deleteSelected(),
  dup: () => { const f = S.sel && findItem(S.sel.id); if (!f) return; commit('Duplicate'); const it = deep(f.it); it.id = uid('i'); it.x = r2(it.x + 0.3); it.y = r2(it.y + 0.3); f.room.furniture.push(it); S.sel = { kind: 'item', id: it.id }; rebuild(); renderInspector(); save(); },
  'it-color-reset': () => { const f = S.sel && findItem(S.sel.id); if (!f) return; commit('Colour'); f.it.color = null; rebuild(); renderInspector(); },
  corner: el => { const r = selRoom(); if (!r) return; const a = analyzeSpace(r); if (!a.corner) return; commit('Use corner'); const k = el.dataset.k; const f = floorOfRoom(r); const cc = [a.corner.x + a.corner.w / 2, a.corner.y + a.corner.d / 2];
    const sides = [a.corner.cy ? 'S' : 'N', a.corner.cx ? 'E' : 'W']; const tAlong = s => s === 'N' || s === 'S' ? cc[0] : cc[1];
    const wallPlace = (type) => { for (const s of sides) { const it = placeOnWall(r, f, type, s, { align: 'near', t0: tAlong(s) }); if (it && rectOverlap(itemFootprint(it), { x: a.corner.x - 0.3, y: a.corner.y - 0.3, w: a.corner.w + 0.6, d: a.corner.d + 0.6 }) > 0.05) { r.furniture.push(it); return it; } } const it = placeFree(r, f, type, { near: cc }); if (it) r.furniture.push(it); return it; };
    if (k === 'study') { const d = wallPlace('desk'); if (d) addChairFor(r, f, d); } else if (k === 'reading') { const ac = placeFree(r, f, 'armchair', { near: cc }); if (ac) { r.furniture.push(ac); const l = placeFree(r, f, 'floor_lamp', { near: cc }); if (l) r.furniture.push(l); } wallPlace('bookshelf'); } else { wallPlace('storage_cabinet'); wallPlace('bookshelf'); }
    rebuild(); save(); toast(`Converted the unused corner into a ${k === 'study' ? 'study corner' : k === 'reading' ? 'reading nook' : 'storage zone'}`); },
  transform: async el => { const r = selRoom(); if (!r || !ROOM_TYPES[el.dataset.t]) return; const cam = roomCam(r); let before = ''; try { before = renderWith(S.project, cam.pos, cam.target); } catch (e) { } const c0 = roomCost(r).total, from = r.type; commit('Transform'); const res = transformRoom(r, el.dataset.t); rebuild(); let after = ''; try { after = renderWith(S.project, cam.pos, cam.target); } catch (e) { } S.lastTransform = { room: r.id, before, after, from, to: el.dataset.t, c0, c1: res.after }; if (S.panel !== 'transform') openPanel('transform'); else refreshSidePanel(); save(); toast(`${ROOM_TYPES[from].label} → ${ROOM_TYPES[el.dataset.t].label}`); focusRoom(r); },
  'fit-check': () => { const r = selRoom(); if (!r) return; const t = $('#fit-type').value; S.fitType = t; const w = +$('#fit-w').value || null, d = +$('#fit-d').value || null; const res = fitCheck(t, r, floorOfRoom(r), w || d ? { w: w || CATALOG[t].w, d: d || CATALOG[t].d } : null); S.fitRes = res; S.fitOut = `<div class="issue ${res.ok ? 'ok' : ''}" style="margin-top:8px">${esc(res.msg)}</div>${res.ok ? '<button class="btn sm primary" data-act="fit-place">Place it there</button>' : ''}`; refreshSidePanel(); },
  'fit-place': () => { const r = selRoom(); if (!r || !S.fitRes?.item) return; commit('Place'); r.furniture.push(S.fitRes.item); S.fitOut = ''; S.fitRes = null; rebuild(); save(); },
  'optimize-all': () => { commit('Optimise'); S.lastOptimize = optimizeBudget(allRooms(), S.prefs.budget); rebuild(); save(); toast(S.lastOptimize.ok ? 'Design now fits your budget' : 'Got as close as possible'); },
  optimize: () => { const id = $('#opt-room').value, amt = +$('#opt-amt').value; if (!amt) return; commit('Optimise'); const rs = id === 'all' ? allRooms() : [findRoom(id)]; S.lastOptimize = optimizeBudget(rs, amt); rebuild(); save(); toast(S.lastOptimize.ok ? `Done — ${inr(S.lastOptimize.end)}` : `Closest possible: ${inr(S.lastOptimize.end)}`); },
  alt: el => { const r = selRoom(); if (!r) return; const a = cheaperAlternatives(r)[+el.dataset.i]; if (!a) return; commit('Cheaper'); a.apply(); rebuild(); save(); toast(`Saved ${inr(a.save)}`); },
  'set-tier-all': el => { commit('Tier'); const t = el.dataset.t; allRooms().forEach(r => { r.tier = t; r.furniture.forEach(i => i.tier = t); }); rebuild(); save(); },
  'add-window-sugg': () => { const r = selRoom(); if (!r) return; const L = analyzeLight(r); if (!L.suggestWindow) return; commit('Window'); floorOfRoom(r).windows.push(Object.assign({ id: uid('w') }, L.suggestWindow.w)); rebuild(); save(); toast(`Added a ${L.suggestWindow.compass}-facing window to ${r.name}`); },
  fix: el => { commit('Fix'); if (el.dataset.k === 'snap') snapRooms(FL(), 0.3); else autoOpenings(FL(), { windows: false }); rebuild(); save(); toast('Plan corrected'); },
  'floor-switch': el => { const i = +el.dataset.i, pj = P(); const prev = pj.floors[pj.activeFloor]; pj.activeFloor = i; S.showAllFloors = false; S.explode = false; S.sel = null; rebuild(); renderFloorSeg(); refreshSidePanel();
    if (CTL && CTL.mode === 'walk') { const f = pj.floors[i]; const st = (floorBelow(f) === prev ? stairsBelow(f)[0] : null) || (f.stairs || [])[0]; const r = st ? roomAt(...stairEnd(st, floorBelow(f) === prev ? 'high' : 'low', 0.6), f) : null; const sh = roomShot(r || connectivity(f).start || f.rooms[0]); CTL.flyTo(sh.pos, sh.target, 1.2, { mode: 'walk' }); toast(`Walking on the ${f.name}`); }
    else if (S.view !== '2d') fitView(true); },
  'floor-all': () => { S.showAllFloors = !S.showAllFloors; if (!S.showAllFloors) S.explode = false; rebuild(); renderFloorSeg(); fitView(true); },
  'floor-explode': () => { S.explode = !S.explode; if (S.explode) S.showAllFloors = true; rebuild(); renderFloorSeg(); fitView(true); },
  'add-floor': () => { commit('Add floor'); const pj = P(); const top = pj.floors[pj.floors.length - 1]; const nf = newFloor(floorName(pj.floors.length), top.level + 1); nf.height = top.height;
    const map = {}; top.rooms.filter(r => !isYard(r)).forEach(r => { const nr = makeRoom({ name: r.name.replace(/\d+$/, '') + (r.type === 'living' ? ' (Upper)' : ''), type: r.type === 'living' ? 'living' : r.type, x: r.x, y: r.y, w: r.w, d: r.d }); map[r.id] = nr; nf.rooms.push(nr); });
    nf.doors = top.doors.filter(d => !d.main).map(d => Object.assign({}, d, { id: uid('d') })); nf.windows = top.windows.map(w => Object.assign({}, w, { id: uid('w') }));
    pj.floors.push(nf); top.stairs = []; placeStairs(top, nf); pj.floors.pop();
    const hub = top.stairs && top.stairs.length ? null : (top.rooms.find(r => r.type === 'living') || top.rooms.filter(r => !isYard(r)).sort((a, b) => area(b) - area(a))[0]); // automatic placement failed: put a flight in the main room
    if (hub) { const vert = hub.d >= hub.w; const st = { id: uid('s'), w: vert ? 1.0 : 3.0, d: vert ? 3.0 : 1.0, x: hub.x + hub.w - (vert ? 0.6 : 1.7), y: hub.y + hub.d - (vert ? 1.7 : 0.6) }; if (!vert) { st.w = 1.0; st.d = 3.0; st.x = hub.x + 0.6; st.y = clamp(hub.y + hub.d / 2, hub.y + 1.5, hub.y + hub.d - 1.5); } top.stairs = [st]; }
    pj.floors.push(nf); nf.rooms.forEach(r => autoFurnish(r, nf)); clearStairFurniture(); pj.activeFloor = pj.floors.length - 1; S.showAllFloors = false; rebuild(); renderFloorSeg(); refreshSidePanel(); fitView(true); save(); toast(`${nf.name} added with a staircase`); },
  'save-variant': () => { if (!E) return; const name = ($('#var-name') && $('#var-name').value) || `Design ${S.variants.length + 1}`; const hc = homeCam(); const thumb = renderWith(S.project, hc.pos, hc.target, 300, 190); const c = homeCost(); const rooms = allRooms(); S.variants.push({ name, thumb, project: deep(S.project), cost: c.total, furniture: c.furniture, theme: P().theme, pieces: rooms.reduce((s, r) => s + r.furniture.length, 0), space: Math.round(rooms.reduce((s, r) => s + analyzeSpace(r).score, 0) / rooms.length), light: Math.round(rooms.reduce((s, r) => s + analyzeLight(r).score, 0) / rooms.length), cmp: S.variants.filter(v => v.cmp).length < 3 }); toast(`Saved “${name}”`); openPanel('compare'); },
  'var-restore': el => { commit('Restore'); S.project = deep(S.variants[+el.dataset.i].project); S.sel = null; rebuild(); save(); toast('Variant restored'); },
  'before-after': () => { if (!S.original) return; const hc = homeCam(); const a = renderWith(S.original, hc.pos, hc.target, 640, 400), b = renderWith(S.project, hc.pos, hc.target, 640, 400); const c0 = (() => { const sv = S.project; S.project = S.original; const v = homeCost().total; S.project = sv; return v; })(); S.baHTML = `<div class="cmp" style="margin-top:8px"><img src="${b}"><div class="after" id="ba-after"><img src="${a}" style="width:${$('#side').clientWidth - 32}px"></div><span class="lb" style="left:8px">Original · ${inr(c0)}</span><span class="lb" style="right:8px">Current · ${inr(homeCost().total)}</span><input type="range" min="0" max="100" value="50" data-act-input="ba-slide"></div>`; refreshSidePanel(); },
  'multi-theme': () => { const r = selRoom(); if (!r) return; const cam = roomCam(r); const cur = r.theme || P().theme; const picks = [cur, ...Object.keys(THEMES).filter(t => t !== cur).sort(() => Math.random() - 0.5).slice(0, 2)]; const out = picks.map(t => { const pj = deep(S.project); const saved = S.project; S.project = pj; const rr = findRoom(r.id); applyTheme(t, [rr]); const cost = roomCost(rr).total; S.project = saved; return { t, img: renderWith(pj, cam.pos, cam.target, 300, 200), cost }; }); S.mtHTML = out.map(o => `<div class="card"><img src="${o.img}" style="width:100%;border-radius:8px"><div class="row" style="justify-content:space-between;margin-top:6px"><b>${o.t}</b><span class="muted">${inr(o.cost)}</span><button class="btn sm ghost" data-act="room-theme-apply" data-t="${o.t}">Apply</button></div></div>`).join(''); refreshSidePanel(); },
  'room-theme-apply': el => { const r = selRoom(); if (!r) return; commit('Room theme'); applyTheme(el.dataset.t, [r]); rebuild(); save(); },
  'pick-insp': () => $('#insp-in').click(), 'apply-insp': () => { const x = S.insp; if (!x) return; commit('Inspiration'); const r = selRoom(); const rooms = r ? [r] : allRooms(); if (r) applyTheme(x.style, [r]); else applyTheme(x.style); rooms.forEach(rr => { if (!['bathroom', 'utility'].includes(rr.type)) rr.wall = x.wall; if (x.floor && !['bathroom', 'utility', 'balcony'].includes(rr.type)) rr.floor = x.floor; if (x.finish) rr.furniture.forEach(i => i.finish = x.finish); }); rebuild(); save(); toast(`Recreated the ${x.style} look`); },
  report: () => openReport(), 'rep-close': () => $('#report').classList.remove('on'),
  'rep-print': () => { try { window.print(); } catch (e) { toast('Printing is blocked here — use Download HTML'); } },
  'rep-download': () => { const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(P().name)} — DIMORA report</title><style>body{font-family:Manrope,Arial,sans-serif;background:#eee;margin:0}.rep{max-width:900px;margin:20px auto;background:#fff;padding:48px;line-height:1.55;color:#2c2924}h1,h2{font-family:Georgia,serif}table{width:100%;border-collapse:collapse;font-size:12.5px}th{text-align:left;background:#f3eee5;padding:7px}td{padding:7px;border-bottom:1px solid #ece6db}.r{text-align:right}img{max-width:100%}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.kpis div{background:#f6f1e8;padding:12px;border-radius:8px}.kpis b{display:block;font-size:20px}.sw{display:inline-block;width:14px;height:14px;border-radius:4px}.note{font-size:11.5px;color:#6b6356}</style></head><body>${$('#rep-doc').outerHTML}</body></html>`; try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([doc], { type: 'text/html' })); a.download = P().name.replace(/\W+/g, '_') + '_DIMORA_report.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Report downloaded'); } catch (e) { toast('Download blocked here — use Copy summary'); } },
  'rep-copy': () => { const t = $('#rep-doc').innerText; navigator.clipboard?.writeText(t).then(() => toast('Report text copied'), () => toast('Clipboard blocked')); },
  tour: () => { if (S.touring) stopTour(); else startTour(); }, 'tour-stop': () => stopTour(), 'tour-play': () => tourTogglePause(), 'tour-next': () => tourJump(1), 'tour-prev': () => tourJump(-1), 'tour-go': el => tourGo(+el.dataset.i),
  'tour-voice': () => { TOUR.voice = !TOUR.voice; if (!TOUR.voice) stopSpeech(); renderTourUI(); },
  'tour-wall': el => tourApply([{ do: 'wall_color', room: tourRoom()?.id, color: el.dataset.c, name: el.dataset.n }], `Done — ${tourRoom()?.name} is now ${el.dataset.n}. ${['Lovely choice', 'That really opens it up', 'Much calmer'][Math.floor(Math.random() * 3)]}!`),
  'tour-theme': el => tourApply([{ do: 'theme', name: el.dataset.t, room: tourRoom()?.id }]),
  'tour-transform': el => tourApply([{ do: 'transform', room: tourRoom()?.id, to: el.dataset.t }]),
  'tour-refurnish': () => tourApply([{ do: 'furnish', room: tourRoom()?.id, variant: 1 + Math.floor(Math.random() * 3) }]),
  'tour-budget': () => { const r = tourRoom(); if (!r) return; tourApply([{ do: 'budget', room: r.id, amount: Math.round(roomCost(r).total * 0.7) }]); },
  'chat-sugg': el => sendChat(el.dataset.t),
  'chat-paint': el => { const r = findRoom(el.dataset.r); if (!r) return; commit('Paint'); r.wall = el.dataset.c; rebuild(); save(); addChat('aria', `Painted ${r.name} ${el.dataset.n}.`); },
  'det-noop': () => { },
};
const CHANGE = {
  'rename-project': el => { P().name = el.value || 'My Home'; save(); },
  'det-name': el => { const r = findRoom(el.dataset.id); if (r) { r.name = el.value; renderDetection(); } }, 'det-type': el => { const r = findRoom(el.dataset.id); if (r) { r.type = el.value; renderDetection(); } },
  'ob-num': el => { ob.p[el.dataset.k] = clamp(+el.value || 1, 1, 15); }, 'ob-sel': el => { ob.p[el.dataset.k] = el.value; }, 'ob-chk': el => { ob.p[el.dataset.k] = el.checked; },
  gfx: el => { try { localStorage.setItem('dimora_gfx', el.value); } catch (e) { } [E, HERO.E, HERO.G].forEach(x => x && x.setQuality(el.value)); toast('3D quality: ' + el.value); },
  wallpaper: el => { const r = selRoom(); if (!r) return; commit('Wallpaper'); r.wallpaper = el.checked; rebuild(); },
  'light-tog': el => { const r = selRoom(); if (!r) return; commit('Lights'); r.lights[el.dataset.k] = el.checked; rebuild(); save(); },
  curtains: el => { const r = selRoom(); if (!r) return; commit('Curtains'); r.curtains = el.checked; rebuild(); save(); },
  finish: el => { const r = selRoom(); if (!r) return; commit('Finish'); r.furniture.forEach(i => i.finish = el.value || null); rebuild(); save(); },
  tier: el => { const r = selRoom(); if (!r) return; commit('Tier'); r.tier = el.value; r.furniture.forEach(i => i.tier = el.value); rebuild(); save(); },
  'room-theme': el => { const r = selRoom(); if (!r) return; commit('Room theme'); applyTheme(el.value || P().theme, [r]); if (!el.value) r.theme = null; rebuild(); save(); },
  budget: el => { S.prefs.budget = Math.max(10000, +el.value || S.prefs.budget); store.set('prefs', S.prefs); refreshSidePanel(); },
  daylight: el => { S.daylightSim = el.checked; $('#t-sun').classList.toggle('on', S.daylightSim); rebuild(); },
  'all-floors': el => { S.showAllFloors = el.checked; rebuild(); renderFloorSeg(); },
  'det-floor-name': el => { const f = P().floors[detectRes.cur]; if (f) { f.name = el.value.trim().slice(0, 24) || f.name; renderDetection(); } },
  'floor-h': el => { commit('Height'); FL().height = clamp(+el.value || 2.9, 2.4, 4.5); rebuild(); save(); },
  'var-cmp': el => { S.variants[+el.dataset.i].cmp = el.checked; refreshSidePanel(); },
  'it-dim': el => { const f = S.sel && findItem(S.sel.id); if (!f) return; commit('Resize'); f.it[el.dataset.k] = clamp(+el.value || 0.3, 0.2, 6); rebuild(); save(); },
  'it-tier': el => { const f = S.sel && findItem(S.sel.id); if (!f) return; commit('Tier'); f.it.tier = el.value; rebuild(); renderInspector(); save(); },
  'it-finish': el => { const f = S.sel && findItem(S.sel.id); if (!f) return; commit('Finish'); f.it.finish = el.value || null; rebuild(); save(); },
  'r-name': el => { const r = selRoom(); if (!r) return; commit('Rename'); r.name = el.value; rebuild(); save(); },
  'r-type': el => { const r = selRoom(); if (!r) return; commit('Type'); r.type = el.value; rebuild(); renderInspector(); save(); toast('Type changed — press Furnish to re-plan furniture'); },
  'r-dim': el => { const r = selRoom(); if (!r) return; const v = clamp(snap(+el.value || 1), 0.8, 30); const ext = el.dataset.k === 'w' ? isExteriorPoint(floorOfRoom(r), 'v', r.x + r.w, r.y + r.d / 2) : isExteriorPoint(floorOfRoom(r), 'h', r.y + r.d, r.x + r.w / 2); commit('Resize'); r[el.dataset.k] = r2(v); if (ext) { S.structuralLog.push(`${r.name}: outer wall moved via dimension edit — external walls are usually load-bearing; get a structural review.`); toast('⚠️ Outer wall moved — flagged for structural review', 3800); } rebuild(); renderInspector(); save(); },
  'r-floor': el => { const r = selRoom(); if (!r) return; commit('Floor'); r.floor = el.value; rebuild(); save(); },
  'op-w': el => { const f = FL(); const o = [...f.doors, ...f.windows].find(x => x.id === S.sel?.id); if (!o) return; commit('Opening'); o.w = clamp(+el.value || 0.9, 0.5, 4); rebuild(); save(); },
  'op-k': el => { const o = FL().windows.find(x => x.id === S.sel?.id); if (!o) return; commit('Window'); o[el.dataset.k] = clamp(+el.value || 0.5, 0, 2.6); rebuild(); save(); },
  'op-main': el => { const o = FL().doors.find(x => x.id === S.sel?.id); if (!o) return; commit('Main'); FL().doors.forEach(d => d.main = false); o.main = el.checked; rebuild(); save(); },
  'tour-floor': el => tourApply([{ do: 'floor', room: tourRoom()?.id, material: el.value }]),
};
const INPUT = {
  'ext-custom': el => { if (!S._painting) { commit('Exterior colour'); S._painting = true; setTimeout(() => S._painting = false, 1200); } P().exterior = el.value; rebuild(); save(); },
  'wall-custom': el => { const r = selRoom(); if (!r) return; if (!S._painting) { commit('Paint'); S._painting = true; setTimeout(() => S._painting = false, 1200); } r.wall = el.value; rebuild(); save(); },
  'it-color': el => { const f = S.sel && findItem(S.sel.id); if (!f) return; if (!S._painting) { commit('Colour'); S._painting = true; setTimeout(() => S._painting = false, 1200); } f.it.color = el.value; rebuild(); save(); },
  hour: el => { setHour(+el.value); const l = $('#lt-h'); if (l) l.textContent = fmtHour(+el.value); },
  north: el => { P().north = +el.value; applyEnv(); if (S.view === '2d') render2D(); const lbl = el.closest('label'); if (lbl) lbl.firstChild.textContent = `Plan orientation — where is North? (${el.value}° from plan-up)`; },
  'ob-budget': el => { ob.p.budget = +el.value; const b = el.closest('label').querySelector('b'); if (b) b.textContent = inr(ob.p.budget); },
  'ba-slide': el => { const a = $('#ba-after'); if (a) a.style.width = el.value + '%'; },
  'tour-wall-custom': el => { clearTimeout(S._tw); S._tw = setTimeout(() => tourApply([{ do: 'wall_color', room: tourRoom()?.id, color: el.value, name: 'your custom colour' }]), 400); },
};

/* ---------- installable app (PWA) ---------- */
const PWA = { prompt: null };
function initPWA() {
  const ok = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude|claudeusercontent/.test(location.hostname);
  if (ok) navigator.serviceWorker.register('sw.js').catch(e => console.warn('service worker', e));
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  const showBtns = on => $$('.install-btn').forEach(b => { b.hidden = !on; });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PWA.prompt = e; showBtns(true); });
  window.addEventListener('appinstalled', () => { PWA.prompt = null; showBtns(false); toast('DIMORA is installed — open it from your home screen or apps'); });
  if (ok && ios && !standalone) { PWA.ios = true; showBtns(true); }
  // app shortcuts: ?go=upload opens the floor-plan upload
  const go = new URLSearchParams(location.search).get('go'); if (go === 'upload') setTimeout(() => { if (currentUser()?.answers?.done) { show('upload'); resetUpload(); } }, 400);
}
ACT['install-app'] = async () => {
  if (PWA.prompt) { PWA.prompt.prompt(); const r = await PWA.prompt.userChoice.catch(() => null); PWA.prompt = null; if (r && r.outcome === 'accepted') $$('.install-btn').forEach(b => { b.hidden = true; }); return; }
  if (PWA.ios) return toast('On iPhone/iPad: tap the Share button, then “Add to Home Screen”.', 6000);
  toast('Use your browser menu → “Install app” (or “Add to Home screen”).', 5000);
};
function boot() {
  S.prefs = Object.assign(S.prefs, store.get('prefs', {})); { const a = store.get('ai', {}); ['backendUrl', 'aiProvider', 'ollamaModel', 'orModel', 'orKey'].forEach(k => { if (a[k] != null && a[k] !== '') S[k] = a[k]; }); } API.health(true);
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; if (el.tagName === 'A' && !el.getAttribute('href')?.startsWith('http')) e.preventDefault(); const f = ACT[el.dataset.act]; if (f) { f(el, e); } });
  document.addEventListener('change', e => { const el = e.target.closest('[data-act-change]'); if (el && CHANGE[el.dataset.actChange]) CHANGE[el.dataset.actChange](el, e); });
  document.addEventListener('input', e => { const el = e.target.closest('[data-act-input]'); if (el && INPUT[el.dataset.actInput]) INPUT[el.dataset.actInput](el, e); });
  document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault(); if (f.dataset.form === 'chat') { const i = $('#chat-input'); const t = i.value; i.value = ''; sendChat(t); } if (f.dataset.form === 'tour-ask') { const i = $('#tour-ask-in'); const t = i.value; i.value = ''; if (t.trim()) tourAsk(t); } });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').classList.remove('on'); });
  $('#time-slider').addEventListener('input', e => setHour(+e.target.value));
  initDetEditor();
  const takeFiles = async files => { if (!files || !files.length) return; try { await API.health(); if (S.backendOK) { const nm0 = files.length === 1 ? files[0].name.replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').slice(0, 30) : 'My Home'; return runDetection({ files: Array.from(files) }, { name: nm0 || 'My Home' }); } const sheets = await filesToSheets(files); const nm = files.length === 1 ? files[0].name.replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').slice(0, 30) : 'My Home'; runDetection(sheets.length === 1 ? sheets[0].url : sheets, { name: nm || 'My Home' }); } catch (err) { toast('Could not read file: ' + err.message, 4500); } };
  $('#file-in').addEventListener('change', e => takeFiles(e.target.files));
  const dz = $('.drop-in'); ['dragenter', 'dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('over'); })); ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => takeFiles(e.dataTransfer.files));
  document.addEventListener('change', async e => { if (e.target.id !== 'insp-in') return; const f = e.target.files[0]; if (!f) return; const url = await fileToImageURL(f); $('#insp-out').innerHTML = '<p class="muted">Analysing style…</p>'; try { const x = await analyzeInspiration(url); x.url = await shrinkImage(url, 200); S.insp = x; $('#insp-out').innerHTML = inspHTML(x); } catch (err) { $('#insp-out').innerHTML = `<p class="muted">${esc(err.message)}</p>`; } });
  try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { }; } catch (e) { }
  updateAIBadge(); initPWA();
  if (CLOUD.token && currentUser()?.method === 'cloud') API.req('/api/auth/me', { timeout: 10000 }).then(j => { const u = store.get('user', null); if (u && j.user) { u.name = j.user.name || u.name; if (j.user.prefs && j.user.prefs.answers) u.answers = j.user.prefs.answers; store.set('user', u); updateUserChips(); } setSyncChip('ok'); }).catch(() => { });
  window.DIMORA = { ACT, CHANGE, CLOUD, isCloud, openWorkspace, S, E: () => E, CTL: () => CTL, rebuild, askAria, localParse, analyzeSpace, analyzeLight, homeCost, archChecks, sampleHome, startTour, stopTour, setView, TOUR, show, resetUpload, execActions, floorY, stairEnd, stairFoot, sampleDuplex, tourOrder, drawPlanImage, withProject };
}

/* ===================== LOGIN PORTAL (Gmail) & INTRO QUESTIONS ===================== */
/*
  REAL GOOGLE SIGN-IN (optional): paste your Firebase web-app config below to switch from Gmail-address
  sign-in to a verified "Continue with Google" button.
  Firebase Console → Authentication → Sign-in method: enable "Google".
  Authentication → Settings → Authorized domains: add the domain you serve DIMORA from (e.g. localhost).
  Serve the file over http(s) (e.g. `npx serve .`) — Google sign-in does not work from file://.
*/
const AUTH_CONFIG = {
  firebase: null, // e.g. { apiKey: 'AIza…', authDomain: 'your-app.firebaseapp.com', projectId: 'your-app', appId: '1:…:web:…' }
};
const AUTH = { email: '', name: '', err: '', fb: null, guser: null, busy: false };
const isGmail = e => /^[a-z0-9._%+-]+@(gmail|googlemail)\.com$/i.test(String(e).trim());
function currentUser() { const u = store.get('user', null); return u && u.loggedIn ? u : null; }
function firstName(u) { const n = (u.name || (u.email || 'guest').split('@')[0].replace(/[._\d]+/g, ' ')).trim().split(/\s+/)[0] || 'there'; return n[0].toUpperCase() + n.slice(1); }
function initials(u) { const n = (u.name || (u.email || 'guest').split('@')[0]).replace(/[._\d]+/g, ' ').trim().split(/\s+/); return ((n[0] || '?')[0] + (n[1] ? n[1][0] : '')).toUpperCase(); }
function updateUserChips() { const u = currentUser(); $$('.uchip').forEach(b => { b.textContent = u ? initials(u) : ''; b.title = u ? `${u.name || u.email} · account` : ''; }); }

/* ---------- optional Firebase ---------- */
async function initFirebase() {
  if (!AUTH_CONFIG.firebase || AUTH.fb) return AUTH.fb;
  try {
    if (location.protocol === 'file:') throw new Error('Google sign-in needs http(s) — serve the folder, e.g. `npx serve .`');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    if (!window.firebase.apps.length) window.firebase.initializeApp(AUTH_CONFIG.firebase);
    AUTH.fb = window.firebase.auth();
  } catch (e) { AUTH.err = 'Google sign-in unavailable (' + e.message + '). Sign in with your Gmail address instead.'; AUTH.fb = null; AUTH_CONFIG.firebase = null; }
  return AUTH.fb;
}
const fbErr = e => ({ 'auth/too-many-requests': 'Too many attempts — please wait a few minutes.', 'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.', 'auth/unauthorized-domain': 'This domain is not authorised in your Firebase project.' }[e.code] || e.message || 'Something went wrong.');

/* ---------- rendering ---------- */
function renderAuth() {
  const el = $('#auth-card'); if (!el) return;
  if (!S.backendAt) { API.health().then(() => { if ($('#app').dataset.screen === 'login') renderAuth(); }); }
  const server = S.backendOK && S.backend && S.backend.accounts;
  let mode = AUTH.mode || 'login'; if (!server && mode !== 'local') mode = 'local';
  const prev = store.get('user', null); const err = AUTH.err ? `<div class="auth-err">${esc(AUTH.err)}</div>` : '';
  const busy = AUTH.busy ? 'disabled' : '';
  const email = esc(AUTH.email || (prev && prev.method === 'cloud' ? prev.email : '') || '');
  const head = mode === 'signup' ? ['Create your DIMORA account', 'Your homes are saved to your account and open on any device.'] : mode === 'login' ? [prev && prev.method === 'cloud' ? 'Welcome back' : 'Sign in to DIMORA', 'Sign in to open your saved homes on any device.'] : ['Use DIMORA on this device', server ? 'No account needed — your homes are saved in this browser only.' : 'The DIMORA server can\'t be reached right now, so accounts are unavailable. You can still design — your work is saved in this browser.'];
  el.innerHTML = `<h2>${head[0]}</h2><p>${head[1]}</p>${err}
    ${server ? `<div class="auth-tabs"><button class="${mode === 'login' ? 'on' : ''}" data-act="auth-mode" data-m="login">Sign in</button><button class="${mode === 'signup' ? 'on' : ''}" data-act="auth-mode" data-m="signup">Create account</button></div>` : ''}
    <form data-form="auth-details" novalidate>
      ${mode !== 'login' ? `<label class="auth-field">Your name <small>${mode === 'local' ? '(optional)' : ''}</small><input id="au-name" autocomplete="name" placeholder="e.g. Priya Sharma" maxlength="60" value="${esc(AUTH.name || (prev && prev.name) || '')}"></label>` : ''}
      ${mode !== 'local' ? `<label class="auth-field">Email<div class="inp-ico"><i>✉️</i><input id="au-email" type="email" autocomplete="email" placeholder="you@example.com" value="${email}"></div></label>
      <label class="auth-field">Password ${mode === 'signup' ? '<small>(at least 8 characters)</small>' : ''}<input id="au-pw" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" placeholder="••••••••"></label>` : ''}
      <button id="au-send" class="btn primary block" ${busy}>${AUTH.busy ? 'Please wait…' : mode === 'signup' ? 'Create account →' : mode === 'login' ? 'Sign in →' : 'Start designing →'}</button>
    </form>
    ${server ? (mode === 'local' ? `<p class="auth-alt"><a data-act="auth-mode" data-m="login">← Sign in or create an account instead</a></p>` : `<p class="auth-alt"><a data-act="auth-mode" data-m="local">Continue without an account (this device only)</a></p>`) : `<p class="auth-alt"><a data-act="auth-retry">Try connecting to the server again</a></p>`}
    <div class="auth-foot"><a data-act="go-landing">← Back to home</a><span>By continuing you agree to the <a data-act="legal" data-k="terms">terms</a> &amp; <a data-act="legal" data-k="privacy">privacy</a>.</span></div>`;
  setTimeout(() => (document.getElementById(mode === 'local' ? 'au-name' : 'au-email') || {}).focus?.(), 50);
}
function signIn(email, name, method, uidv, answers) {
  const prev = store.get('user', null); const same = prev && prev.email === email && prev.method === method;
  const user = Object.assign({}, same ? prev : {}, { email, name: name || (same ? prev.name : ''), method, uid: uidv || (same && prev.uid) || uid('u'), id: method === 'cloud' ? uidv : undefined, loggedIn: true, lastLogin: Date.now(), created: same && prev.created ? prev.created : Date.now() });
  if (answers !== undefined) user.answers = answers || undefined;
  delete user.phone; delete user.cc; delete user.phoneVerified;
  store.set('user', user); AUTH.err = ''; AUTH.busy = false; CLOUD.list = null; CLOUD.warned = false;
  toast(method === 'cloud' ? `Signed in as ${user.email}` : `Welcome${user.name ? ', ' + firstName(user) : ''} — your work is saved on this device`);
  if (user.answers?.done) runAfterLogin(); else { INTRO.i = 0; INTRO.a = {}; show('intro'); renderIntro(); }
}
async function submitAuth() {
  const mode = (S.backendOK && S.backend && S.backend.accounts) ? (AUTH.mode || 'login') : 'local';
  AUTH.name = ($('#au-name')?.value || '').trim().slice(0, 60); AUTH.email = ($('#au-email')?.value || '').trim().toLowerCase(); const pw = $('#au-pw')?.value || '';
  if (mode === 'local') { CLOUD.token = null; store.set('token', null); return signIn('', AUTH.name || 'Guest', 'local'); }
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(AUTH.email)) { AUTH.err = 'Please enter a valid email address.'; return renderAuth(); }
  if (mode === 'signup' && pw.length < 8) { AUTH.err = 'Use a password of at least 8 characters.'; return renderAuth(); }
  if (!pw) { AUTH.err = 'Please enter your password.'; return renderAuth(); }
  AUTH.busy = true; AUTH.err = ''; renderAuth();
  try {
    const j = await API.req(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', { body: { email: AUTH.email, password: pw, name: AUTH.name }, timeout: 25000 });
    CLOUD.token = j.token; store.set('token', j.token);
    const pr = (j.user.prefs && j.user.prefs.prefs) || null; if (pr) { Object.assign(S.prefs, pr); store.set('prefs', S.prefs); }
    signIn(j.user.email, j.user.name, 'cloud', j.user.id, (j.user.prefs && j.user.prefs.answers) || null);
    syncDeviceProjectsUp();
  } catch (e) { AUTH.busy = false; AUTH.err = e.code === 'offline' || e.code === 'timeout' ? 'The DIMORA server is not reachable right now — try again, or continue without an account.' : e.message; renderAuth(); }
}

/* ---------- intro questions ---------- */
const INTRO_QS = [
  { k: 'goal', q: 'What are you looking to do with DIMORA?', sub: 'Pick everything that applies — we\'ll tailor your workspace.', multi: true, opts: [['design', '🏡', 'Design my new home'], ['renovate', '🛠️', 'Renovate or redecorate'], ['visualise', '👀', 'Visualise a property before buying'], ['furniture', '🛋️', 'Plan furniture & layout'], ['budget', '₹', 'Estimate my interior budget'], ['study', '🎓', 'Architecture / design project'], ['showcase', '🏢', 'Showcase homes to clients'], ['explore', '✨', 'Just exploring']] },
  { k: 'passion', q: 'What are you by passion?', sub: 'Tell us what drives you — Aria will speak your language.', multi: false, opts: [['homeowner', '🏠', 'Home lover / homeowner'], ['interior', '🎨', 'Interior designer'], ['architect', '📐', 'Architect'], ['student', '📚', 'Architecture / design student'], ['builder', '🏗️', 'Builder / developer'], ['realestate', '🤝', 'Real estate professional'], ['creative', '🖌️', 'Artist / creative'], ['tech', '💻', 'Engineer / techie']] },
  { k: 'stage', q: 'Where are you in your home journey?', sub: 'Helps Aria give the right advice at the right moment.', multi: false, opts: [['possession', '🔑', 'Getting possession soon'], ['buying', '🔍', 'Planning to buy'], ['renting', '📦', 'Renting & want a refresh'], ['renovating', '🧱', 'Renovating my current home'], ['building', '🏗️', 'Building from scratch'], ['pro', '💼', 'Professional use — not my own home']] },
];
const INTRO = { i: 0, a: {} };
function renderIntro() {
  const el = $('#intro-card'); if (!el) return; const u = currentUser(); if (!u) return;
  if (!Object.keys(INTRO.a).length && u.answers) INTRO.a = deep(u.answers);
  const Q = INTRO_QS[INTRO.i]; const cur = INTRO.a[Q.k] || { v: [], other: '' };
  el.innerHTML = `<div class="intro-top"><div class="logo"><span class="mark">◇</span>DIMORA</div><div class="row"><span class="muted" style="font-size:12.5px">Question ${INTRO.i + 1} of ${INTRO_QS.length}</span><div class="intro-prog">${INTRO_QS.map((_, k) => `<i class="${k <= INTRO.i ? 'on' : ''}"></i>`).join('')}</div></div></div>
    ${INTRO.i === 0 ? `<p class="eyebrow">Hi ${esc(firstName(u))} — three quick questions</p>` : '<p class="eyebrow">&nbsp;</p>'}
    <h1 class="intro-q">${esc(Q.q)}</h1><p class="intro-sub">${esc(Q.sub)}</p>
    <div class="intro-opts">${Q.opts.map(([v, ic, l], k) => `<button class="iopt ${cur.v.includes(v) ? 'on' : ''}" style="animation-delay:${k * 0.035}s" data-act="intro-pick" data-v="${v}"><i>${ic}</i><b>${esc(l)}</b></button>`).join('')}</div>
    <input class="intro-other" id="intro-other" placeholder="Something else? Tell us in your own words (optional)" value="${esc(cur.other || '')}" maxlength="120">
    <div class="intro-nav">${INTRO.i ? '<button class="btn ghost" data-act="intro-back">← Back</button>' : '<button class="btn ghost" data-act="logout">Sign out</button>'}<button class="btn primary lg" data-act="intro-next">${INTRO.i < INTRO_QS.length - 1 ? 'Next →' : 'Enter DIMORA →'}</button></div>`;
}
function introSaveOther() { const Q = INTRO_QS[INTRO.i]; const o = $('#intro-other'); if (!o) return; INTRO.a[Q.k] = INTRO.a[Q.k] || { v: [], other: '' }; INTRO.a[Q.k].other = o.value.trim(); }
function labelOf(k, v) { const Q = INTRO_QS.find(q => q.k === k); return Q.opts.find(o => o[0] === v)?.[2] || v; }
function answerText(k, u = currentUser()) { const a = u?.answers?.[k]; if (!a) return '—'; return [...a.v.map(v => labelOf(k, v)), a.other].filter(Boolean).join(', ') || '—'; }
function ariaGoalLine() {
  const u = currentUser(); const a = u?.answers; if (!a) return '';
  const g = a.goal?.v || [], p = a.passion?.v?.[0], s = a.stage?.v?.[0];
  if (['architect', 'student'].includes(p)) return 'As a fellow design mind, you\'ll love the Structure panel — plan validation, circulation and multi-storey stacking. ';
  if (p === 'builder' || g.includes('showcase')) return 'Tip for showcasing: save variants in Compare and generate a Home Decision Report for your clients. ';
  if (p === 'interior') return 'The Design panel has themes, materials, ceilings and lighting ready for your clients. ';
  if (g.includes('budget')) return 'Since budget matters to you, the ₹ panel explains every estimate and can fit any room into your number. ';
  if (s === 'buying' || g.includes('visualise')) return 'Since you\'re evaluating a property, check daylight and space scores before you decide. ';
  if (s === 'renting') return 'For a rental refresh, try “make it cheaper” — paint, rugs and lighting go a long way. ';
  return '';
}
function personaliseFromAnswers(a) {
  const g = a.goal?.v || [], p = a.passion?.v?.[0];
  S.panel = ['architect', 'student'].includes(p) || g.includes('study') ? 'arch' : g.includes('budget') ? 'budget' : g.includes('furniture') ? 'furniture' : 'design';
}

/* ---------- account ---------- */
function openAccount() {
  const u = currentUser(); if (!u) return; const cloud = isCloud();
  $('#modal-card').innerHTML = `<button class="x" data-act="modal-close">✕</button><div class="row" style="gap:14px"><span class="uchip" style="width:54px;height:54px;font-size:20px;display:grid">${esc(initials(u))}</span><div><h2 style="margin:0">${esc(u.name || firstName(u))}</h2><div class="muted">${cloud ? esc(u.email) : 'Saved on this device only'}</div></div></div>
    <div class="card" style="margin:14px 0">${cloud ? `<b>☁ DIMORA account</b><div class="muted" style="font-size:13px">Your homes and preferences are saved to your account${S.backend?.accounts === 'sqlite' ? ' on this server' : ''} and open on any device where you sign in.</div>` : `<b>📱 This device only</b><div class="muted" style="font-size:13px">Your homes are stored in this browser. ${S.backendOK && S.backend?.accounts ? 'Create an account to keep them safe and use them on other devices — they move into the account automatically.' : 'Accounts need the DIMORA server.'}</div>${S.backendOK && S.backend?.accounts ? '<button class="btn sm primary" style="margin-top:8px" data-act="acct-upgrade">Create an account / sign in</button>' : ''}`}</div>
    <div class="acct-ans">${INTRO_QS.map(q => `<div><small>${esc(q.q)}</small>${esc(answerText(q.k, u))}</div>`).join('')}</div>
    ${cloud ? `<details class="acct-sec"><summary>Change password</summary><div class="two"><input type="password" id="pw-old" placeholder="Current password" autocomplete="current-password"><input type="password" id="pw-new" placeholder="New password (8+ characters)" autocomplete="new-password"></div><button class="btn sm" data-act="acct-pw">Update password</button></details>
    <details class="acct-sec"><summary>Delete account</summary><p class="muted" style="font-size:13px">This permanently deletes your account and every home saved in it.</p><input type="password" id="del-pw" placeholder="Type your password to confirm" autocomplete="current-password"><button class="btn sm danger" data-act="acct-delete">Delete my account</button></details>` : ''}
    <p class="muted" style="font-size:12px">Member since ${new Date(u.created).toLocaleDateString('en-IN')}</p>
    <div class="row end"><button class="btn ghost" data-act="intro-edit">Edit answers</button><button class="btn primary" data-act="logout">Sign out</button></div>`;
  $('#modal').classList.add('on');
}
Object.assign(ACT, {
  account: () => openAccount(),
  'auth-mode': el => { AUTH.mode = el.dataset.m; AUTH.err = ''; renderAuth(); },
  'auth-retry': async () => { await API.health(true); AUTH.mode = 'login'; renderAuth(); },
  'acct-upgrade': () => { $('#modal').classList.remove('on'); AUTH.mode = 'signup'; const u = store.get('user', null); if (u) { u.loggedIn = false; store.set('user', u); } show('login'); renderAuth(); },
  'acct-pw': async () => { const o = $('#pw-old').value, n = $('#pw-new').value; if (n.length < 8) return toast('Use a new password of at least 8 characters');
    try { const j = await API.req('/api/auth/password', { body: { old: o, new: n }, timeout: 20000 }); CLOUD.token = j.token; store.set('token', j.token); toast('Password updated — other devices were signed out'); $('#modal').classList.remove('on'); } catch (e) { toast(e.message, 4000); } },
  'acct-delete': async () => { const pw = $('#del-pw').value; if (!pw) return toast('Type your password to confirm');
    try { await API.req('/api/auth/me', { method: 'DELETE', body: { password: pw }, timeout: 20000 }); toast('Your account and its homes were deleted'); ACT.logout(); } catch (e) { toast(e.message, 4000); } },
  'auth-google': async () => {
    AUTH.err = ''; const fb = await initFirebase(); if (!fb) return renderAuth();
    try { AUTH.busy = true; renderAuth(); const res = await fb.signInWithPopup(new window.firebase.auth.GoogleAuthProvider()); signIn(res.user.email.toLowerCase(), res.user.displayName || '', 'google', res.user.uid); }
    catch (e) { AUTH.busy = false; AUTH.err = fbErr(e); renderAuth(); }
  },
  'intro-pick': el => { const Q = INTRO_QS[INTRO.i]; introSaveOther(); const a = INTRO.a[Q.k] = INTRO.a[Q.k] || { v: [], other: '' }; const v = el.dataset.v; if (Q.multi) { const i = a.v.indexOf(v); i >= 0 ? a.v.splice(i, 1) : a.v.push(v); } else a.v = [v]; renderIntro(); },
  'intro-back': () => { introSaveOther(); INTRO.i = Math.max(0, INTRO.i - 1); renderIntro(); },
  'intro-next': () => {
    introSaveOther(); const Q = INTRO_QS[INTRO.i]; const a = INTRO.a[Q.k];
    if (!a || (!a.v.length && !a.other)) { toast('Pick an option (or type your own) to continue'); return; }
    if (INTRO.i < INTRO_QS.length - 1) { INTRO.i++; renderIntro(); return; }
    const u = store.get('user', null); u.answers = Object.assign(deep(INTRO.a), { done: true, at: Date.now() }); store.set('user', u);
    personaliseFromAnswers(u.answers); store.set('panel', S.panel); cloudSavePrefs();
    runAfterLogin(); toast(`Welcome to DIMORA, ${firstName(u)}!`);
  },
  'intro-edit': () => { $('#modal').classList.remove('on'); if (S.touring) stopTour(); const u = store.get('user', null); INTRO.i = 0; INTRO.a = deep(u.answers || {}); delete INTRO.a.done; delete INTRO.a.at; u.answers = Object.assign(u.answers || {}, { done: false }); store.set('user', u); show('intro'); renderIntro(); },
  logout: async () => { $('#modal').classList.remove('on'); if (S.touring) stopTour(); const u = store.get('user', null);
    if (CLOUD.token) { try { await API.req('/api/auth/logout', { method: 'POST', body: {}, timeout: 8000 }); } catch (e) { }
      // this browser may be shared: drop the cached copies of the account's projects
      const keep = []; store.get('projects', []).forEach(p => { if (p.owner && p.owner !== 'device' && p.owner === u?.id) { try { localStorage.removeItem('dimora_proj_' + p.id); } catch (e) { } } else keep.push(p); }); store.set('projects', keep); }
    CLOUD.token = null; CLOUD.list = null; store.set('token', null); S.project = null;
    if (u) { u.loggedIn = false; store.set('user', u); } try { await AUTH.fb?.signOut(); } catch (e) { } AUTH.err = ''; $('#app').classList.remove('chat-open'); show('landing'); setTimeout(initHero, 50); toast('Signed out'); },
});
document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault(); if (f.dataset.form === 'auth-details') submitAuth(); });

/* ===================== MARKETING SITE: live 3D hero, rendered showcase & before/after ===================== */
const SITE_CONFIG = {
  contactEmail: 'hello@dimora.app', // ← replace with your real contact address before launch
};
const HERO = { E: null, proj: null, mode: 'furnished', ready: false, inView: true, drag: null, theta: -0.7, phi: 0.92, r: 20, c: [0, 0, 0], last: 0, imgs: {}, gen: false };
function withHero(fn, o = {}) {
  const keep = { E, P: S.project, cut: S.cutaway, hour: S.hour, sel: S.sel, view: S.view, ds: S.daylightSim, tour: S.touring, labels: S.labels };
  E = HERO.E; S.project = HERO.proj; S.cutaway = o.cut ?? HERO.mode === 'cutaway'; S.hour = o.hour ?? (HERO.mode === 'night' ? 20.6 : 10.5); S.sel = null; S.view = '3d'; S.daylightSim = !!o.sun; S.touring = !!o.tour;
  try { return fn(); } finally { E = keep.E; S.project = keep.P; S.cutaway = keep.cut; S.hour = keep.hour; S.sel = keep.sel; S.view = keep.view; S.daylightSim = keep.ds; S.touring = keep.tour; S.labels = keep.labels; }
}
function heroBuild(o) { withHero(() => rebuild(), o); HERO.E.dirty = true; }
function heroCam() {
  const cv = HERO.E.canvas, a = cv.clientWidth / Math.max(1, cv.clientHeight), b = homeBounds(HERO.proj.floors[0]);
  HERO.c = [b.x + b.w / 2, 0.4, b.y + b.d / 2];
  const half = Math.min(HERO.E.cam.fov / 2, Math.atan(Math.tan(HERO.E.cam.fov / 2) * a)); HERO.r = (Math.hypot(b.w, b.d) / 2 + 0.6) / Math.sin(half) * 0.92;
}
function heroApplyCam() { const e = HERO.E, h = HERO; e.cam.pos = [h.c[0] + h.r * Math.sin(h.phi) * Math.sin(h.theta), h.c[1] + h.r * Math.cos(h.phi), h.c[2] + h.r * Math.sin(h.phi) * Math.cos(h.theta)]; e.cam.target = h.c.slice(); e.dirty = true; }
function initHero() {
  if (HERO.E || HERO.failed) return; const cv = document.getElementById('hero-gl'); if (!cv) return;
  try { HERO.E = new Engine(cv); } catch (e) { HERO.failed = true; document.getElementById('hero-fallback').style.display = 'flex'; genLandingImages(); return; }
  const keepP = S.project; HERO.proj = sampleHome(); S.project = HERO.proj; HERO.proj.theme = 'Japandi'; furnishAll(); S.project = keepP;
  heroBuild(); heroCam(); heroApplyCam();
  withHero(() => { const c = homeCost(); const el = document.getElementById('hero-cost'); if (el) el.innerHTML = `<b class="c-violet">${inr(c.total)}</b> est. interior`; });
  cv.addEventListener('pointerdown', e => { HERO.drag = { x: e.clientX, y: e.clientY, t: HERO.theta, p: HERO.phi }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!HERO.drag) return; HERO.theta = HERO.drag.t - (e.clientX - HERO.drag.x) * 0.006; HERO.phi = clamp(HERO.drag.p - (e.clientY - HERO.drag.y) * 0.004, 0.35, 1.35); heroApplyCam(); });
  const up = () => { HERO.drag = null; HERO.idleAt = performance.now(); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  try { new IntersectionObserver(es => es.forEach(x => HERO.inView = x.isIntersecting)).observe(cv); } catch (e) { }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = t => {
    const dt = Math.min(0.05, (t - HERO.last) / 1000 || 0.016); HERO.last = t;
    if ($('#app').dataset.screen === 'landing' && HERO.inView && !HERO.busy) {
      if (!reduce && !HERO.drag && (!HERO.idleAt || t - HERO.idleAt > 2500)) { HERO.theta += dt * 0.12; heroApplyCam(); }
      if (HERO.E.dirty) { HERO.E.render(); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.addEventListener('resize', () => { if (HERO.E) { heroCam(); heroApplyCam(); } });
  HERO.ready = true;
  setTimeout(genLandingImages, 900);
}
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
// renders happen on a separate off-screen engine so the live hero never flickers
function genEngine(w, h) { if (!HERO.G) { const c = document.createElement('canvas'); c.width = w; c.height = h; HERO.G = new Engine(c, { fixed: true }); } HERO.G.canvas.width = w; HERO.G.canvas.height = h; return HERO.G; }
function genBuild(o) { const keep = HERO.E; HERO.E = HERO.G; try { withHero(() => rebuild(), o); } finally { HERO.E = keep; } }
async function shotFrom(pos, target, fov, w, h) { const g = genEngine(w, h); g.cam.pos = pos; g.cam.target = target; g.cam.fov = fov; const url = g.snapshot(w, h); await nextFrame(); return url; }
async function genLandingImages() {
  if (HERO.gen) return; HERO.gen = true;
  const proj = HERO.proj || (() => { const k = S.project; const p = sampleHome(); S.project = p; furnishAll(); S.project = k; HERO.proj = p; return p; })();
  // BEFORE: the raw floor plan drawing
  const plan = drawPlanImage(proj); const pimg = await loadImage(plan.url);
  const ba = document.getElementById('ba'); if (ba) ba.style.setProperty('--ba-ar', (pimg.width / pimg.height).toFixed(3));
  document.getElementById('ba-before').src = plan.url;
  const room = proj.floors[0].rooms.find(r => r.type === 'living'), room2 = proj.floors[0].rooms.find(r => r.type === 'master');
  withHero(() => { const c = roomCost(room); $('#sc-room').textContent = `${room.name} · ${room.w} × ${room.d} m`; $('#sc-cap').textContent = templateNarration(room).split(/(?<=[.!?])\s+/).slice(0, 2).join(' '); $('#sc-badge2').innerHTML = `<b class="c-cyan">${r2(area(room))} m²</b> · ${inr(c.total)}`; });
  if (!HERO.E && HERO.failed) { document.getElementById('ba-after').src = plan.url; $('#sc-loading').textContent = '3D preview needs WebGL2'; return; }
  try {
    // AFTER: near-orthographic top view framed exactly like the plan image
    const W = Math.round(pimg.width * 1.5), H = Math.round(pimg.height * 1.5); genEngine(W, H);
    const a = W / H, Wm = pimg.width / 48, Hm = pimg.height / 48, b = homeBounds(proj.floors[0]);
    const fov = 10 * Math.PI / 180, t = Math.tan(fov / 2); const A = Wm / Hm;
    const dist = a >= A ? (Hm / 2) / t : (Wm / 2) / (t * a);
    const cx = b.x + b.w / 2, cz = b.y + b.d / 2;
    genBuild({ hour: 11.2, cut: false });
    document.getElementById('ba-after').src = await shotFrom([cx, dist, cz + dist * 0.0005], [cx, 0, cz], fov, W, H);
    // SHOWCASE: interior renders from Aria's tour cameras
    const shots = {};
    for (const [k, rm, hour] of [['tour', room, 10.5], ['walk', room2, 9.2], ['night', room, 20.6]]) {
      genEngine(1280, 720); genBuild({ hour, tour: true, cut: false });
      const sh = withHero(() => roomShot(rm)); shots[k] = await shotFrom(sh.pos, sh.target, 68 * Math.PI / 180, 1280, 720);
    }
    HERO.imgs = shots; scShow('tour');
  } catch (e) { console.warn('landing renders failed', e); }
}
function scShow(k) {
  const img = $('#sc-img'); if (!HERO.imgs[k]) return; img.hidden = false; img.src = HERO.imgs[k]; $('#sc-loading').style.display = 'none';
  const proj = HERO.proj; const rm = proj.floors[0].rooms.find(r => r.type === (k === 'walk' ? 'master' : 'living'));
  withHero(() => { $('#sc-room').textContent = `${rm.name} · ${rm.w} × ${rm.d} m${k === 'night' ? ' · 8:36 PM' : ''}`; const n = templateNarration(rm).split(/(?<=[.!?])\s+/); $('#sc-cap').textContent = k === 'night' ? `Evening in the ${rm.name}: warm 2700K ambient light from the ${CEILINGS[roomCeiling(rm)].label.toLowerCase()} plus a reading lamp beside the sofa. Want brighter task lighting here?` : n.slice(0, 2).join(' '); $('#sc-badge2').innerHTML = `<b class="c-cyan">${r2(area(rm))} m²</b> · ${inr(roomCost(rm).total)}`; });
  $$('[data-sc]').forEach(b => { const on = b.dataset.sc === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
document.addEventListener('click', e => {
  const h = e.target.closest('[data-hero]'); if (h && HERO.E && !HERO.busy) { HERO.mode = h.dataset.hero; $$('[data-hero]').forEach(b => { const on = b === h; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); heroBuild(); }
  const s = e.target.closest('[data-sc]'); if (s) scShow(s.dataset.sc);
});
function siteModal(html) { $('#modal-card').innerHTML = `<button class="x" data-act="modal-close" aria-label="Close">✕</button>${html}`; $('#modal').classList.add('on'); }
function goApp(intent) {
  const u = currentUser();
  if (!u) { S.afterLogin = intent || null; show('login'); renderAuth(); return; }
  if (!u.answers?.done) { S.afterLogin = intent || null; show('intro'); renderIntro(); return; }
  if (intent === 'sample') return startSample(); show('dash');
}
function runAfterLogin() { const i = S.afterLogin; S.afterLogin = null; if (i === 'sample') startSample(); else show('dash'); }
function startSample() { sampleHome(); P().theme = S.prefs.style; S.history = []; S.future = []; S.variants = []; S.structuralLog = []; furnishAll(); S.original = deep(S.project); openWorkspace(true); }
Object.assign(ACT, {
  start: () => goApp(), 'go-login': () => goApp(), sample: () => goApp('sample'),
  'go-landing': () => { show('landing'); setTimeout(initHero, 50); },
  contact: (el, e) => { e && e.preventDefault(); siteModal(`<p class="eyebrow">Talk to us</p><h2>Enterprise &amp; partnerships</h2><p class="muted">Builders, architects and agencies: we'd love to set up branded showcases, team workspaces and on-premise Qwen deployments for you.</p><p>Write to <a href="mailto:${SITE_CONFIG.contactEmail}" style="color:#22d3ee">${SITE_CONFIG.contactEmail}</a> with your team size and use case.</p><div class="row end"><button class="btn primary" data-act="modal-close">Got it</button></div>`); },
  legal: (el, e) => { e && e.preventDefault(); siteModal(el.dataset.k === 'terms' ? `<p class="eyebrow">Terms</p><h2>Terms of use</h2><p class="muted">DIMORA is a design-visualisation tool. Cost figures are illustrative estimates for Indian metro markets, not quotations. Structural and bye-law observations are indicative only. Consult a licensed architect or structural engineer before construction. AI output can be wrong; review it before acting on it.</p>` : `<p class="eyebrow">Privacy</p><h2>Your data stays with you</h2><p class="muted">Projects, preferences, your profile and your intro answers are stored in this browser's local storage. Floor plans and prompts are processed by your own DIMORA backend; they leave your machine only if you connect the hosted OpenRouter AI (otherwise Qwen runs locally through Ollama). With Firebase sign-in enabled, Google and Firebase process your Google account email to verify it. DIMORA has no ads and no tracking.</p>`); },
});

/* ===================== START ===================== */
boot(); window.DIMORA.HERO = HERO;
(function authStart() {
  S.panel = store.get('panel', 'design');
  const u = currentUser();
  if (!u) { show('landing'); setTimeout(initHero, 30); }
  else if (!u.answers?.done) { show('intro'); renderIntro(); }
  else show('dash');
  updateUserChips();
  if (AUTH_CONFIG.firebase) initFirebase().then(() => { if (AUTH.err) renderAuth(); });
})();

})();
