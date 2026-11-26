import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkCompliance } from "../src/compliance/check.js";
import { contrastRatio } from "../src/compliance/contrast.js";
import { scanText } from "../src/compliance/rules.js";
import { loadBrand } from "../src/lib/io.js";
import { PostSchema, ScriptSchema, StoryboardSchema } from "../src/schemas/index.js";

const fx = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/heart-habit/${f}`, import.meta.url), "utf8"));
const brand = loadBrand("pulse-health");
const script = ScriptSchema.parse(fx("script.json"));
const storyboard = StoryboardSchema.parse(fx("storyboard.json"));
const post = PostSchema.parse(fx("post.json"));
const errorsOf = (text: string) => scanText(text).filter((h) => h.severity === "error").map((h) => h.rule);

describe("text rules", () => {
  it.each([
    ["If your head pounds every morning, you have high blood pressure.", "no-diagnosis"],
    ["These symptoms mean you have a migraine disorder.", "no-diagnosis"],
    ["You're probably diabetic.", "no-diagnosis"],
    ["This tea cures headaches.", "no-cure-claim"],
    ["A guaranteed way to fix your sleep.", "no-cure-claim"],
    ["Walking reverses heart disease.", "no-cure-claim"],
    ["You can stop taking your medication once you feel better.", "no-unsafe-advice"],
    ["No need to see a doctor for this.", "no-unsafe-advice"],
    ["Try breathing exercises instead of medication.", "no-unsafe-advice"],
  ])("blocks: %s", (text, rule) => {
    expect(errorsOf(text)).toContain(rule);
  });

  it.each([
    "If you have high blood pressure, talk to your doctor about a plan.",
    "People who have diabetes should check their feet daily.",
    "A sudden, severe headache can be a sign to see a doctor right away.",
    "Sleep is linked to a lower risk of heart disease.",
    "Brisk walking may help lower blood pressure.",
  ])("allows: %s", (text) => {
    expect(errorsOf(text)).toEqual([]);
  });

  it("downgrades negated claims to a warning", () => {
    const hits = scanText("There's no cure for a cold, but rest helps.");
    expect(hits.map((h) => h.severity)).toEqual(["warning"]);
  });
});

describe("contrast", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });
});

describe("checkCompliance", () => {
  it("passes the clean example Reel at the final gate", () => {
    const r = checkCompliance({ slug: "heart-habit", brand, script, storyboard, post, final: true });
    expect(r.findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(r.passed).toBe(true);
  });

  it("is pending (not failing) when later files don't exist yet", () => {
    const r = checkCompliance({ slug: "heart-habit", brand, script });
    expect(r.passed).toBe(true);
    expect(r.counts.info).toBeGreaterThan(0);
  });

  it("fails the final gate when files are missing", () => {
    expect(checkCompliance({ slug: "x", brand, script, final: true }).passed).toBe(false);
  });

  it("blocks a script whose only source is not WHO/CDC/NHS", () => {
    const bad = { ...script, sources: [{ publisher: "Blog", title: "Tips", url: "https://example.com/tips" }] };
    const r = checkCompliance({ slug: "x", brand, script: bad });
    expect(r.findings.some((f) => f.rule === "credible-source" && f.severity === "error")).toBe(true);
  });

  it("rejects a look-alike domain", () => {
    const bad = { ...script, sources: [{ publisher: "CDC", title: "x", url: "https://cdc.gov.evil.io/x" }] };
    expect(checkCompliance({ slug: "x", brand, script: bad }).passed).toBe(false);
  });

  it("blocks a storyboard without a disclaimer frame", () => {
    const sb = { ...storyboard, scenes: storyboard.scenes.filter((s) => s.shot !== "disclaimer") };
    const r = checkCompliance({ slug: "x", brand, storyboard: sb });
    expect(r.findings.some((f) => f.rule === "disclaimer" && f.severity === "error")).toBe(true);
  });

  it("checks visual prompts too, not just spoken lines", () => {
    const sb = structuredClone(storyboard);
    sb.scenes[1].visual = "Bottle labelled 'cures high blood pressure'";
    const r = checkCompliance({ slug: "x", brand, storyboard: sb });
    expect(r.findings.some((f) => f.where.endsWith(".visual") && f.rule === "no-cure-claim")).toBe(true);
  });

  it("blocks low-contrast caption colours", () => {
    const lowBrand = structuredClone(brand);
    lowBrand.captionStyle.color = "#9AA5A8";
    lowBrand.captionStyle.background = "#F7F4EE";
    const r = checkCompliance({ slug: "x", brand: lowBrand, script });
    expect(r.findings.some((f) => f.rule === "caption-contrast")).toBe(true);
  });
});
