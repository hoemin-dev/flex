import { describe, expect, it } from "vitest";
import { calculateDockRect } from "./dock";

describe("calculateDockRect", () => {
  it("places Flex flush against MonaHub using its actual top and height", () => {
    expect(calculateDockRect({ x: 1200, y: 80, width: 72, height: 900 }, 440)).toEqual({ x: 760, y: 80, width: 440, height: 900 });
  });
});
