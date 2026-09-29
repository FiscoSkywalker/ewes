export const waterVertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uWaveHeight;
  uniform float uFrequency;
  uniform sampler2D uHeightMap;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vElevation;

  // Classic Simplex-style 2D noise approximation
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Houle de base (grosses vagues + clapot fin). Évaluée plusieurs fois par
  // sommet pour en dériver une normale : sans cela les vagues déplacent la
  // géométrie mais n'influencent jamais l'éclairage.
  float swell(vec2 p, float t) {
    float w1 = sin(p.x * uFrequency * 0.9 + t * 0.9) * cos(p.y * uFrequency * 0.75 + t * 1.1);
    float w2 = sin(p.x * uFrequency * 1.8 - t * 0.6) * cos(p.y * uFrequency * 1.4 + t * 0.8) * 0.35;
    float w3 = sin((p.x + p.y) * uFrequency * 3.1 + t * 1.7) * 0.14;
    return (w1 + w2 + w3) * uWaveHeight;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    float t = uTime * uSpeed;
    float microChop = snoise(pos.xy * 1.1 + vec2(t * 0.4, t * 0.25)) * 0.18 * uWaveHeight * 4.0;

    vec2 texel = vec2(1.0 / 128.0);
    float simulatedHeight = texture2D(uHeightMap, uv).r;
    float hL = texture2D(uHeightMap, uv - vec2(texel.x, 0.0)).r;
    float hR = texture2D(uHeightMap, uv + vec2(texel.x, 0.0)).r;
    float hD = texture2D(uHeightMap, uv - vec2(0.0, texel.y)).r;
    float hU = texture2D(uHeightMap, uv + vec2(0.0, texel.y)).r;

    float elevation = swell(pos.xy, t) + microChop + simulatedHeight * 0.52;
    pos.z += elevation;

    vElevation = elevation;
    vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

    float eps = 0.06;
    float dSwellX = swell(pos.xy + vec2(eps, 0.0), t) - swell(pos.xy - vec2(eps, 0.0), t);
    float dSwellY = swell(pos.xy + vec2(0.0, eps), t) - swell(pos.xy - vec2(0.0, eps), t);
    vec3 computedNormal = normalize(vec3(
      (hL - hR) * 13.0 - dSwellX / (2.0 * eps) * 1.6,
      (hD - hU) * 13.0 - dSwellY / (2.0 * eps) * 1.6,
      1.0
    ));

    vNormal = normalize(mat3(modelMatrix) * computedNormal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const waterFragmentShader = `
  uniform vec3 uDeepColor;
  uniform vec3 uSurfaceColor;
  uniform vec3 uFoamColor;
  uniform float uElevationMultiplier;
  uniform float uOpacity;
  uniform vec3 uLightPosition;
  uniform float uTime;
  uniform sampler2D uNormalMap;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vElevation;

  // Toutes les couleurs sont exprimées directement en espace d'affichage
  // (sRGB) : ce shader n'applique aucune conversion de sortie.
  const vec3 HORIZON_COLOR = vec3(0.835, 0.894, 0.918); // = fond du site (#d5e4ea)

  vec3 skyColor(vec3 dir) {
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 horizon = vec3(0.88, 0.95, 0.98);
    vec3 zenith = vec3(0.30, 0.62, 0.86);
    return mix(horizon, zenith, pow(h, 0.5));
  }

  void main() {
    // Trois couches de micro-relief qui dérivent dans des directions
    // différentes : c'est ce qui donne le scintillement « vivant » de l'eau.
    vec2 uvA = vUv * 6.0 + vec2(uTime * 0.020, uTime * 0.012);
    vec2 uvB = vUv * 13.0 + vec2(-uTime * 0.015, uTime * 0.024);
    vec2 uvC = vUv * 3.0 + vec2(uTime * 0.008, -uTime * 0.010);
    vec3 nA = texture2D(uNormalMap, uvA).xyz * 2.0 - 1.0;
    vec3 nB = texture2D(uNormalMap, uvB).xyz * 2.0 - 1.0;
    vec3 nC = texture2D(uNormalMap, uvC).xyz * 2.0 - 1.0;
    vec2 detail = nA.xy * 0.55 + nB.xy * 0.35 + nC.xy * 0.45;

    // Le plan est presque horizontal : l'axe « haut » du monde est Y, donc le
    // relief de détail se répartit sur X et Z.
    vec3 normal = normalize(vNormal + vec3(detail.x, 0.0, detail.y));

    vec3 V = normalize(cameraPosition - vPosition);
    vec3 L = normalize(uLightPosition - vPosition);
    vec3 R = reflect(-V, normal);

    // Fresnel (légèrement exagéré pour que le ciel se lise bien à l'écran).
    float cosTheta = clamp(dot(V, normal), 0.0, 1.0);
    float fresnel = 0.05 + 0.95 * pow(1.0 - cosTheta, 3.6);

    // Couleur du corps de l'eau : profond -> turquoise, plus clair sur les
    // crêtes qui laissent passer la lumière (diffusion sous la surface).
    float depth = smoothstep(-0.35, 0.45, vElevation * uElevationMultiplier);
    vec3 body = mix(uDeepColor, uSurfaceColor, 0.25 + depth * 0.6);
    float scatter = pow(clamp(dot(normal, L) * 0.5 + 0.5, 0.0, 1.0), 2.0);
    body += uSurfaceColor * scatter * 0.14;

    vec3 color = mix(body, skyColor(R), fresnel);

    // Éclats de soleil : un reflet net + un halo large, modulés par le
    // micro-relief, d'où les paillettes qui bougent.
    float sun = max(dot(R, L), 0.0);
    float glint = pow(sun, 220.0) * 1.7 + pow(sun, 28.0) * 0.16;
    color += vec3(1.0, 0.97, 0.90) * glint;

    // Caustiques : réseau de lignes lumineuses (deux couches qui se croisent).
    float web = pow(clamp(dot(nA.xy, nB.xy) * 0.5 + 0.5, 0.0, 1.0), 7.0);
    color += vec3(0.75, 0.96, 1.0) * web * 0.30 * (1.0 - fresnel);

    // Écume légère sur les crêtes et là où l'eau est agitée.
    float foam = smoothstep(0.16, 0.34, vElevation + nB.x * 0.05);
    color = mix(color, uFoamColor, foam * 0.5);

    // Fondu vers l'horizon et sur les bords : aucune arête visible.
    float dist = distance(cameraPosition, vPosition);
    color = mix(color, HORIZON_COLOR, smoothstep(6.5, 13.0, dist) * 0.75);
    vec2 edge = min(vUv, 1.0 - vUv);
    float edgeFade = smoothstep(0.0, 0.14, min(edge.x, edge.y));

    gl_FragColor = vec4(color, uOpacity * edgeFade);
  }
`;

export const heightfieldFragmentShader = `
  uniform vec2 uMouse;
  uniform float uMouseSize;
  uniform float uMouseStrength;

  void main() {
    vec2 cell = vec2(1.0 / resolution.x, 1.0 / resolution.y);
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 info = texture2D(heightfield, uv);

    float average =
      texture2D(heightfield, uv + vec2(cell.x, 0.0)).r +
      texture2D(heightfield, uv - vec2(cell.x, 0.0)).r +
      texture2D(heightfield, uv + vec2(0.0, cell.y)).r +
      texture2D(heightfield, uv - vec2(0.0, cell.y)).r;
    average *= 0.25;

    float velocity = info.g + (average - info.r) * 1.86;
    velocity *= 0.982;
    float height = info.r + velocity;

    vec2 point = (uv - 0.5) * 2.0;
    float distanceToPointer = distance(point, uMouse);
    float impulse = exp(-distanceToPointer * distanceToPointer * uMouseSize);
    height += impulse * uMouseStrength;

    gl_FragColor = vec4(height, velocity, 0.0, 1.0);
  }
`;
