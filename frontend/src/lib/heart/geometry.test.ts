import { describe, expect, it } from "vitest";
import { createHeartGeometry, heartField } from "./geometry";

describe("heartField", () => {
  it("is negative inside and positive outside", () => {
    expect(heartField(0, 0, 0)).toBeLessThan(0);
    expect(heartField(2, 0, 0)).toBeGreaterThan(0);
    expect(heartField(0, 0, 2)).toBeGreaterThan(0);
  });
});

describe("createHeartGeometry", () => {
  const geometry = createHeartGeometry({ segments: 32, rings: 24, size: 2 });
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");

  it("has the expected number of vertices and triangles", () => {
    expect(position.count).toBe(2 + 23 * 32);
    expect(geometry.index!.count / 3).toBe(2 * 32 + 22 * 32 * 2);
  });

  it("has only finite positions and unit normals", () => {
    for (let i = 0; i < position.count; i++) {
      expect(Number.isFinite(position.getX(i))).toBe(true);
      expect(Number.isFinite(position.getY(i))).toBe(true);
      expect(Number.isFinite(position.getZ(i))).toBe(true);
      const length = Math.hypot(
        normal.getX(i),
        normal.getY(i),
        normal.getZ(i),
      );
      expect(length).toBeCloseTo(1, 3);
    }
  });

  it("is centred and scaled to the requested size", () => {
    const box = geometry.boundingBox!;
    const sizes = [
      box.max.x - box.min.x,
      box.max.y - box.min.y,
      box.max.z - box.min.z,
    ];
    expect(Math.max(...sizes)).toBeCloseTo(2, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(0, 5);
  });

  it("is a heart: wider than deep, with the tip below the lobes", () => {
    const box = geometry.boundingBox!;
    expect(box.max.x - box.min.x).toBeGreaterThan(box.max.z - box.min.z);
    // The lowest point is the tip, on the centre line.
    let lowest = 0;
    for (let i = 1; i < position.count; i++) {
      if (position.getY(i) < position.getY(lowest)) lowest = i;
    }
    expect(Math.abs(position.getX(lowest))).toBeLessThan(0.05);
  });

  it("has a cleft: the top centre is lower than the lobes", () => {
    let lobeTop = -Infinity;
    for (let i = 0; i < position.count; i++) {
      lobeTop = Math.max(lobeTop, position.getY(i));
    }
    // Top pole is vertex 0, on the centre line.
    expect(position.getY(0)).toBeLessThan(lobeTop - 0.1);
  });
});
