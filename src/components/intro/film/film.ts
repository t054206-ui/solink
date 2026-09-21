/* eslint-disable */
// @ts-nocheck
/**
 * The opening, verbatim.
 *
 * This is the script of the owner's artifact "Solink intro" (solink-intro.html,
 * received 2026-09-21), kept as written so the film is exactly the one the
 * owner approved on video. The only edits are what a single-page app needs:
 *
 *   - it is a function that takes the root element and options instead of an
 *     IIFE that owns the document; `$`, the tags, the language attribute and
 *     the [data-en] lookups are scoped to that root;
 *   - three.js arrives as `opts.THREE` (r128, vendored at
 *     public/vendor/three-r128.min.js) instead of a global;
 *   - window listeners are recorded and `API.dispose()` removes them, stops
 *     the frame loop and frees the renderer, so React can unmount it;
 *   - the language button also reports through `opts.onLanguage`;
 *   - the demo host wiring is gone; `opts.onComplete` is what runs when the
 *     film ends.
 *
 * Two edits the owner asked for on 2026-09-21, each marked in place with
 * "owner 2026-09-21": the glass and the solar-film sheets made clearer and
 * more visible (materials, sheet thickness, the dimming of unfocused layers),
 * and the timeline cut from 37.7 s to 14.2 s with every scene kept and the
 * damping rates scaled so each scene still reaches its composition.
 *
 * ES5 style, `var`, and all: do not modernise it. If the owner sends a new
 * version of the file, regenerate this from it the same way rather than
 * editing by hand. Not type-checked or linted for that reason.
 */
export function mountFilm(root, opts){
  "use strict";
  var THREE = opts.THREE;
  var disposed = false, rafId = 0, offs = [];
  function on(t, ev, fn, o){ t.addEventListener(ev, fn, o); offs.push(function(){ t.removeEventListener(ev, fn, o); }); }

  /* ==========================================================
     CONFIG — everything you're likely to change lives here
     ========================================================== */
  var CONFIG = {
    autoplay:        true,     // start as soon as the page loads
    autoplayDelayMs: 260,
    holdAfterMs:     400,      // pause on the last frame before handing over (owner 2026-09-21: 15 s total)
    respectReducedMotion: true,// skip the film for prefers-reduced-motion
    blurWhenIdle:    false,    // blur the panel once the site takes over
    fadeOnScroll:    560,      // px of scroll that fades the panel out (0 = never)
    idleCamera:      { tx:0, ty:.1, tz:0, th:.52, ph:1.12, r:5.3 },
    idleOffsetX:     -1.75,    // pushes the idle panel to one side on desktop
    idleVisibility:  { sun:.3, panel:1, cells:.35 }
  };

  var API = { onComplete: opts.onComplete || null };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(pointer: coarse)").matches;
  var $ = function(id){ return root.querySelector("#"+id); };
  var lang = opts.lang === "ar" ? "ar" : "en";

  /* ==========================================================
     COPY — the four components and the story beats
     ========================================================== */
  var LAYERS = [
    { en:["Glass","Protects the solar cells."], ar:["الزجاج","يحمي الخلايا الشمسية."] },
    { en:["Solar cells","Capture sunlight and convert it into electricity."], ar:["الخلايا الشمسية","تلتقط ضوء الشمس وتحوّله إلى كهرباء."] },
    { en:["Backsheet","Protects the panel from the back."], ar:["الطبقة الخلفية","تحمي اللوح من الخلف."] },
    { en:["Frame","Supports and protects the panel."], ar:["الإطار","يدعم اللوح ويحميه."] }
  ];

  /* =========================================================
     5 · the cinematic scene
     ========================================================= */
  var stage = $("stage"), introEl = $("intro");
  var capTitle = $("capTitle"), capLine = $("capLine"), capBox = $("caption"),
      rail = $("rail"), progress = $("progress"), journey = $("journey");

  var JOURNEY = [
    { en:"Discover", ar:"اكتشف" }, { en:"Compare", ar:"قارن" }, { en:"Buy", ar:"اشترِ" },
    { en:"Install", ar:"ركّب" },   { en:"Maintain", ar:"اعتنِ" }
  ];
  var jBtns = JOURNEY.map(function(){
    var s = document.createElement("span");
    s.className = "jstep"; s.innerHTML = '<b></b>';
    journey.appendChild(s); return s;
  });
  var tags = LAYERS.map(function(){
    var d = document.createElement("div");
    d.className = "tag"; d.innerHTML = '<i></i><span></span>';
    root.appendChild(d); return d;
  });
  var ecoTags = [0,1,2].map(function(){
    var d = document.createElement("div");
    d.className = "tag eco"; d.innerHTML = '<span></span>';
    root.appendChild(d); return d;
  });
  var railBtns = LAYERS.map(function(L,i){
    var b = document.createElement("button");
    b.type = "button"; b.innerHTML = '<span class="dot"></span><span class="name"></span>';
    b.addEventListener("click", function(){ jumpToStep(i); });
    rail.appendChild(b); return b;
  });

  var has3D = !!THREE;
  var renderer, scene, camera, panel, parts = [], pickable = [], glassMat, evaMat;
  var G = {}, flows = [], cellPts, W = 2.64, D = 1.60;
  var HOUSE_X = 7.6;

  function fadeGroup(obj){
    return { obj:obj, mats:[], v:0,
      add:function(m, base){ m.transparent = true; this.mats.push([m, base == null ? 1 : base]); return m; },
      apply:function(v){
        this.v = v; this.obj.visible = v > .008;
        for (var i=0;i<this.mats.length;i++) this.mats[i][0].opacity = this.mats[i][1]*v;
      } };
  }

  if (has3D){
    renderer = new THREE.WebGLRenderer({ canvas:stage, antialias:true, alpha:true, powerPreference:"high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.6 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

    /* ---- environment: bright warm sky ---- */
    var ec = document.createElement("canvas"); ec.width = 1024; ec.height = 512;
    var ex = ec.getContext("2d");
    var eg = ex.createLinearGradient(0,0,0,512);
    eg.addColorStop(0,"#FFFFFF"); eg.addColorStop(.30,"#EAF3FB"); eg.addColorStop(.55,"#D9E7F4");
    eg.addColorStop(.78,"#F5E9D3"); eg.addColorStop(1,"#E4D6BE");
    ex.fillStyle = eg; ex.fillRect(0,0,1024,512);
    var sgr = ex.createRadialGradient(300,110,0,300,110,210);
    sgr.addColorStop(0,"rgba(255,255,255,1)"); sgr.addColorStop(.12,"rgba(255,244,214,.95)");
    sgr.addColorStop(.42,"rgba(250,222,160,.30)"); sgr.addColorStop(1,"rgba(250,222,160,0)");
    ex.fillStyle = sgr; ex.fillRect(0,0,1024,512);
    var bgr = ex.createLinearGradient(0,140,0,300);
    bgr.addColorStop(0,"rgba(255,255,255,0)"); bgr.addColorStop(.5,"rgba(255,255,255,.75)"); bgr.addColorStop(1,"rgba(255,255,255,0)");
    ex.fillStyle = bgr; ex.fillRect(600,140,340,160);
    var envSrc = new THREE.CanvasTexture(ec);
    envSrc.mapping = THREE.EquirectangularReflectionMapping; envSrc.encoding = THREE.sRGBEncoding;
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromEquirectangular(envSrc).texture;
    envSrc.dispose(); pmrem.dispose();

    /* ---- lights ---- */
    var SUN_POS = new THREE.Vector3(-7.5, 8.5, -5.5);
    var sun3 = new THREE.DirectionalLight(0xFFF3DC, 2.2);
    sun3.position.copy(SUN_POS);
    sun3.castShadow = true;
    sun3.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
    sun3.shadow.camera.near = 1; sun3.shadow.camera.far = 40;
    sun3.shadow.camera.left = -12; sun3.shadow.camera.right = 12;
    sun3.shadow.camera.top = 10; sun3.shadow.camera.bottom = -10;
    sun3.shadow.bias = -0.0008; sun3.shadow.radius = 4;
    scene.add(sun3);
    scene.add(new THREE.DirectionalLight(0xFFFFFF, .85).translateX(-5).translateY(2.6).translateZ(-4.2));
    scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xE8DCC6, .8));

    /* ---- textures ---- */
    function radial(stops, size){
      var c = document.createElement("canvas"); c.width = c.height = size || 256;
      var x = c.getContext("2d"), h = c.width/2;
      var g = x.createRadialGradient(h,h,0,h,h,h);
      stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
      x.fillStyle = g; x.fillRect(0,0,c.width,c.width);
      return new THREE.CanvasTexture(c);
    }
    function cellTexture(){
      var TW = 1024, TH = 620, c = document.createElement("canvas");
      c.width = TW; c.height = TH;
      var x = c.getContext("2d");
      x.fillStyle = "#0A1B33"; x.fillRect(0,0,TW,TH);
      var cols = 10, rows = 6, pad = 10, gap = 6;
      var cw = (TW-pad*2-gap*(cols-1))/cols, ch = (TH-pad*2-gap*(rows-1))/rows;
      for (var r=0;r<rows;r++) for (var q=0;q<cols;q++){
        var px = pad+q*(cw+gap), py = pad+r*(ch+gap);
        var g2 = x.createLinearGradient(px,py,px+cw,py+ch);
        g2.addColorStop(0,"#1B4488"); g2.addColorStop(.5,"#0F2E62"); g2.addColorStop(1,"#1C4589");
        x.fillStyle = g2; x.fillRect(px,py,cw,ch);
        x.fillStyle = "#0A1B33"; var k = cw*.10;
        [[px,py,1,1],[px+cw,py,-1,1],[px,py+ch,1,-1],[px+cw,py+ch,-1,-1]].forEach(function(p){
          x.beginPath(); x.moveTo(p[0],p[1]); x.lineTo(p[0]+k*p[2],p[1]); x.lineTo(p[0],p[1]+k*p[3]); x.closePath(); x.fill();
        });
        x.strokeStyle = "rgba(200,218,242,.22)"; x.lineWidth = 1;
        for (var f=px+5; f<px+cw-4; f+=6){ x.beginPath(); x.moveTo(f,py+3); x.lineTo(f,py+ch-3); x.stroke(); }
        x.strokeStyle = "rgba(232,242,255,.85)"; x.lineWidth = 3;
        for (var b=1;b<=3;b++){ var by = py+ch*(b/4); x.beginPath(); x.moveTo(px+2,by); x.lineTo(px+cw-2,by); x.stroke(); }
      }
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    }
    var CELLTEX = cellTexture();
    var GLOW = radial([[0,"rgba(255,255,255,1)"],[.18,"rgba(255,240,205,.92)"],[.45,"rgba(250,205,120,.32)"],[1,"rgba(250,205,120,0)"]], 512);
    var DOT  = radial([[0,"rgba(255,248,224,1)"],[.35,"rgba(250,205,110,.85)"],[1,"rgba(250,205,110,0)"]], 128);

    /* ---- scene 1: the sun ---- */
    var sunGroup = new THREE.Group(); sunGroup.position.copy(SUN_POS); scene.add(sunGroup);
    G.sun = fadeGroup(sunGroup);
    var core = new THREE.Sprite(G.sun.add(new THREE.SpriteMaterial({ map:GLOW, color:0xFFFFFF,
      blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false })));
    core.scale.set(13,13,1); sunGroup.add(core);
    var raysGroup = new THREE.Group(); sunGroup.add(raysGroup);
    var rayTex = (function(){
      var c = document.createElement("canvas"); c.width = 16; c.height = 256;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0,0,0,256);
      g.addColorStop(0,"rgba(255,235,190,0)"); g.addColorStop(.5,"rgba(255,238,200,.5)"); g.addColorStop(1,"rgba(255,235,190,0)");
      x.fillStyle = g; x.fillRect(0,0,16,256);
      return new THREE.CanvasTexture(c);
    })();
    var rayMat = G.sun.add(new THREE.MeshBasicMaterial({ map:rayTex, blending:THREE.AdditiveBlending,
      depthWrite:false, depthTest:false, side:THREE.DoubleSide }), .55);
    for (var ri=0; ri<14; ri++){
      var ray = new THREE.Mesh(new THREE.PlaneGeometry(.30 + (ri%3)*.16, 17 + (ri%4)*5), rayMat);
      ray.rotation.z = (ri/14)*Math.PI*2 + (ri%2)*.12;
      raysGroup.add(ray);
    }
    // the beam that reaches the panel
    var beamGroup = new THREE.Group(); scene.add(beamGroup);
    G.beam = fadeGroup(beamGroup);
    (function(){
      var from = SUN_POS.clone(), to = new THREE.Vector3(0,.06,0);
      var len = from.distanceTo(to);
      var geo = new THREE.CylinderGeometry(.16, 2.0, len, 24, 1, true);
      var m = new THREE.Mesh(geo, G.beam.add(new THREE.MeshBasicMaterial({
        color:0xFFE6B0, transparent:true, blending:THREE.AdditiveBlending,
        depthWrite:false, side:THREE.DoubleSide }), .34));
      m.position.copy(from.clone().lerp(to,.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0), to.clone().sub(from).normalize());
      beamGroup.add(m);
    })();

    /* ---- scene 2/3: the panel ---- */
    panel = new THREE.Group(); scene.add(panel);
    G.panel = fadeGroup(panel);
    function register(idx, meshes, baseY, exploded, mats){
      parts[idx] = { meshes:meshes, baseY:baseY, exploded:exploded, mats:mats,
                     y:baseY, op:1, target:1, speed:(2.4 + (3-idx)*.6) * 2.2 };
      meshes.forEach(function(m){ m.userData.idx = idx; pickable.push(m); });
    }
    function mk(geo, mat, y){
      var m = new THREE.Mesh(geo, mat);
      m.position.y = y; m.castShadow = true; m.receiveShadow = true;
      panel.add(m); return m;
    }
    // Owner, 2026-09-21: glass more visible and realistic. Clearer tint, a
    // stronger reflection of the room, and half opaque rather than a third.
    glassMat = G.panel.add(new THREE.MeshPhysicalMaterial({ color:0xE4F0FB, metalness:0, roughness:.02,
      clearcoat:1, clearcoatRoughness:.015, reflectivity:1, envMapIntensity:3.2, side:THREE.DoubleSide, depthWrite:false }), .52);
    var glass = mk(new THREE.BoxGeometry(W,.036,D), glassMat, .056);
    glass.castShadow = false;
    register(0,[glass],.056,.95,[glassMat]);

    var cellMat = G.panel.add(new THREE.MeshPhysicalMaterial({ map:CELLTEX, metalness:.40, roughness:.28,
      envMapIntensity:1.35, clearcoat:.6 }));
    var sideMat = G.panel.add(new THREE.MeshStandardMaterial({ color:0x0A1B33, roughness:.7, metalness:.2 }));
    // Owner, 2026-09-21: the solar film lighter, clearer and defined. A cool
    // near-white sheet with a soft sheen, more present than the old cream.
    evaMat = G.panel.add(new THREE.MeshPhysicalMaterial({ color:0xF3F8FF, metalness:0, roughness:.18,
      envMapIntensity:1.5, clearcoat:.9, clearcoatRoughness:.08, side:THREE.DoubleSide }), .7);
    var cellsM = mk(new THREE.BoxGeometry(W-.09,.009,D-.09),
                    [sideMat,sideMat,cellMat,sideMat,sideMat,sideMat], .0175);
    var evaTop = mk(new THREE.BoxGeometry(W-.02,.02,D-.02), evaMat, .034);
    var evaBot = mk(new THREE.BoxGeometry(W-.02,.02,D-.02), evaMat, .001);
    register(1,[cellsM,evaTop,evaBot],.0175,.30,[cellMat,sideMat,evaMat]);

    var backMat = G.panel.add(new THREE.MeshPhysicalMaterial({ color:0xFFFFFF, roughness:.66, metalness:.02, envMapIntensity:.9 }));
    var back = mk(new THREE.BoxGeometry(W,.014,D), backMat, -.010);
    var jbMat = G.panel.add(new THREE.MeshStandardMaterial({ color:0x1B1F24, roughness:.45, metalness:.35 }));
    var jb = new THREE.Mesh(new THREE.BoxGeometry(.34,.075,.20), jbMat);
    jb.position.set(0,-.055,.30); jb.castShadow = true; panel.add(jb);
    var cableMat = G.panel.add(new THREE.MeshStandardMaterial({ color:0x14171B, roughness:.6, metalness:.1 }));
    var extras = [];
    [-1,1].forEach(function(s){
      var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s*.10,-.085,.34), new THREE.Vector3(s*.26,-.22,.46),
        new THREE.Vector3(s*.56,-.16,.60),  new THREE.Vector3(s*.86,-.25,.52)
      ]);
      var tube = new THREE.Mesh(new THREE.TubeGeometry(curve,40,.019,8,false), cableMat);
      tube.castShadow = true; panel.add(tube); extras.push(tube);
    });
    register(2,[back,jb].concat(extras),-.010,-.34,[backMat,jbMat,cableMat]);

    var frameMat = G.panel.add(new THREE.MeshStandardMaterial({ color:0xD6DCE2, metalness:.92, roughness:.24, envMapIntensity:1.6 }));
    var fw = .055, fh = .155, frameMeshes = [];
    (function(){
      function rail3(w,d,x,z){
        var m = new THREE.Mesh(new THREE.BoxGeometry(w,fh,d), frameMat);
        m.position.set(x,.006,z); m.castShadow = true; m.receiveShadow = true;
        panel.add(m); frameMeshes.push(m);
      }
      rail3(W+fw*2, fw, 0,  D/2+fw/2);
      rail3(W+fw*2, fw, 0, -D/2-fw/2);
      rail3(fw, D, -W/2-fw/2, 0);
      rail3(fw, D,  W/2+fw/2, 0);
    })();
    register(3, frameMeshes, .006, -.78, [frameMat]);

    // energy moving through the cells
    (function(){
      var N = isTouch ? 90 : 150, pos = new Float32Array(N*3), seed = [];
      for (var i=0;i<N;i++){
        seed.push({ x:(Math.random()-.5)*(W-.2), z:(Math.random()-.5)*(D-.2), s:.55+Math.random()*.9 });
        pos[i*3] = seed[i].x; pos[i*3+1] = .075; pos[i*3+2] = seed[i].z;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos,3));
      var m = new THREE.PointsMaterial({ map:DOT, size:.115, sizeAttenuation:true, transparent:true,
        blending:THREE.AdditiveBlending, depthWrite:false, color:0xFFD98A });
      cellPts = new THREE.Points(g, m);
      cellPts.userData.seed = seed;
      panel.add(cellPts);
      G.cells = fadeGroup(cellPts); G.cells.add(m, .95);
    })();

    /* ---- scene 4: the home ---- */
    var houseGroup = new THREE.Group(); scene.add(houseGroup);
    G.house = fadeGroup(houseGroup);
    var winMat = G.house.add(new THREE.MeshBasicMaterial({ color:0xFFD08A }), 0);
    function buildHouse(scale, x, z, rot){
      var h = new THREE.Group();
      h.position.set(x, -1.35, z); h.scale.setScalar(scale); h.rotation.y = rot || 0;
      var wall = G.house.add(new THREE.MeshStandardMaterial({ color:0xFAF5EA, roughness:.9, metalness:0 }));
      var wall2 = G.house.add(new THREE.MeshStandardMaterial({ color:0xEFE6D6, roughness:.92, metalness:0 }));
      var slab = G.house.add(new THREE.MeshStandardMaterial({ color:0x8D8272, roughness:.8, metalness:.05 }));
      function box(w,hh,d,x2,y2,z2,mat){
        var m = new THREE.Mesh(new THREE.BoxGeometry(w,hh,d), mat);
        m.position.set(x2, y2+hh/2, z2); m.castShadow = true; m.receiveShadow = true;
        h.add(m); return m;
      }
      box(3.4,2.0,2.8, 0,0,0, wall);
      box(2.1,1.35,2.3, .7,2.0,-.2, wall2);
      box(3.8,.14,3.2, 0,2.0,0, slab);
      box(2.4,.13,2.5, .7,3.35,-.2, slab);
      // windows
      [[-.9,.75,1.41,.9,.9],[.75,.75,1.41,.7,.9],[0,.75,-1.41,1.6,.9],[.7,2.55,.96,1.1,.7]].forEach(function(w){
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w[3],w[4]), winMat);
        m.position.set(w[0], w[1], w[2]);
        if (Math.abs(w[2]) < 1.2) m.position.z = w[2];
        if (w[2] < 0) m.rotation.y = Math.PI;
        h.add(m);
      });
      // rooftop panels
      for (var k=0;k<2;k++){
        var mini = new THREE.Mesh(new THREE.BoxGeometry(1.5,.05,.95),
          [slab,slab,G.house.add(new THREE.MeshStandardMaterial({ map:CELLTEX, metalness:.4, roughness:.3 })),slab,slab,slab]);
        mini.position.set(-.85, 2.24, -.75 + k*1.05);
        mini.rotation.x = -.24; mini.castShadow = true;
        h.add(mini);
      }
      houseGroup.add(h);
      return h;
    }
    var mainHouse = buildHouse(1, HOUSE_X, -1.2, -.42);
    var houseLight = new THREE.PointLight(0xFFC98A, 0, 9);
    houseLight.position.set(HOUSE_X, .2, -.6); scene.add(houseLight);
    var ground = new THREE.Mesh(new THREE.CircleGeometry(6.4, 48),
      G.house.add(new THREE.MeshStandardMaterial({ color:0xE9EFE2, roughness:1 }), .9));
    ground.rotation.x = -Math.PI/2; ground.position.set(HOUSE_X, -1.345, -1.2);
    ground.receiveShadow = true; houseGroup.add(ground);

    /* ---- the energy path ---- */
    var pathGroup = new THREE.Group(); scene.add(pathGroup);
    G.flow = fadeGroup(pathGroup);
    var pathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.55,-.22,.42), new THREE.Vector3(2.4,.45,.9),
      new THREE.Vector3(4.6,.15,.2),   new THREE.Vector3(6.2,-.45,-.5),
      new THREE.Vector3(HOUSE_X-1.5,-.95,-.9)
    ]);
    pathGroup.add(new THREE.Mesh(new THREE.TubeGeometry(pathCurve, 90, .026, 8, false),
      G.flow.add(new THREE.MeshBasicMaterial({ color:0xF2C14E }), .42)));

    /* ---- scene 5: the ecosystem ---- */
    var ecoGroup = new THREE.Group(); scene.add(ecoGroup);
    G.eco = fadeGroup(ecoGroup);
    var ringMat = G.eco.add(new THREE.MeshBasicMaterial({ color:0xF2C14E }), .55);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(3.1,.035,10,90), ringMat);
    ring.rotation.x = Math.PI/2; ring.position.y = -1.3; ecoGroup.add(ring);
    var pad = new THREE.Mesh(new THREE.CircleGeometry(3.1,56),
      G.eco.add(new THREE.MeshBasicMaterial({ map:radial([[0,"rgba(242,193,78,.5)"],[.6,"rgba(242,193,78,.13)"],[1,"rgba(242,193,78,0)"]]),
        blending:THREE.AdditiveBlending, depthWrite:false }), .8));
    pad.rotation.x = -Math.PI/2; pad.position.y = -1.32; ecoGroup.add(pad);

    var cardMat  = G.eco.add(new THREE.MeshStandardMaterial({ color:0xFFFFFF, roughness:.5, metalness:.05 }));
    var cardFace = G.eco.add(new THREE.MeshStandardMaterial({ map:CELLTEX, metalness:.4, roughness:.3 }));
    var vendorNodes = [], consumerNodes = [];
    for (var ci=0; ci<5; ci++){
      var card = new THREE.Mesh(new THREE.BoxGeometry(1.6,.07,1.05),
        [cardMat,cardMat,cardFace,cardMat,cardMat,cardMat]);
      var ang = -.55 + ci*.28;
      card.position.set(-8.4 - Math.cos(ang)*1.5, .5 + (ci%3)*.95 - 1.1, Math.sin(ang)*3.2 - .4);
      card.rotation.set(-.22 + (ci%2)*.1, .5 - ci*.12, .12);
      card.castShadow = true;
      card.userData.bob = Math.random()*6.28;
      ecoGroup.add(card); vendorNodes.push(card);
    }
    for (var hi=0; hi<4; hi++){
      var hx = HOUSE_X + 2.6 + (hi%2)*3.4, hz = -5.2 + Math.floor(hi/2)*4.6 + (hi%2)*1.4;
      consumerNodes.push(buildHouse(.52, hx, hz, -.3 + hi*.3));
    }
    G.eco.add(winMat, 0);

    /* ---- flowing particles along curves ---- */
    function makeFlow(curves, count, size, color, group, base){
      var samples = curves.map(function(c){ return c.getPoints(80); });
      var pos = new Float32Array(count*3), state = [];
      for (var i=0;i<count;i++){
        state.push({ c:i % curves.length, t:Math.random(), s:.10 + Math.random()*.14 });
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos,3));
      var m = new THREE.PointsMaterial({ map:DOT, size:size, sizeAttenuation:true, transparent:true,
        blending:THREE.AdditiveBlending, depthWrite:false, color:color });
      var pts = new THREE.Points(g, m);
      pts.frustumCulled = false;
      (group.obj).add(pts); group.add(m, base == null ? .95 : base);
      var f = { update:function(dt){
        var a = g.attributes.position.array;
        for (var i=0;i<state.length;i++){
          var st = state[i]; st.t += st.s*dt; if (st.t > 1) st.t -= 1;
          var arr = samples[st.c], p = arr[Math.floor(st.t*(arr.length-1))];
          a[i*3] = p.x; a[i*3+1] = p.y; a[i*3+2] = p.z;
        }
        g.attributes.position.needsUpdate = true;
      } };
      flows.push(f); return f;
    }
    makeFlow([pathCurve], isTouch ? 40 : 70, .16, 0xFFD27A, G.flow);

    var ecoCurves = [];
    vendorNodes.forEach(function(c){
      ecoCurves.push(new THREE.CatmullRomCurve3([
        c.position.clone(),
        c.position.clone().lerp(new THREE.Vector3(0,-1.1,0), .5).add(new THREE.Vector3(0,1.1,0)),
        new THREE.Vector3(Math.cos(Math.random()*6.28)*3.1, -1.28, Math.sin(Math.random()*6.28)*3.1)
      ]));
    });
    [mainHouse].concat(consumerNodes).forEach(function(h){
      ecoCurves.push(new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(Math.random()*6.28)*3.1, -1.28, Math.sin(Math.random()*6.28)*3.1),
        new THREE.Vector3((h.position.x)*.55, .4, (h.position.z)*.55),
        new THREE.Vector3(h.position.x, h.position.y + 1.1*h.scale.x, h.position.z)
      ]));
    });
    ecoCurves.forEach(function(c){
      var t = new THREE.Mesh(new THREE.TubeGeometry(c, 40, .012, 6, false),
        G.eco.add(new THREE.MeshBasicMaterial({ color:0xE3B765 }), .30));
      ecoGroup.add(t);
    });
    makeFlow(ecoCurves, isTouch ? 90 : 170, .13, 0xFFCE74, G.eco);

    /* ---- ground shadow + warm pool under the panel ---- */
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(90,90), new THREE.ShadowMaterial({ opacity:.15 }));
    floor.rotation.x = -Math.PI/2; floor.position.y = -1.35; floor.receiveShadow = true; scene.add(floor);
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(9,9), new THREE.MeshBasicMaterial({
      map:radial([[0,"rgba(242,193,78,.34)"],[.45,"rgba(242,193,78,.10)"],[1,"rgba(242,193,78,0)"]]),
      transparent:true, depthWrite:false }));
    pool.rotation.x = -Math.PI/2; pool.position.y = -1.33; scene.add(pool);

    G.sun.apply(0); G.beam.apply(0); G.panel.apply(0); G.cells.apply(0);
    G.house.apply(0); G.flow.apply(0); G.eco.apply(0);
    var _sunRays = raysGroup, _houseLight = houseLight, _winMat = winMat,
        _vendorNodes = vendorNodes, _ring = ring;
    G._rays = _sunRays; G._light = _houseLight; G._win = _winMat; G._cards = _vendorNodes; G._ring = _ring;
  }

  /* =========================================================
     6 · the six-scene timeline
     ========================================================= */
  var SCRIPTED = [
    { n:"sun",      d:1.1,  cam:{ tx:-2.4, ty:3.0, tz:-2.0, th:.55, ph:1.02, r:7.8 },
      vis:{ sun:1 } },
    { n:"panelIn",  d:1.4,  cam:{ tx:0, ty:.1, tz:0, th:.72, ph:1.06, r:5.6 },
      vis:{ sun:.75, beam:1, panel:1, cells:1 }, cap:0 },
    { n:"expand",   d:.55,  cam:{ tx:0, ty:.1, tz:0, th:.50, ph:1.10, r:5.9 },
      vis:{ sun:.4, beam:.35, panel:1, cells:.5 } },
    { n:"step", i:0, d:1.05 }, { n:"step", i:1, d:1.05 },
    { n:"step", i:2, d:1.05 }, { n:"step", i:3, d:1.05 },
    { n:"collapse", d:.65,  cam:{ tx:0, ty:.1, tz:0, th:.58, ph:1.06, r:5.4 },
      vis:{ sun:.4, beam:.5, panel:1, cells:.8 } },
    { n:"flow1",    d:1.1,  cam:{ tx:2.6, ty:0, tz:0, th:.42, ph:1.14, r:9.4 },
      vis:{ sun:.35, beam:.5, panel:1, cells:1, flow:1 }, cap:1 },
    { n:"flow2",    d:1.2,  cam:{ tx:5.2, ty:.1, tz:-.6, th:.40, ph:1.16, r:11.0 },
      vis:{ sun:.3, panel:1, cells:.7, flow:1, house:1 }, cap:2, light:1 },
    { n:"eco",      d:1.3,  cam:{ tx:1.2, ty:.4, tz:-.4, th:.34, ph:1.06, r:23 },
      vis:{ sun:.35, panel:1, cells:.5, flow:.8, house:1, eco:1 }, cap:3, light:1 },
    { n:"journey",  d:1.2,  cam:{ tx:1.2, ty:.5, tz:-.4, th:.52, ph:1.14, r:25 },
      vis:{ sun:.35, panel:1, cells:.5, flow:.8, house:1, eco:1 }, light:1, rail:1 },
    { n:"finale",   d:1.1,  cam:{ tx:.4, ty:.2, tz:0, th:.62, ph:1.10, r:12 },
      vis:{ sun:.4, panel:1, cells:.8, flow:.5, house:.7, eco:.45 }, cap:4, light:.7, rail:1 },
    { n:"outro",    d:.4,   cam:{ tx:0, ty:.1, tz:0, th:.58, ph:1.06, r:5.6 },
      vis:{ sun:.35, panel:1, cells:.6 } }
  ];
  var SHOT = [
    { th:.64, ph:1.14, r:4.7 }, { th:.36, ph:1.24, r:4.5 },
    { th:.74, ph:1.04, r:4.7 }, { th:.50, ph:1.34, r:5.1 }
  ];
  var STORY = [
    { en:["It starts with sunlight.",""],                 ar:["تبدأ القصة بضوء الشمس.",""] },
    { en:["From sunlight to energy.",""],                 ar:["من ضوء الشمس إلى طاقة.",""] },
    { en:["From energy to your home.",""],                ar:["ومن الطاقة إلى منزلك.",""] },
    { en:["One platform connecting the solar ecosystem.",
          "Vendors list. We connect. You choose."],       ar:["منصة واحدة تربط منظومة الطاقة الشمسية.",
                                                              "الموردون يعرضون. نحن نربط. وأنت تختار."] },
    { en:["Buying solar is only the beginning.",
          "Discover. Compare. Buy. Maintain."],           ar:["شراء الطاقة الشمسية هو البداية فقط.",
                                                              "اكتشف. قارن. اشترِ. اعتنِ."] }
  ];
  var TOTAL = SCRIPTED.reduce(function(a,p){ return a+p.d; }, 0);

  var pi = 0, pt = 0, focusIdx = -1, explode = 0, playing = false, mobile = false, screen = "boot";
  var cam  = { tx:-2.4, ty:3.0, tz:-2.0, th:1.15, ph:1.15, r:16 };
  var camT = { tx:0, ty:0, tz:0, th:.6, ph:1.05, r:5.4 };
  var user = { th:0, ph:0, zoom:1 }, dragging = false;
  var vis = { sun:0, beam:0, panel:0, cells:0, flow:0, house:0, eco:0 };
  var visT = { sun:0, beam:0, panel:0, cells:0, flow:0, house:0, eco:0 };
  var lightT = 0, lightV = 0, railStep = -1, railOn = false;

  function mScale(){ return mobile ? 1.34 : 1; }
  function setCam(c){
    camT.tx = c.tx; camT.ty = c.ty; camT.tz = c.tz || 0;
    camT.th = c.th; camT.ph = c.ph; camT.r = c.r * mScale();
  }
  function setVis(v){
    for (var k in visT) visT[k] = 0;
    if (v) for (var j in v) visT[j] = v[j];
  }
  function showStory(i){
    var s = STORY[i][lang];
    capTitle.textContent = s[0];
    capLine.textContent = s[1] || "";
    capLine.style.display = s[1] ? "block" : "none";
    capBox.classList.add("on", "story");
  }
  function showLayer(i){
    capTitle.textContent = LAYERS[i][lang][0];
    capLine.textContent = LAYERS[i][lang][1];
    capLine.style.display = "block";
    capBox.classList.add("on"); capBox.classList.remove("story");
  }
  function hideCap(){ capBox.classList.remove("on"); }

  function paintJourney(){
    jBtns.forEach(function(b,i){
      b.querySelector("b").textContent = JOURNEY[i][lang];
      b.classList.toggle("on", railOn && i <= railStep);
    });
    journey.classList.toggle("on", railOn);
  }

  function setPhase(n){
    pi = Math.max(0, Math.min(SCRIPTED.length-1, n)); pt = 0;
    var p = SCRIPTED[pi];
    if (p.n === "step"){
      focusIdx = p.i; showLayer(p.i);
      var s = SHOT[p.i];
      setCam({ tx:0, ty:0, tz:0, th:s.th, ph:s.ph, r:s.r });
      setVis({ sun:.4, beam:.3, panel:1, cells:.35 });
    } else {
      focusIdx = -1;
      setCam(p.cam); setVis(p.vis);
      if (p.cap != null) showStory(p.cap); else hideCap();
    }
    lightT = p.light || 0;
    railOn = !!p.rail; if (railOn && railStep < 0) railStep = -1;
    paintJourney();
    railBtns.forEach(function(b,i){ b.setAttribute("aria-current", String(i === focusIdx)); });
    if (p.n === "outro") handoff();
  }
  function jumpToStep(i){
    for (var k=0;k<SCRIPTED.length;k++)
      if (SCRIPTED[k].n === "step" && SCRIPTED[k].i === i){ explode = Math.max(explode,.35); setPhase(k); return; }
  }
  function elapsed(){
    var t = 0; for (var k=0;k<pi;k++) t += SCRIPTED[k].d;
    return t + Math.min(pt, SCRIPTED[pi].d);
  }
  function startIntro(){
    if (disposed) return;
    if (!has3D) return finishToApp();
    playing = true; user.th = user.ph = 0; user.zoom = 1;
    explode = 0; railStep = -1; railOn = false;
    panel.rotation.set(0,0,0);
    cam.tx = -2.4; cam.ty = 3.0; cam.tz = -2.0; cam.th = 1.15; cam.ph = 1.15; cam.r = 16*mScale();
    for (var k in vis) vis[k] = 0;
    lightV = 0;
    setScreen("intro"); setPhase(0);
  }
  function handoff(){
    playing = false; hideCap(); railOn = false; paintJourney();
    setTimeout(finishToApp, CONFIG.holdAfterMs);
  }
  function finishToApp(){
    if (disposed) return;
    setScreen("idle");
    if (typeof API.onComplete === "function") API.onComplete();
  }
  function replayIntro(stepAfter){
    startIntro();
    if (stepAfter != null) setTimeout(function(){ jumpToStep(stepAfter); }, 900);
  }

  /* =========================================================
     7 · routing + the render loop
     ========================================================= */
  // "intro" = the cinematic is running · "idle" = the panel drifts as a background
  function setScreen(name){
    screen = name;
    var isIntro = name === "intro";
    introEl.classList.toggle("on", isIntro);
    stage.classList.toggle("grab", isIntro);
    stage.classList.toggle("soft", !isIntro && CONFIG.blurWhenIdle);
    progress.style.opacity = isIntro ? "1" : "0";
    document.body.classList.toggle("intro-running", isIntro);
    if (!isIntro && typeof camT !== "undefined"){
      playing = false;
      hideCap(); railOn = false; paintJourney();
      setVis(CONFIG.idleVisibility);
      lightT = 0;
      setCam(CONFIG.idleCamera);
      if (!mobile) camT.tx = CONFIG.idleOffsetX;
      user.th = user.ph = 0; user.zoom = 1;
    }
  }

  if (has3D){
    (function(){
      function resize(){
        var w = window.innerWidth, h = window.innerHeight;
        mobile = w < 760;
        camera.aspect = w/h; camera.updateProjectionMatrix();
        renderer.setSize(w,h,false);
        panel.scale.setScalar(mobile ? .86 : 1);
        if (playing) setCam(SCRIPTED[pi].n === "step"
          ? { tx:0, ty:0, tz:0, th:SHOT[SCRIPTED[pi].i].th, ph:SHOT[SCRIPTED[pi].i].ph, r:SHOT[SCRIPTED[pi].i].r }
          : SCRIPTED[pi].cam);
        else if (screen !== "boot") setScreen(screen);
      }
      on(window, "resize", resize); resize();

      var px0=0, py0=0, pinch0=0, downAt=null;
      stage.addEventListener("pointerdown", function(e){
        if (screen !== "intro") return;
        stage.setPointerCapture(e.pointerId);
        dragging = true; px0 = e.clientX; py0 = e.clientY; downAt = [e.clientX,e.clientY];
        stage.classList.add("dragging");
      });
      stage.addEventListener("pointermove", function(e){
        if (!dragging) return;
        user.th += (e.clientX-px0)*.0055;
        user.ph -= (e.clientY-py0)*.004;
        user.ph = Math.max(-.5, Math.min(.55, user.ph));
        px0 = e.clientX; py0 = e.clientY;
      });
      function up(){ dragging = false; stage.classList.remove("dragging"); }
      on(window, "pointerup", up);
      on(window, "pointercancel", up);
      stage.addEventListener("touchstart", function(e){
        if (e.touches.length === 2) pinch0 = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      }, { passive:true });
      stage.addEventListener("touchmove", function(e){
        if (e.touches.length === 2 && pinch0){
          var d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
          user.zoom = Math.max(.7, Math.min(1.45, user.zoom*(pinch0/d)));
          pinch0 = d; e.preventDefault();
        }
      }, { passive:false });
      stage.addEventListener("dblclick", function(){ user.th = user.ph = 0; user.zoom = 1; });

      var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      stage.addEventListener("pointerup", function(e){
        if (!downAt || screen !== "intro") return;
        if (Math.hypot(e.clientX-downAt[0], e.clientY-downAt[1]) > 6) return;
        ndc.x = (e.clientX/window.innerWidth)*2-1;
        ndc.y = -(e.clientY/window.innerHeight)*2+1;
        ray.setFromCamera(ndc, camera);
        var hit = ray.intersectObjects(pickable,false)[0];
        if (hit && hit.object.userData.idx != null) jumpToStep(hit.object.userData.idx);
      });

      function damp(a,b,rate,dt){ return b + (a-b)*Math.exp(-rate*dt); }
      function easeOut(t){ return 1-Math.pow(1-t,3); }
      function easeInOut(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

      var clock = new THREE.Clock(), v3 = new THREE.Vector3(), vTmp = new THREE.Vector3();
      var ecoAnchors = [ new THREE.Vector3(-8.6,1.0,0), new THREE.Vector3(0,-.6,0), new THREE.Vector3(HOUSE_X+1.6,.9,-1) ];
      var ECO_LABELS = [ {en:"Vendors",ar:"الموردون"}, {en:"Solink",ar:"سولينك"}, {en:"Consumers",ar:"المستهلكون"} ];

      (function frame(){
        if (disposed) return;
        rafId = requestAnimationFrame(frame);
        var dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
        var p = SCRIPTED[pi];

        if (playing){
          pt += dt;
          if (pt >= p.d) setPhase(pi+1);
          p = SCRIPTED[pi];
          var prog = Math.min(1, pt/p.d);
          progress.style.width = (elapsed()/TOTAL*100).toFixed(2)+"%";

          var tx = p.n === "expand" ? easeInOut(prog)
                 : p.n === "step" ? 1
                 : p.n === "collapse" ? 1-easeInOut(prog) : 0;
          explode = damp(explode, tx, 14, dt);

          if (p.n === "panelIn"){
            var e = easeOut(Math.min(1, prog*1.25));
            panel.rotation.y = (1-e)*-1.15;
            panel.rotation.z = (1-e)*.26;
            panel.rotation.x = (1-e)*.38;
            panel.position.y = (1-e)*1.3;
          } else {
            panel.rotation.x = damp(panel.rotation.x,0,7,dt);
            panel.rotation.z = damp(panel.rotation.z,0,7,dt);
            panel.position.y = damp(panel.position.y,0,7,dt);
            if (p.n === "eco" || p.n === "journey" || p.n === "finale" || p.n === "outro")
              panel.rotation.y += .12*dt;
          }
          if (p.n === "journey"){
            var want = Math.min(JOURNEY.length-1, Math.floor(prog*JOURNEY.length));
            if (want !== railStep){ railStep = want; paintJourney(); }
          }
          if (p.n === "finale" && prog > .45 && railStep !== JOURNEY.length-1){
            railStep = JOURNEY.length-1; paintJourney();
          }
        } else {
          explode = damp(explode, 0, 5, dt);
          if (!dragging) panel.rotation.y += .085*dt;
          panel.rotation.x = damp(panel.rotation.x,0,3,dt);
          panel.rotation.z = damp(panel.rotation.z,0,3,dt);
          panel.position.y = damp(panel.position.y,0,3,dt);
        }
        panel.position.y += Math.sin(t*.6)*.0006;

        /* --- group visibility --- */
        for (var key in vis){
          vis[key] = damp(vis[key], visT[key], 6.2, dt);
          if (G[key]) G[key].apply(vis[key]);
        }
        lightV = damp(lightV, lightT, 5.3, dt);
        if (G._light) G._light.intensity = lightV * 2.6;
        if (G._win) G._win.opacity = Math.max(vis.house, vis.eco) * (.25 + .75*lightV);
        if (G._rays) G._rays.rotation.z += .035*dt;
        if (G._ring) G._ring.rotation.z += .22*dt;
        if (G._cards) G._cards.forEach(function(c,i){
          c.position.y += Math.sin(t*.7 + c.userData.bob)*.0016;
          c.rotation.y += .06*dt*(i%2?1:-1);
        });
        for (var fi=0; fi<flows.length; fi++) flows[fi].update(dt);
        if (cellPts && vis.cells > .01){
          var arr = cellPts.geometry.attributes.position.array, sd = cellPts.userData.seed;
          for (var s2=0; s2<sd.length; s2++){
            arr[s2*3] += sd[s2].s*dt*.9;
            if (arr[s2*3] > W/2) arr[s2*3] = -W/2;
          }
          cellPts.geometry.attributes.position.needsUpdate = true;
        }

        /* --- exploded layers --- */
        var spread = mobile ? .82 : 1;
        for (var i=0;i<parts.length;i++){
          var L = parts[i], focused = focusIdx === i;
          var yT = L.baseY + explode*L.exploded*spread + (focused ? .07*explode : 0);
          L.y = damp(L.y, yT, L.speed, dt);
          L.meshes[0].position.y = L.y;
          for (var m=1;m<L.meshes.length;m++){
            var off = L.meshes[m].userData.off;
            if (off == null){ off = L.meshes[m].position.y - L.baseY; L.meshes[m].userData.off = off; }
            L.meshes[m].position.y = L.y + off;
          }
          L.target = (focusIdx < 0) ? 1 : (focused ? 1 : .48);   // owner 2026-09-21: layers must not blend
          L.op = damp(L.op, L.target, 12, dt);
          for (var k2=0;k2<L.mats.length;k2++) L.mats[k2].userData.dim = L.op;
        }
        for (var gi=0; gi<G.panel.mats.length; gi++){
          var pair = G.panel.mats[gi];
          var dim = pair[0].userData.dim;
          pair[0].opacity = pair[1] * vis.panel * (dim == null ? 1 : (.18+.82*dim));
        }

        /* --- camera --- */
        // Rates ×2.4 with the timeline (owner 2026-09-21), so a 1 s scene still arrives.
        cam.th = damp(cam.th, camT.th+user.th, 5.5, dt);
        cam.ph = damp(cam.ph, camT.ph+user.ph, 5.5, dt);
        cam.r  = damp(cam.r,  camT.r*user.zoom, 4.6, dt);
        cam.tx = damp(cam.tx, camT.tx, 4.6, dt);
        cam.tz = damp(cam.tz, camT.tz, 4.6, dt);
        var focusY = focusIdx >= 0 ? parts[focusIdx].y*(mobile?.86:1)*.85 : 0;
        cam.ty = damp(cam.ty, camT.ty + focusY, 5.8, dt);
        var ph = Math.max(.22, Math.min(2.4, cam.ph));
        camera.position.set(
          cam.tx + cam.r*Math.sin(ph)*Math.sin(cam.th),
          cam.ty + cam.r*Math.cos(ph),
          cam.tz + cam.r*Math.sin(ph)*Math.cos(cam.th));
        camera.lookAt(cam.tx, cam.ty, cam.tz);
        if (G._rays) G._rays.quaternion.copy(camera.quaternion);

        /* --- floating labels --- */
        for (var j=0;j<parts.length;j++){
          var el = tags[j];
          var show = screen === "intro" && explode > .35 && (mobile ? focusIdx === j : focusIdx >= 0);
          if (!show){ el.style.opacity = "0"; continue; }
          v3.set(W*.46,0,0).applyMatrix4(parts[j].meshes[0].matrixWorld).project(camera);
          el.style.transform = "translate("+((v3.x*.5+.5)*window.innerWidth+46)+"px,"+((-v3.y*.5+.5)*window.innerHeight)+"px) translate(-50%,-50%)";
          el.style.opacity = focusIdx === j ? "1" : ".34";
        }
        for (var q=0;q<3;q++){
          var et = ecoTags[q];
          if (vis.eco < .35 || screen !== "intro"){ et.style.opacity = "0"; continue; }
          vTmp.copy(ecoAnchors[q]).project(camera);
          et.querySelector("span").textContent = ECO_LABELS[q][lang];
          et.style.transform = "translate("+((vTmp.x*.5+.5)*window.innerWidth)+"px,"+((-vTmp.y*.5+.5)*window.innerHeight)+"px) translate(-50%,-50%)";
          et.style.opacity = (vis.eco*(q===1?1:.85)).toFixed(2);
        }

        // while idle, fade the panel out as the host page scrolls (and stop drawing)
        if (screen !== "intro" && CONFIG.fadeOnScroll){
          var f = Math.max(0, 1 - window.scrollY/CONFIG.fadeOnScroll);
          stage.style.opacity = f.toFixed(3);
          if (f <= .01) return;
        } else { stage.style.opacity = screen === "intro" ? "1" : ""; }

        renderer.render(scene, camera);
      })();
    })();
  }

  /* ==========================================================
     8 · language + boot
     ========================================================== */
  function paintText(){
    var ar = lang === "ar";
    root.setAttribute("dir", ar ? "rtl" : "ltr");
    root.setAttribute("lang", ar ? "ar" : "en");
    root.querySelectorAll(".js-lang").forEach(function(b){ b.textContent = ar ? "English" : "العربية"; });
    root.querySelectorAll("[data-en]").forEach(function(el){
      var v = el.getAttribute(ar ? "data-ar" : "data-en");
      if (v != null) el.textContent = v;
    });
    railBtns.forEach(function(b,i){ b.querySelector(".name").textContent = LAYERS[i][lang][0]; });
    tags.forEach(function(t,i){ t.querySelector("span").textContent = LAYERS[i][lang][0]; });
    paintJourney();
    if (focusIdx >= 0) showLayer(focusIdx);
    else if (playing && SCRIPTED[pi].cap != null) showStory(SCRIPTED[pi].cap);
  }
  root.querySelectorAll(".js-lang").forEach(function(b){
    b.addEventListener("click", function(){ lang = lang === "en" ? "ar" : "en"; paintText(); if (opts.onLanguage) opts.onLanguage(lang); });
  });

  $("skip").addEventListener("click", function(){ setPhase(SCRIPTED.length-1); });
  on(window, "keydown", function(e){
    if (e.key === "Escape" && playing) setPhase(SCRIPTED.length-1);
  });

  /* ---- public API ---- */
  API.play        = function(){ startIntro(); };
  API.replay      = function(i){ replayIntro(i); };
  API.goTo        = function(i){ replayIntro(i); };
  API.skip        = function(){ setPhase(SCRIPTED.length-1); };
  API.setLanguage = function(l){ lang = l === "ar" ? "ar" : "en"; paintText(); };
  API.isPlaying   = function(){ return playing; };
  API.dispose     = function(){
    disposed = true; cancelAnimationFrame(rafId);
    offs.forEach(function(f){ f(); });
    document.body.classList.remove("intro-running");
    if (renderer) renderer.dispose();
  };

  paintText();


  if ((reduced && CONFIG.respectReducedMotion) || !has3D) finishToApp();
  else if (CONFIG.autoplay) setTimeout(startIntro, CONFIG.autoplayDelayMs);
  else setScreen("idle");
  return API;
}
