const swc = require("@swc/core");
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");
const outDir = path.join(__dirname, "dist-swc");

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === "node_modules" || item.name === "tests" || item.name === "dist") continue;
      results.push(...walk(full));
    } else if (item.name.endsWith(".ts") && !item.name.endsWith(".spec.ts")) {
      results.push(full);
    }
  }
  return results;
}

async function build() {
  const files = walk(srcDir);
  console.log(`Compiling ${files.length} TypeScript files with SWC...`);

  let count = 0;
  for (const file of files) {
    const relative = path.relative(srcDir, file);
    const outPath = path.join(distDir, relative.replace(/\.ts$/, ".js"));
    const outDirPath = path.dirname(outPath);

    if (!fs.existsSync(outDirPath)) {
      fs.mkdirSync(outDirPath, { recursive: true });
    }

    try {
      const code = fs.readFileSync(file, "utf-8");
      const result = await swc.transform(code, {
        filename: file,
        sourceMaps: true,
        module: { type: "commonjs" },
        jsc: {
          parser: { syntax: "typescript", decorators: true, dynamicImport: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2021",
          keepClassNames: true,
          paths: {
            "@/*": [path.join(__dirname, "src") + "/*"],
          },
        },
      });

      fs.writeFileSync(outPath, result.code);
      if (result.map) {
        fs.writeFileSync(outPath + ".map", result.map);
      }
      count++;
    } catch (err) {
      console.error(`Error compiling ${file}:`, err.message);
    }
  }

  console.log(`Compiled ${count}/${files.length} files to dist/`);
}

build().catch(console.error);
