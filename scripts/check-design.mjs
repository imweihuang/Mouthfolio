import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const tokens = await readFile("app/tokens.css", "utf8");
const sheets = (await readdir("app", { recursive: true })).filter(path => path.endsWith(".css") && path !== "tokens.css");
const styles = (await Promise.all(sheets.map(path => readFile(`app/${path}`, "utf8")))).join("\n");
const defined = new Map([...tokens.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([,key,value]) => [key,value.trim()]));
for (const [,name] of (tokens + styles).matchAll(/var\(--([\w-]+)\)/g)) assert.ok(defined.has(name), `Undefined token: ${name}`);
assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(styles), "Colors belong in tokens.css");
const luminance = hex => {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value,16)/255)
    .map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
  return channels[0]*.2126 + channels[1]*.7152 + channels[2]*.0722;
};
for (const text of ["v2-light-text", "v2-light-text-body", "v2-light-muted"]) {
  for (const bg of ["v2-light-bg0", "v2-light-bg1", "v2-light-bg2"]) {
    const values = [luminance(defined.get(text)),luminance(defined.get(bg))].sort((a,b) => b-a);
    assert.ok((values[0]+.05)/(values[1]+.05) >= 4.5, `${text} contrast on ${bg}`);
  }
}
for (const [foreground, minimum] of [["filing-blue-light", 3], ["filing-blue-ink-light", 4.5]]) {
  for (const bg of ["v2-light-bg0", "v2-light-bg1", "v2-light-bg2"]) {
    const values = [luminance(defined.get(foreground)), luminance(defined.get(bg))].sort((a,b) => b-a);
    assert.ok((values[0]+.05)/(values[1]+.05) >= minimum, `${foreground} contrast on ${bg}`);
  }
}
console.log("All app styles: token references, color placement, text and chart contrast passed.");
