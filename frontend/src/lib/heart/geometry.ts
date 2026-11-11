import { BufferGeometry, Float32BufferAttribute } from "three";

/**
 * A heart built in code from the implicit surface
 *
 *   (x^2 + 9/4 y^2 + z^2 - 1)^3 - x^2 z^3 - 9/80 y^2 z^3 = 0
 *
 * where z is up and y is the depth. A point is inside when the value is
 * negative. The surface is found by casting rays from inside the heart and
 * locating where each one leaves it, then the points are joined into a smooth
 * indexed mesh. No model file is involved.
 */
export function heartField(x: number, y: number, z: number): number {
  const a = x * x + 2.25 * y * y + z * z - 1;
  const z3 = z * z * z;
  return a * a * a - x * x * z3 - 0.1125 * y * y * z3;
}

/** Field value in scene axes: X across, Y up, Z towards the viewer. */
function field(px: number, py: number, pz: number): number {
  return heartField(px, pz, py);
}

/** Distance from `origin` along (dx, dy, dz) at which the heart ends. */
function surfaceDistance(
  origin: readonly [number, number, number],
  dx: number,
  dy: number,
  dz: number,
): number {
  const max = 2.2;
  const step = 0.02;
  const at = (r: number) =>
    field(origin[0] + dx * r, origin[1] + dy * r, origin[2] + dz * r);

  // Walk inwards from outside until the first point that is inside.
  let outer = max;
  while (outer > 0 && at(outer) >= 0) outer -= step;
  if (outer <= 0) return step;
  let lo = outer;
  let hi = outer + step;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type HeartGeometryOptions = {
  /** Number of steps around the vertical axis. */
  segments?: number;
  /** Number of steps from the top pole to the bottom pole. */
  rings?: number;
  /** Largest dimension of the finished heart, in scene units. */
  size?: number;
};

/**
 * Builds the heart mesh, centred on its bounding box and scaled so its
 * largest dimension equals `size`. Normals are smoothed across the surface.
 */
export function createHeartGeometry(
  options: HeartGeometryOptions = {},
): BufferGeometry {
  const { segments = 96, rings = 72, size = 2.3 } = options;
  const origin: [number, number, number] = [0, 0, 0.15];
  const positions: number[] = [];
  const indices: number[] = [];

  const push = (dx: number, dy: number, dz: number) => {
    const r = surfaceDistance(origin, dx, dy, dz);
    positions.push(origin[0] + dx * r, origin[1] + dy * r, origin[2] + dz * r);
  };

  // Vertex 0 is the top pole, then `rings - 1` rings, then the bottom pole.
  push(0, 1, 0);
  for (let i = 1; i < rings; i++) {
    const phi = (i / rings) * Math.PI;
    const ring = Math.sin(phi);
    const y = Math.cos(phi);
    for (let j = 0; j < segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      push(ring * Math.cos(theta), y, ring * Math.sin(theta));
    }
  }
  push(0, -1, 0);

  const bottom = 1 + (rings - 1) * segments;
  const ringStart = (i: number) => 1 + (i - 1) * segments;

  for (let j = 0; j < segments; j++) {
    const next = (j + 1) % segments;
    // Cap at the top pole, wound to face outwards.
    indices.push(0, ringStart(1) + next, ringStart(1) + j);
    // Cap at the bottom pole.
    indices.push(
      bottom,
      ringStart(rings - 1) + j,
      ringStart(rings - 1) + next,
    );
  }
  for (let i = 1; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const next = (j + 1) % segments;
      const a = ringStart(i) + j;
      const b = ringStart(i) + next;
      const c = ringStart(i + 1) + j;
      const d = ringStart(i + 1) + next;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const largest = Math.max(
    box.max.x - box.min.x,
    box.max.y - box.min.y,
    box.max.z - box.min.z,
  );
  geometry.translate(
    -(box.min.x + box.max.x) / 2,
    -(box.min.y + box.max.y) / 2,
    -(box.min.z + box.max.z) / 2,
  );
  geometry.scale(size / largest, size / largest, size / largest);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
