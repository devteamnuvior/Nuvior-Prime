import { describe, expect, it } from "vitest";
import { parseRouteMatrixElements } from "./googleRoutingProvider";

describe("Google route matrix response parsing", () => {
  it("reads the pretty-printed JSON array the Routes API returns", () => {
    const text = `[{
  "originIndex": 0,
  "destinationIndex": 1,
  "status": {},
  "distanceMeters": 3044,
  "duration": "621s",
  "condition": "ROUTE_EXISTS"
}
,
{
  "originIndex": 0,
  "destinationIndex": 2,
  "duration": "1137s",
  "condition": "ROUTE_EXISTS"
}
]`;
    const els = parseRouteMatrixElements(text);
    expect(els.map((e) => [e.originIndex, e.destinationIndex, e.duration])).toEqual([
      [0, 1, "621s"],
      [0, 2, "1137s"],
    ]);
  });

  it("still accepts newline-delimited objects and ignores junk", () => {
    const text = `{"originIndex":0,"destinationIndex":1,"duration":"60s"}\n{"originIndex":1,"destinationIndex":0,"duration":"70s"}\nnot json\n`;
    expect(parseRouteMatrixElements(text)).toHaveLength(2);
    expect(parseRouteMatrixElements("")).toEqual([]);
  });
});
