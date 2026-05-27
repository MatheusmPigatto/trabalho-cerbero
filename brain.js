/* Procedural 3D brain for "Morte Encefálica" site.
   Six clickable regions: frontal, parietal, temporal, occipital, cerebelo, tronco.
   Exposes window.BrainViz with { mount, setRegion, setRotationY, dispose, on }.
*/
(function () {
  const REGIONS = {
    frontal:   { label: 'Lobo Frontal',     color: 0x76d3c4, accent: 0xa8f0e3 },
    parietal:  { label: 'Lobo Parietal',    color: 0x6fb8d4, accent: 0xa4dff0 },
    temporal:  { label: 'Lobo Temporal',    color: 0xc9a273, accent: 0xeac79b },
    occipital: { label: 'Lobo Occipital',   color: 0x8a7fb8, accent: 0xb8aee0 },
    cerebelo:  { label: 'Cerebelo',         color: 0xb87f8a, accent: 0xe0adba },
    tronco:    { label: 'Tronco Encefálico',color: 0xd97757, accent: 0xf0a587 },
  };

  // -------- noise: simple value-noise based on hashed gradients --------
  function hash(x, y, z) {
    let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = smooth(xf), v = smooth(yf), w = smooth(zf);
    function l(a, b, t) { return a + (b - a) * t; }
    const c000 = hash(xi, yi, zi);
    const c100 = hash(xi+1, yi, zi);
    const c010 = hash(xi, yi+1, zi);
    const c110 = hash(xi+1, yi+1, zi);
    const c001 = hash(xi, yi, zi+1);
    const c101 = hash(xi+1, yi, zi+1);
    const c011 = hash(xi, yi+1, zi+1);
    const c111 = hash(xi+1, yi+1, zi+1);
    const x00 = l(c000, c100, u), x10 = l(c010, c110, u);
    const x01 = l(c001, c101, u), x11 = l(c011, c111, u);
    const y0 = l(x00, x10, v), y1 = l(x01, x11, v);
    return l(y0, y1, w);
  }
  function fbm(x, y, z) {
    let a = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < 4; i++) {
      a += amp * (noise3(x*freq, y*freq, z*freq) - 0.5);
      amp *= 0.5; freq *= 2.1;
    }
    return a;
  }

  // Decide region from squished/oriented vertex position (anatomical axes)
  // x: left(-)/right(+) ; y: down(-)/up(+) ; z: back(-)/front(+)
  function regionForVertex(x, y, z) {
    if (y < -0.55 && z < 0.2) return 'tronco';
    if (y < -0.25 && z < -0.05) return 'cerebelo';
    if (z > 0.45) return 'frontal';
    if (z < -0.45) return 'occipital';
    if (y > 0.25) return 'parietal';
    return 'temporal';
  }

  function hexToVec3(hex) {
    return [((hex>>16)&255)/255, ((hex>>8)&255)/255, (hex&255)/255];
  }

  function buildCerebrum(THREE, opts) {
    // Two hemispheres joined; squished sphere with noise displacement (sulci).
    const geo = new THREE.SphereGeometry(1, 160, 120);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const regionAttr = new Float32Array(pos.count); // store region id per-vertex
    const regionIds = ['frontal','parietal','temporal','occipital','cerebelo','tronco'];

    const tmp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i);
      let x = tmp.x, y = tmp.y, z = tmp.z;
      // brain shape: longer front-back (Z), narrower side-to-side (X), squashed top-bottom (Y)
      let X = x * 0.88;
      let Y = y * 0.74;
      let Z = z * 1.28;
      // taper the front (frontal lobe rounds off) and back (occipital tucks)
      const zNorm = Z / 1.28; // -1..1
      const frontTaper = zNorm > 0.6 ? (1 - (zNorm - 0.6) * 0.6) : 1;
      const backTaper  = zNorm < -0.55 ? (1 - (-zNorm - 0.55) * 0.4) : 1;
      X *= frontTaper * backTaper;
      Y *= frontTaper * backTaper;
      // flatten the underside (temporal lobes hang lower at the sides)
      if (Y < -0.15) Y = -0.15 + (Y + 0.15) * 0.85;

      // primary sulci/gyri via fbm — multiple frequencies for organic detail
      const n1 = fbm(X*4.5, Y*4.5, Z*4.5);
      const n2 = fbm(X*9, Y*9, Z*9) * 0.5;
      const noiseDisp = (n1 + n2) * 0.16;

      // longitudinal fissure between hemispheres (along x=0 plane on top)
      let fissure = 0;
      const dxMid = Math.abs(X);
      if (dxMid < 0.1 && Y > -0.1) fissure = -0.10 * (1 - dxMid/0.1) * Math.min(1, (Y + 0.1) / 0.3);
      // central sulcus (Rolandic) — runs across the top, separating frontal/parietal
      const cs = -0.04 * Math.exp(-Math.pow((Z + 0.02)*8, 2)) * Math.max(0, Y - 0.1);
      // lateral (Sylvian) fissure on each side — separates temporal lobe
      const sylv = -0.06 * Math.exp(-Math.pow((Y + 0.05)*5, 2)) * Math.exp(-Math.pow(Z*1.5, 2)) * (Math.abs(X) > 0.4 ? 1 : 0);

      const disp = noiseDisp + fissure + cs + sylv;
      // displace along radial direction
      const len = Math.sqrt(X*X + Y*Y + Z*Z) || 1;
      X += (X / len) * disp;
      Y += (Y / len) * disp;
      Z += (Z / len) * disp;

      pos.setXYZ(i, X, Y, Z);

      // region using normalized "anatomical" coords
      const region = regionForVertex(X, Y, Z);
      regionAttr[i] = regionIds.indexOf(region);
      const c = hexToVec3(REGIONS[region].color);
      colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.userData.regionAttr = regionAttr;
    geo.userData.regionIds = regionIds;
    geo.computeVertexNormals();
    return geo;
  }

  function buildCerebellum(THREE) {
    const geo = new THREE.SphereGeometry(0.42, 64, 48);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const regionAttr = new Float32Array(pos.count);
    const regionIds = ['frontal','parietal','temporal','occipital','cerebelo','tronco'];
    const c = hexToVec3(REGIONS.cerebelo.color);
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      x *= 1.45; y *= 0.72; z *= 1.0;
      // foliae: fine horizontal ridges typical of cerebellum
      const ridges = Math.sin(y * 38) * 0.04;
      const n = fbm(x*4, y*4, z*4) * 0.07;
      const len = Math.sqrt(x*x+y*y+z*z) || 1;
      x += (x/len) * (ridges + n);
      y += (y/len) * (ridges*0.3 + n);
      z += (z/len) * (ridges*0.4 + n);
      pos.setXYZ(i, x, y, z);
      colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
      regionAttr[i] = regionIds.indexOf('cerebelo');
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.userData.regionAttr = regionAttr;
    geo.userData.regionIds = regionIds;
    geo.computeVertexNormals();
    return geo;
  }

  function buildBrainstem(THREE) {
    const geo = new THREE.CylinderGeometry(0.16, 0.11, 0.55, 32, 24, true);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const regionAttr = new Float32Array(pos.count);
    const regionIds = ['frontal','parietal','temporal','occipital','cerebelo','tronco'];
    const c = hexToVec3(REGIONS.tronco.color);
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // gentle pons bulge in front
      const bulge = Math.exp(-Math.pow((y - 0.05)*3, 2)) * 0.05;
      if (z > 0) z += bulge;
      pos.setXYZ(i, x, y, z);
      colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
      regionAttr[i] = regionIds.indexOf('tronco');
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.userData.regionAttr = regionAttr;
    geo.userData.regionIds = regionIds;
    geo.computeVertexNormals();
    return geo;
  }

  // ---- main module ----
  function mount(container, options = {}) {
    const THREE = window.THREE;
    if (!THREE) { console.error('THREE not loaded'); return null; }

    const scene = new THREE.Scene();
    const w = () => container.clientWidth;
    const h = () => container.clientHeight;
    const camera = new THREE.PerspectiveCamera(35, w()/h(), 0.1, 100);
    camera.position.set(0, 0.05, 4.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h());
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // lights
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(amb);
    const key = new THREE.DirectionalLight(0xeaf6ff, 1.1);
    key.position.set(2, 2.5, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x76d3c4, 0.55);
    rim.position.set(-3, 1, -2);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd97757, 0.18);
    fill.position.set(0, -3, 1);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    // shared material (vertex colors). Slight emissive bias for depth.
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.48,
      metalness: 0.08,
      flatShading: false,
      transparent: true,
      opacity: 0.97,
      emissive: 0x0a1620,
      emissiveIntensity: 0.5,
    });

    const cerebrumGeo = buildCerebrum(THREE);
    const cerebrum = new THREE.Mesh(cerebrumGeo, mat);
    cerebrum.scale.setScalar(1.05);
    group.add(cerebrum);

    const cerebellumGeo = buildCerebellum(THREE);
    const cerebellum = new THREE.Mesh(cerebellumGeo, mat.clone());
    cerebellum.position.set(0, -0.72, -0.62);
    cerebellum.scale.set(1.0, 1.0, 0.95);
    group.add(cerebellum);

    const stemGeo = buildBrainstem(THREE);
    const stem = new THREE.Mesh(stemGeo, mat.clone());
    stem.position.set(0, -1.00, -0.25);
    stem.rotation.x = 0.22;
    group.add(stem);

    // subtle wireframe overlay for "diagram" feel
    const wireGeo = new THREE.EdgesGeometry(cerebrumGeo, 14);
    const wireMat = new THREE.LineBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.10 });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    wire.scale.copy(cerebrum.scale);
    group.add(wire);

    // slight overall tilt for better 3/4 view
    group.position.y = 0.05;

    // store originals for highlight restore
    const meshes = [cerebrum, cerebellum, stem];
    meshes.forEach(m => {
      const colAttr = m.geometry.attributes.color;
      m.geometry.userData.baseColors = new Float32Array(colAttr.array);
    });

    let highlighted = null;
    function setRegion(region) {
      if (highlighted === region) return;
      highlighted = region;
      meshes.forEach(m => {
        const colAttr = m.geometry.attributes.color;
        const base = m.geometry.userData.baseColors;
        const regionAttr = m.geometry.userData.regionAttr;
        const ids = m.geometry.userData.regionIds;
        for (let i = 0; i < colAttr.count; i++) {
          const id = regionAttr[i];
          const rname = ids[id];
          const isMatch = rname === region;
          const isDim = region && !isMatch;
          let r = base[i*3], g = base[i*3+1], b = base[i*3+2];
          if (isMatch) {
            const ac = hexToVec3(REGIONS[rname].accent);
            r = ac[0]; g = ac[1]; b = ac[2];
          } else if (isDim) {
            r *= 0.32; g *= 0.32; b *= 0.34;
          }
          colAttr.array[i*3] = r;
          colAttr.array[i*3+1] = g;
          colAttr.array[i*3+2] = b;
        }
        colAttr.needsUpdate = true;
      });
      if (callbacks.onRegion) callbacks.onRegion(region);
    }

    // raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null;

    function pickRegion(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) return null;
      const hit = hits[0];
      const face = hit.face;
      const geo = hit.object.geometry;
      const regionAttr = geo.userData.regionAttr;
      const ids = geo.userData.regionIds;
      // pick majority of three face vertices
      const votes = {};
      for (const v of [face.a, face.b, face.c]) {
        const r = ids[regionAttr[v]];
        votes[r] = (votes[r] || 0) + 1;
      }
      let best = null, n = 0;
      for (const k in votes) if (votes[k] > n) { n = votes[k]; best = k; }
      return best;
    }

    function onMove(e) {
      const r = pickRegion(e);
      hovered = r;
      container.style.cursor = r ? 'pointer' : 'grab';
      if (callbacks.onHover) callbacks.onHover(r, e);
    }
    function onClick(e) {
      const r = pickRegion(e);
      if (r && callbacks.onClick) callbacks.onClick(r);
    }
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('pointerleave', () => {
      hovered = null;
      if (callbacks.onHover) callbacks.onHover(null);
    });

    // drag to rotate (manual)
    let isDragging = false, lastX = 0, lastY = 0;
    let userRotY = 0, userRotX = 0;
    renderer.domElement.addEventListener('pointerdown', (e) => {
      isDragging = true; lastX = e.clientX; lastY = e.clientY;
      container.style.cursor = 'grabbing';
    });
    window.addEventListener('pointerup', () => { isDragging = false; });
    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      userRotY += (e.clientX - lastX) * 0.005;
      userRotX += (e.clientY - lastY) * 0.005;
      userRotX = Math.max(-0.6, Math.min(0.6, userRotX));
      lastX = e.clientX; lastY = e.clientY;
    });

    // target rotation set by scroll
    let targetRotY = 0;
    let targetRotX = 0;
    function setRotation(rotY, rotX = 0) {
      targetRotY = rotY;
      targetRotX = rotX;
    }

    function onResize() {
      camera.aspect = w()/h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    }
    window.addEventListener('resize', onResize);

    let t0 = performance.now();
    let raf = 0;
    function animate(now) {
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      const driftY = now * 0.0001;
      const desiredY = targetRotY + userRotY + driftY;
      const desiredX = targetRotX + userRotX;
      group.rotation.y += (desiredY - group.rotation.y) * Math.min(1, dt * 4);
      group.rotation.x += (desiredX - group.rotation.x) * Math.min(1, dt * 4);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    const callbacks = {};
    function on(name, fn) { callbacks['on' + name[0].toUpperCase() + name.slice(1)] = fn; }

    function dispose() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    }

    return { setRegion, setRotation, dispose, on, REGIONS };
  }

  window.BrainViz = { mount, REGIONS };
})();
