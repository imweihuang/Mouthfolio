import { readFile, writeFile } from "node:fs/promises";

// Adapted from AsOf's Python contract exporter; only this declared schema subset
// is supported. An unsupported schema node stops generation instead of using any.
const schema = JSON.parse(await readFile(new URL("../contracts/mouthfolio-research.v0.1.schema.json", import.meta.url), "utf8"));
function type(node) {
  if (node.$ref) return node.$ref.split("/").at(-1);
  if (Object.hasOwn(node, "const")) return JSON.stringify(node.const);
  if (node.enum) return node.enum.map(value => JSON.stringify(value)).join(" | ");
  if (node.anyOf) return node.anyOf.map(type).join(" | ");
  if (node.type === "array") return `Array<${type(node.items)}>`;
  if (node.type === "object") return "{\n" + Object.entries(node.properties).map(([key,value]) =>
    `  ${JSON.stringify(key)}${node.required.includes(key) ? "" : "?"}: ${type(value)};`).join("\n") + "\n}";
  if (["string", "boolean", "null", "number", "integer"].includes(node.type)) return node.type === "integer" ? "number" : node.type;
  throw new Error("Unsupported contract node");
}
const output = "// Generated from mouthfolio-research.v0.1.schema.json. Do not edit.\n" +
  Object.entries(schema.$defs).map(([name,node]) => `export type ${name} = ${type(node)};`).join("\n\n") +
  `\n\nexport type MouthfolioResearch = ${type(schema)};\n`;
const target = new URL("../contracts/types.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if (await readFile(target, "utf8") !== output) throw new Error("Generated contract differs; run npm run contracts:generate");
  console.log("Generated contract matches schema.");
} else { await writeFile(target, output); }
