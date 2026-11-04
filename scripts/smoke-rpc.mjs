#!/usr/bin/env node
/**
 * Protocol smoke test for the HexSimulator client.
 *
 * 1. Starts the mock server from `scripts/mock-server.mjs` on an ephemeral port.
 * 2. Builds the real client + hexParse sources with esbuild (bundled, so it
 *    exercises the code the browser runs, not a copy).
 * 3. Checks health, `patterns.list` -> registry normalization, `run num_1
 *    num_2 add` -> stack top 3, ravenmind, stack/reset, step commands, hexParse
 *    against the server-supplied registry, and error paths.
 *
 *   yarn smoke
 *
 * Exits non-zero on any failure.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

import { createMockServer } from "./mock-server.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "..");

let failures = 0;
let checks = 0;

function check(name, condition, detail) {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail === undefined ? "" : ` — ${detail}`}`);
  }
}

function equal(name, actual, expected) {
  check(
    name,
    JSON.stringify(actual) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

async function bundleEntry(outfile) {
  await build({
    entryPoints: {
      client: path.join(projectRoot, "src/server/client.ts"),
      types: path.join(projectRoot, "src/server/types.ts"),
      hexparse: path.join(projectRoot, "src/hexparse/index.ts"),
    },
    outdir: outfile,
    // `.mjs` so Node treats the temp-dir output as ESM without a package.json.
    outExtension: { ".js": ".mjs" },
    // Some transitive CJS deps (bytebuffer via long) call require("buffer");
    // give ESM output a real require.
    banner: {
      js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "silent",
    // Mirror vite.config.ts: the workspace packages are consumed as source,
    // not through their (unbuilt) package entry points.
    alias: {
      "@hextools/react": path.join(projectRoot, "packages/@hextools/react/src"),
      "@hextools/renderer": path.join(
        projectRoot,
        "packages/@hextools/renderer/src",
      ),
    },
    // `.fsh`/`.vsh?raw` are Vite imports; only the staff-grid geometry is
    // needed here, so stub the shader entry point.
    plugins: [
      {
        name: "stub-shaders",
        setup(build) {
          build.onResolve({ filter: /(^|\/)shaders(\/index(\.ts)?)?$/ }, (args) => ({
            path: path.join(args.resolveDir, "shaders-stub.js"),
            namespace: "stub",
          }));
          build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents:
              "export function enablePositionColorShader() {}\n"
              + "export function loadPositionColorShader() { throw new Error('WebGL is not available in the smoke test'); }\n",
            loader: "js",
          }));
        },
      },
    ],
    // `import.meta.env` is injected by Vite; the smoke test runs in Node.
    define: {
      "import.meta.env.BASE_URL": '"./"',
    },
  });
}

async function main() {
  const server = createMockServer({ token: "s3cret" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`mock server: ${baseUrl}`);

  const dir = await mkdtemp(path.join(tmpdir(), "hexsim-smoke-"));
  try {
    await bundleEntry(dir);
    const clientModule = await import(
      pathToFileURL(path.join(dir, "client.mjs")).href
    );
    const typesModule = await import(
      pathToFileURL(path.join(dir, "types.mjs")).href
    );
    const hexparseModule = await import(
      pathToFileURL(path.join(dir, "hexparse.mjs")).href
    );
    const { RpcClient, RpcError, normalizeEndpoints } = clientModule;
    const { toSnapshot, mergeStack } = typesModule;
    const {
      parseHex,
      parseToResolvedPatterns,
      patternsToCode,
      patternsDataFromServer,
      fromPatternsListReply,
      OFFLINE_PATTERNS_DATA,
      BUILTIN_NUMBERS,
    } = hexparseModule;

    // ---- normalization ---------------------------------------------------
    console.log("\nURL normalization");
    equal(
      "bare host:port gains http://",
      normalizeEndpoints("127.0.0.1:8742").rpcUrl,
      "http://127.0.0.1:8742/v1/rpc",
    );
    equal(
      "trailing slash stripped",
      normalizeEndpoints("http://example.com/hex/").rpcUrl,
      "http://example.com/hex/v1/rpc",
    );
    equal(
      "explicit /v1 is not doubled",
      normalizeEndpoints("https://example.com/hex/v1").healthUrl,
      "https://example.com/hex/v1/health",
    );
    let threw = false;
    try {
      normalizeEndpoints("ftp://example.com");
    } catch (error) {
      threw = error instanceof RpcError && error.kind === "invalid-url";
    }
    check("rejects non-http protocols", threw);

    // ---- auth ------------------------------------------------------------
    console.log("\nAuth");
    const noToken = new RpcClient({ baseUrl, token: "" });
    let authError = null;
    try {
      await noToken.rpc({ cmd: "ping" });
    } catch (error) {
      authError = error;
    }
    check(
      "missing token surfaces HTTP 401",
      authError instanceof RpcError && authError.status === 401,
      authError?.message,
    );

    const client = new RpcClient({ baseUrl, token: "s3cret" });

    const health = await client.health();
    check("health.ok", health.ok === true);
    equal("health.protocol", health.protocol, 1);
    equal("health.server", health.server, "mock-hexcli");

    const ping = await client.rpc({ cmd: "ping", id: 7 });
    check("ping ok", ping.ok === true);
    equal("ping echoes id", ping.id, 7);

    // ---- patterns.list ---------------------------------------------------
    console.log("\npatterns.list");
    const listReply = await client.rpc({ cmd: "patterns.list" });
    check("patterns.list ok", listReply.ok === true);
    check(
      "patterns.list returns data.patterns array",
      Array.isArray(listReply.data?.patterns),
      JSON.stringify(listReply.data)?.slice(0, 120),
    );
    check(
      "registry includes hexcasting:add",
      (listReply.data?.patterns ?? []).some((p) => p.id === "hexcasting:add"),
    );
    check(
      "registry includes an addon pattern",
      (listReply.data?.patterns ?? []).some((p) => p.id.startsWith("miehex:")),
    );

    const registry = fromPatternsListReply(await client.patternsList(), baseUrl);
    check("normalized registry has patterns", registry.patterns.length > 0);
    check(
      "normalized registry carries the built-in number table",
      Object.keys(registry.numbers ?? {}).length > 1000,
      String(Object.keys(registry.numbers ?? {}).length),
    );
    const addRecord = registry.patterns.find((p) => p.id === "hexcasting:add");
    equal("normalized add startdir", addRecord?.startdir, "NORTH_EAST");
    equal("normalized add signature", addRecord?.signature, "waaw");
    check(
      "normalized aliases include the bare name",
      addRecord?.aliases?.includes("add"),
      JSON.stringify(addRecord?.aliases),
    );

    // Top-level `patterns` shape (adapter servers).
    const shorthand = patternsDataFromServer([
      { id: "hexcasting:add", startDir: "NORTH_EAST", angles: "waaw" },
    ]);
    equal("bare array reply accepted", shorthand.patterns.length, 1);
    equal("bare array keeps direction", shorthand.patterns[0].startdir, "NORTH_EAST");
    const malformed = patternsDataFromServer({
      patterns: [
        { id: "ok:pattern", startDir: "EAST", angles: "qq" },
        { id: "bad:pattern", startDir: "SIDEWAYS", angles: "qq" },
        { id: "bad:signature", startDir: "EAST", angles: "zzz" },
      ],
    });
    equal("invalid entries are dropped", malformed.patterns.length, 1);
    equal("dropped entries are recorded in gaps", malformed.gaps?.length, 2);

    // ---- run -------------------------------------------------------------
    console.log("\nrun num_1 num_2 add");
    const run = await client.rpc({ cmd: "run", code: "num_1 num_2 add" });
    check("run ok", run.ok === true);
    const snapshot = toSnapshot(run);
    check("snapshot has stack", Array.isArray(snapshot.stack));
    equal("stack has one iota", snapshot.stack?.length, 1);
    const top = snapshot.stack?.[snapshot.stack.length - 1];
    equal("top iota value", top?.value, 3);
    equal("top iota type", top?.type, "hexcasting:double");
    equal("resolution", snapshot.resolution, "EVALUATED");
    equal("mishaps", snapshot.mishaps, []);
    equal("no ravenmind before write", snapshot.ravenmind, null);

    const written = await client.rpc({
      cmd: "run",
      code: "num_7 write_ravenmind",
    });
    const writtenSnapshot = toSnapshot(written);
    check(
      "ravenmind is an iota after write",
      writtenSnapshot.ravenmind != null
        && typeof writtenSnapshot.ravenmind === "object",
      JSON.stringify(writtenSnapshot.ravenmind),
    );
    equal(
      "ravenmind holds the written value",
      writtenSnapshot.ravenmind?.text,
      "7.00",
    );

    // ---- run with a mishap ----------------------------------------------
    console.log("\nrun with a mishap");
    const bad = await client.rpc({ cmd: "run", code: "add add add" });
    check("mishap run reports ok:false", bad.ok === false);
    const badSnapshot = toSnapshot(bad);
    equal("mishap snapshot ok", badSnapshot.ok, false);
    equal("mishap reply omits the stack", badSnapshot.stack, null);
    check(
      "mergeStack keeps the previous stack on a mishap",
      mergeStack(writtenSnapshot, badSnapshot).stack?.length === 2,
      JSON.stringify(mergeStack(snapshot, badSnapshot).stack),
    );

    // ---- stack / reset ---------------------------------------------------
    console.log("\nstack and reset");
    await client.rpc({ cmd: "run", code: "num_4 num_5 add" });
    const stackReply = await client.rpc({ cmd: "stack" });
    const stackSnapshot = toSnapshot(stackReply);
    // The mock session stack persists across runs, so the top is the newest
    // result and the previous `num_1 num_2 add` result is still below it.
    equal(
      "stack command returns the session stack",
      stackSnapshot.stack?.map((iota) => iota.value),
      [3, 7, 9],
    );
    check(
      "ravenmind survives snapshot",
      stackSnapshot.ravenmind != null,
      JSON.stringify(stackSnapshot.ravenmind),
    );
    equal(
      "ravenmind still holds 7 after another run",
      stackSnapshot.ravenmind?.text,
      "7.00",
    );

    const reset = await client.rpc({ cmd: "reset" });
    check("reset ok", reset.ok === true);
    equal("reset profile", reset.data?.profile, "default");
    const afterReset = toSnapshot(await client.rpc({ cmd: "stack" }));
    equal("stack empty after reset", afterReset.stack, []);

    // ---- step ------------------------------------------------------------
    console.log("\nstep session");
    const begin = await client.rpc({
      cmd: "step.begin",
      code: "num_1 num_2 add",
      label: "smoke",
    });
    check("step.begin ok", begin.ok === true);
    equal("step total", begin.data?.step?.total, 3);
    check("step preview present", begin.data?.step?.preview != null);

    const next1 = await client.rpc({ cmd: "step.next" });
    check("step.next ok", next1.ok === true);
    equal("step executed", next1.data?.step?.executed, 0);
    check("step not done after 1/3", next1.data?.step?.done === false);
    check(
      "step.next carries cast stack",
      Array.isArray(next1.data?.cast?.stack),
    );

    const abort = await client.rpc({ cmd: "step.abort" });
    check("step.abort ok", abort.ok === true);
    check(
      "abort message mentions kept stack",
      String(abort.data?.message).includes("stack kept"),
    );

    // ---- unknown command -------------------------------------------------
    console.log("\nunknown command");
    const unknown = await client.rpc({ cmd: "not-a-command" });
    check("unknown cmd is ok:false", unknown.ok === false);
    check(
      "unknown cmd has data.error",
      typeof unknown.data?.error === "string",
    );

    // ---- hexParse --------------------------------------------------------
    console.log("\nhexParse");
    const patternsData = registry;

    const parsed = parseHex("num_1 num_2 add", patternsData);
    equal("parses 3 patterns", parsed.patterns.length, 3);
    equal("no parse errors", Object.keys(parsed.errors), []);
    equal(
      "add resolves to NORTH_EAST waaw",
      parsed.patterns[2].pattern.toString(),
      "NORTH_EAST waaw",
    );

    const laidOut = parseToResolvedPatterns("num_1 num_2 add", patternsData);
    check(
      "layouter separates patterns horizontally",
      laidOut[0].origin.q < laidOut[1].origin.q
        && laidOut[1].origin.q < laidOut[2].origin.q,
      JSON.stringify(laidOut.map((p) => p.origin)),
    );

    const code = patternsToCode(laidOut);
    equal(
      "round-trips through DIR_signature",
      code,
      "SOUTH_EAST_aqaaw SOUTH_EAST_aqaawa NORTH_EAST_waaw",
    );
    const reparsed = parseHex(code, patternsData);
    equal(
      "round-trip parses back to the same signatures",
      reparsed.patterns.map((p) => p.pattern.toString()),
      laidOut.map((p) => p.pattern.toString()),
    );

    const mask = parseHex("mask_-v--", patternsData);
    check(
      "mask parses",
      mask.patterns.length === 1 && mask.patterns[0].pattern.signature.length > 0,
      JSON.stringify(Object.keys(mask.errors)),
    );

    const badToken = parseHex("definitely_not_a_pattern", patternsData);
    check(
      "unknown token reported",
      Object.keys(badToken.errors).length === 1,
      JSON.stringify(badToken),
    );

    const greedy = parseHex("num_99999999999999999", patternsData);
    check(
      "out-of-table number is rejected, not mis-encoded",
      Object.keys(greedy.errors).length === 1,
    );

    console.log("\noffline registry");
    equal(
      "built-in number table is bundled",
      Object.keys(BUILTIN_NUMBERS).length,
      4001,
    );
    const offlineNum = parseHex("num_1", OFFLINE_PATTERNS_DATA);
    equal("numbers parse offline", offlineNum.patterns.length, 1);
    const offlineMask = parseHex("mask_-v--", OFFLINE_PATTERNS_DATA);
    equal("masks parse offline", offlineMask.patterns.length, 1);
    const offlineNamed = parseHex("hexcasting:add", OFFLINE_PATTERNS_DATA);
    equal("qualified names need a registry", offlineNamed.patterns.length, 0);
    check(
      "offline qualified name is reported",
      Object.keys(offlineNamed.errors).length === 1,
    );
    check(
      "registry is not bundled into the offline data",
      OFFLINE_PATTERNS_DATA.patterns.length === 0,
    );

    // ---- snapshot fallbacks ---------------------------------------------
    console.log("\nsnapshot fallbacks");
    const topLevel = toSnapshot({
      ok: true,
      data: { stack: [{ type: "hexcasting:double", text: "3.00", value: 3 }] },
    });
    equal("prefers data.stack when no cast", topLevel.stack?.[0]?.value, 3);
    const castWins = toSnapshot({
      ok: true,
      data: {
        stack: [{ type: "hexcasting:double", text: "9.00", value: 9 }],
        cast: {
          stack: [{ type: "hexcasting:double", text: "3.00", value: 3 }],
          resolution: "EVALUATED",
        },
      },
    });
    equal("prefers data.cast.stack", castWins.stack?.[0]?.value, 3);
    const noStack = toSnapshot({ ok: true, data: {} });
    equal("missing stack is null, not []", noStack.stack, null);

    const previous = toSnapshot({
      ok: true,
      data: { stack: [{ type: "hexcasting:double", text: "3.00", value: 3 }] },
    });
    equal(
      "mergeStack keeps the stack when a command omits it",
      mergeStack(previous, noStack).stack?.[0]?.value,
      3,
    );
    equal(
      "mergeStack accepts an explicitly empty stack",
      mergeStack(previous, toSnapshot({ ok: true, data: { stack: [] } })).stack,
      [],
    );

    // ---- network errors --------------------------------------------------
    console.log("\nnetwork error");
    const dead = new RpcClient({ baseUrl: "http://127.0.0.1:1", token: "" });
    let networkError = null;
    try {
      await dead.rpc({ cmd: "ping" }, { timeoutMs: 2000 });
    } catch (error) {
      networkError = error;
    }
    check(
      "unreachable server reports network error",
      networkError instanceof RpcError && networkError.kind === "network",
      networkError?.message,
    );
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
