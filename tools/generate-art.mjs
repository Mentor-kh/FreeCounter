import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const WIDTH = 1440;
const HEIGHT = 2160;
const THUMB_WIDTH = 360;
const OUT_DIR = 'public/themes';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createNoise(seed) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 0.7;
  };
  const fbm = (x, y, octaves = 5) => {
    let sum = 0;
    let amp = 0.5;
    let fx = x;
    let fy = y;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(fx, fy);
      const nx = fx * 1.6 - fy * 1.2;
      fy = fx * 1.2 + fy * 1.6;
      fx = nx;
      amp *= 0.5;
    }
    return sum;
  };
  return { noise, fbm, rand };
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

function ramp(stops) {
  const parsed = stops.map(([t, c]) => [t, hex(c)]);
  return (t) => {
    const x = clamp01(t);
    for (let i = 1; i < parsed.length; i++) {
      if (x <= parsed[i][0]) {
        const [t0, c0] = parsed[i - 1];
        const [t1, c1] = parsed[i];
        const k = (x - t0) / (t1 - t0 || 1);
        return [mix(c0[0], c1[0], k), mix(c0[1], c1[1], k), mix(c0[2], c1[2], k)];
      }
    }
    return parsed[parsed.length - 1][1];
  };
}

function cosinePalette(t, a, b, c, d) {
  return [0, 1, 2].map((i) => a[i] + b[i] * Math.cos(6.28318 * (c[i] * t + d[i])));
}

function stars(rand, count, minR, maxR) {
  return Array.from({ length: count }, () => ({
    x: rand() * WIDTH,
    y: rand() * HEIGHT,
    r: mix(minR, maxR, rand() ** 3),
    a: mix(0.35, 1, rand()),
  }));
}

function paintStars(buffer, list, tint = [1, 1, 1]) {
  for (const s of list) {
    const reach = Math.ceil(s.r * 4);
    for (let y = Math.max(0, Math.floor(s.y - reach)); y < Math.min(HEIGHT, s.y + reach); y++) {
      for (let x = Math.max(0, Math.floor(s.x - reach)); x < Math.min(WIDTH, s.x + reach); x++) {
        const d = Math.hypot(x - s.x, y - s.y) / s.r;
        const glow = s.a * (Math.exp(-d * d * 2) + 0.18 * Math.exp(-d * 0.9));
        if (glow < 0.004) continue;
        const i = (y * WIDTH + x) * 3;
        for (let k = 0; k < 3; k++) buffer[i + k] = buffer[i + k] + (tint[k] - buffer[i + k]) * clamp01(glow);
      }
    }
  }
}

function render(shader) {
  const buffer = new Float32Array(WIDTH * HEIGHT * 3);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      const c = shader(u, v, x, y);
      const i = (y * WIDTH + x) * 3;
      buffer[i] = c[0];
      buffer[i + 1] = c[1];
      buffer[i + 2] = c[2];
    }
  }
  return buffer;
}

function vignette(buffer, strength) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const dx = x / WIDTH - 0.5;
      const dy = y / HEIGHT - 0.45;
      const k = 1 - strength * smooth(0.25, 0.85, Math.hypot(dx * 1.3, dy));
      const i = (y * WIDTH + x) * 3;
      buffer[i] *= k;
      buffer[i + 1] *= k;
      buffer[i + 2] *= k;
    }
  }
}

function grain(buffer, rand, amount) {
  for (let i = 0; i < buffer.length; i += 3) {
    const n = (rand() - 0.5) * amount;
    buffer[i] += n;
    buffer[i + 1] += n;
    buffer[i + 2] += n;
  }
}

async function save(id, buffer) {
  const bytes = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let i = 0; i < buffer.length; i++) {
    bytes[i] = Math.round(clamp01(buffer[i]) * 255);
  }
  const dir = join(OUT_DIR, id);
  await mkdir(dir, { recursive: true });
  const image = sharp(bytes, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } });
  await image.clone().webp({ quality: 82, effort: 5 }).toFile(join(dir, 'art.webp'));
  await image.clone().resize({ width: THUMB_WIDTH }).webp({ quality: 78 }).toFile(join(dir, 'thumb.webp'));
  console.log(`saved ${id}`);
}

const ASPECT = HEIGHT / WIDTH;

const ARTWORKS = {
  psychedelic() {
    const { fbm, rand } = createNoise(7);
    const buffer = render((u, v) => {
      const px = u * 1.15;
      const py = v * 1.15 * ASPECT;
      const qx = fbm(px, py);
      const qy = fbm(px + 5.2, py + 1.3);
      const rx = fbm(px + 4 * qx + 1.7, py + 4 * qy + 9.2);
      const ry = fbm(px + 4 * qx + 8.3, py + 4 * qy + 2.8);
      const f = fbm(px + 4 * rx, py + 4 * ry);
      const ring = Math.sin(Math.hypot(u - 0.5, (v - 0.44) * ASPECT) * 26 + f * 9);
      const t = f * 1.4 + rx * 0.6 + ring * 0.08;
      const c = cosinePalette(t, [0.55, 0.45, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0.0, 0.33, 0.67]);
      const shade = 0.55 + 0.45 * smooth(-0.6, 0.6, f + ry * 0.5);
      return [c[0] * shade * 1.05, c[1] * shade * 0.92, c[2] * shade * 1.08];
    });
    vignette(buffer, 0.45);
    grain(buffer, rand, 0.03);
    return buffer;
  },

  latte() {
    const { fbm, rand } = createNoise(21);
    const palette = ramp([
      [0, '#2a170e'],
      [0.28, '#5b3520'],
      [0.5, '#a06a42'],
      [0.7, '#d7b48f'],
      [0.86, '#f2e2cc'],
      [1, '#fff8ee'],
    ]);
    const buffer = render((u, v) => {
      const dx = u - 0.5;
      const dy = (v - 0.44) * ASPECT;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const swirl = a + r * 7 + fbm(u * 3, v * 3 * ASPECT) * 2.4;
      const marble = Math.sin(swirl * 3 + fbm(u * 1.4 + 3, v * 1.4 * ASPECT) * 6);
      const foam = smooth(0.62, 0.05, r) * 0.55;
      const t = 0.5 + marble * 0.28 + foam - smooth(0.4, 1.1, r) * 0.35;
      return palette(t + fbm(u * 18, v * 18) * 0.04);
    });
    vignette(buffer, 0.35);
    grain(buffer, rand, 0.025);
    return buffer;
  },

  nebula() {
    const { fbm, rand } = createNoise(33);
    const palette = ramp([
      [0, '#05040f'],
      [0.35, '#1a0f45'],
      [0.55, '#4b1d8f'],
      [0.72, '#9a3fd6'],
      [0.86, '#f07ad8'],
      [1, '#ffe3fb'],
    ]);
    const buffer = render((u, v) => {
      const px = u * 2.4;
      const py = v * 2.4 * ASPECT;
      const w = fbm(px + 2, py + 7);
      const cloud = fbm(px + w * 2.2, py - w * 1.6, 6);
      const core = Math.exp(-((u - 0.55) ** 2 * 6 + ((v - 0.42) * ASPECT) ** 2 * 3));
      const t = clamp01(0.32 + cloud * 0.9 + core * 0.35);
      const c = palette(t * t * 1.15);
      const blue = smooth(0.2, -0.4, w) * 0.25;
      return [c[0], c[1] + blue * 0.3, c[2] + blue];
    });
    paintStars(buffer, stars(rand, 900, 0.6, 3.2));
    vignette(buffer, 0.4);
    grain(buffer, rand, 0.02);
    return buffer;
  },

  matcha() {
    const { fbm, rand } = createNoise(48);
    const palette = ramp([
      [0, '#1f3a1d'],
      [0.25, '#3f6b2f'],
      [0.5, '#7fa65a'],
      [0.72, '#c3d8a0'],
      [0.88, '#eef2dc'],
      [1, '#fbfaf2'],
    ]);
    const buffer = render((u, v) => {
      const warp = fbm(u * 1.6, v * 1.6 * ASPECT) * 2.2;
      const wave = Math.sin((v * ASPECT * 3.2 + warp + Math.sin(u * 3.1 + warp) * 0.6) * 3.14159);
      const silk = 0.56 + wave * 0.2 + fbm(u * 4, v * 4 * ASPECT) * 0.12;
      const highlight = Math.pow(clamp01(wave), 12) * 0.25;
      return palette(silk + highlight);
    });
    vignette(buffer, 0.3);
    grain(buffer, rand, 0.025);
    return buffer;
  },

  cyber() {
    const { fbm, rand } = createNoise(64);
    const sky = ramp([
      [0, '#07021a'],
      [0.45, '#2a0a52'],
      [0.75, '#7a1474'],
      [1, '#ff4fa3'],
    ]);
    const horizon = 0.6;
    const sunY = 0.43;
    const sunR = 0.27;
    const buffer = render((u, v) => {
      if (v < horizon) {
        const base = sky(v / horizon);
        const dx = (u - 0.5) / sunR;
        const dy = ((v - sunY) * ASPECT) / sunR;
        const d = Math.hypot(dx, dy);
        const haze = fbm(u * 3, v * 3) * 0.05;
        if (d < 1) {
          const k = (v - (sunY - sunR / ASPECT)) / ((sunR * 2) / ASPECT);
          const stripe = k > 0.45 && Math.sin(k * k * 70) > 0.35 - k * 0.6;
          const sun = ramp([[0, '#ffe66b'], [0.5, '#ff8a3d'], [1, '#ff2f8c']])(k);
          return stripe ? [base[0] + haze, base[1], base[2] + haze] : sun;
        }
        const glow = Math.exp(-(d - 1) * 3.2) * 0.55;
        return [base[0] + glow * 1, base[1] + glow * 0.25, base[2] + glow * 0.45 + haze];
      }
      const depth = (v - horizon) / (1 - horizon);
      const z = 1 / (depth + 0.02);
      const gx = (u - 0.5) * z * 2.2;
      const gz = z * 1.4;
      const lineX = Math.exp(-Math.abs(gx - Math.round(gx)) * 34 / z ** 0.5);
      const lineZ = Math.exp(-Math.abs(gz - Math.round(gz)) * 26 / z ** 0.55);
      const line = Math.max(lineX, lineZ) * smooth(0, 0.25, depth);
      const floor = mix(0.02, 0.09, depth);
      const horizonGlow = Math.exp(-depth * 9) * 0.65;
      return [floor + line * 0.15 + horizonGlow, floor * 0.6 + line * 0.95 + horizonGlow * 0.2, floor * 1.8 + line + horizonGlow * 0.6];
    });
    const sky_stars = stars(rand, 420, 0.6, 2.4).filter((s) => s.y < HEIGHT * 0.36);
    paintStars(buffer, sky_stars);
    grain(buffer, rand, 0.025);
    return buffer;
  },

  aurora() {
    const { fbm, noise, rand } = createNoise(91);
    const buffer = render((u, v) => {
      const sky = [mix(0.01, 0.05, v), mix(0.02, 0.1, v), mix(0.06, 0.16, v)];
      let r = sky[0];
      let g = sky[1];
      let b = sky[2];
      for (let layer = 0; layer < 3; layer++) {
        const center = 0.26 + layer * 0.1 + fbm(u * 1.2 + layer * 3, layer) * 0.32 + Math.sin(u * 4 + layer) * 0.05;
        const dist = (v - center) * ASPECT;
        const curtain = 1.7 * Math.exp(-((dist / (0.15 + layer * 0.04)) ** 2)) * (dist > 0 ? 1 : 0.35 + 0.65 * Math.exp(dist * 18));
        const streak = 0.55 + 0.45 * noise(u * 70 + layer * 11, v * 2);
        const k = curtain * streak * (0.9 - layer * 0.18);
        const hueMix = smooth(-0.15, 0.25, -dist + layer * 0.05);
        r += k * mix(0.15, 0.75, hueMix * (layer === 2 ? 1 : 0.45));
        g += k * mix(1.0, 0.35, hueMix);
        b += k * mix(0.55, 0.95, hueMix);
      }
      const ridge = 0.86 + fbm(u * 3.5, 1.7) * 0.07 + Math.abs(noise(u * 9, 4)) * 0.02;
      if (v > ridge) {
        return [0.01, 0.015, 0.03];
      }
      return [r, g, b];
    });
    const sky_stars = stars(rand, 700, 0.5, 2.6).filter((s) => s.y < HEIGHT * 0.8);
    paintStars(buffer, sky_stars);
    vignette(buffer, 0.35);
    grain(buffer, rand, 0.02);
    return buffer;
  },
};

const only = process.argv.slice(2);
for (const [id, paint] of Object.entries(ARTWORKS)) {
  if (only.length > 0 && !only.includes(id)) continue;
  const started = Date.now();
  await save(id, paint());
  console.log(`${id}: ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
