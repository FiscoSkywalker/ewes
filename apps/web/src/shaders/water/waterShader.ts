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

  void main() {
    vUv = uv;
    vec3 pos = position;

    float t = uTime * uSpeed;
    // Multi-octave natural swell (avoiding rigid geometric patterns)
    float wave1 = sin(pos.x * uFrequency * 0.9 + t * 0.9) * cos(pos.y * uFrequency * 0.75 + t * 1.1);
    float wave2 = sin(pos.x * uFrequency * 1.8 - t * 0.6) * cos(pos.y * uFrequency * 1.4 + t * 0.8) * 0.35;
    float microChop = snoise(pos.xy * 1.1 + vec2(t * 0.4, t * 0.25)) * 0.18;

    vec2 texel = vec2(1.0 / 128.0);
    float simulatedHeight = texture2D(uHeightMap, uv).r;
    float hL = texture2D(uHeightMap, uv - vec2(texel.x, 0.0)).r;
    float hR = texture2D(uHeightMap, uv + vec2(texel.x, 0.0)).r;
    float hD = texture2D(uHeightMap, uv - vec2(0.0, texel.y)).r;
    float hU = texture2D(uHeightMap, uv + vec2(0.0, texel.y)).r;

    float elevation = (wave1 + wave2 + microChop) * uWaveHeight + simulatedHeight * 0.52;
    pos.z += elevation;

    vElevation = elevation;
    vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

    vec3 computedNormal = normalize(vec3((hL - hR) * 13.0, (hD - hU) * 13.0, 1.0));

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

  void main() {
    vec3 normal = normalize(vNormal);
    vec2 normalUvA = vUv * 4.0 + vec2(uTime * 0.015, uTime * 0.01);
    vec2 normalUvB = vUv * 7.0 + vec2(-uTime * 0.01, uTime * 0.018);
    vec3 detailA = texture2D(uNormalMap, normalUvA).xyz * 2.0 - 1.0;
    vec3 detailB = texture2D(uNormalMap, normalUvB).xyz * 2.0 - 1.0;
    normal = normalize(normal + vec3(detailA.xy + detailB.xy, 0.0) * 0.12);
    vec3 lightDir = normalize(uLightPosition - vPosition);
    vec3 viewDir = normalize(cameraPosition - vPosition);

    // Physically-plausible Schlick Fresnel approximation for water (F0 ~ 0.02 for water-air interface)
    float cosTheta = clamp(dot(viewDir, normal), 0.0, 1.0);
    float F0 = 0.02;
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 4.5);

    // Beer-Lambert style depth absorption (realistic mineral tones instead of neon)
    float depthFactor = smoothstep(-0.35, 0.45, vElevation * uElevationMultiplier);
    vec3 refractedGround = vec3(0.035, 0.18, 0.15);
    vec3 waterBody = mix(uDeepColor, uSurfaceColor, depthFactor);
    waterBody = mix(refractedGround, waterBody, 0.74);

    // Natural sun specular highlight
    vec3 halfVector = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfVector), 0.0);
    float specular = pow(NdotH, 96.0) * 0.75;

    // Sky dome reflection (soft cool ambient reflection at grazing angles)
    vec3 skyReflection = mix(vec3(0.25, 0.48, 0.52), vec3(0.78, 0.9, 0.94), fresnel);

    // Subtle micro-foam only on highest turbulent crests
    float foamThreshold = smoothstep(0.28, 0.45, vElevation);
    vec3 finalColor = mix(waterBody, uFoamColor, foamThreshold * 0.4);

    finalColor = mix(finalColor, skyReflection, fresnel * 0.72);
    finalColor += vec3(specular) * vec3(1.0, 0.98, 0.92); // Warm sunlight highlight

    // Lightweight caustic response: two moving wave fields concentrate warm light.
    float causticA = sin((vUv.x + detailA.x * 0.05) * 48.0 + uTime * 0.7);
    float causticB = sin((vUv.y + detailB.y * 0.05) * 52.0 - uTime * 0.55);
    float caustic = pow(max(0.0, causticA * causticB), 5.0) * (1.0 - fresnel);
    finalColor += vec3(0.34, 0.45, 0.28) * caustic * 0.18;

    gl_FragColor = vec4(finalColor, uOpacity);
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
