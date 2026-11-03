#!/usr/bin/env node
/**
 * Minimal mock of the HexSimulator HTTP protocol, used by `scripts/smoke-rpc.mjs`
 * and handy for UI development when no HexCLI server is available.
 *
 *   node scripts/mock-server.mjs [--port 8742] [--token secret]
 *
 * Implements: GET /v1/health, POST /v1/rpc with ping / run / stack / reset /
 * step.begin / step.next / step.abort. `run` understands a tiny subset of
 * hexParse source (`num_<n>` and `add` / `subtract` / `multiply`) so the
 * `num_1 num_2 add` example really produces 3 on top of the stack.
 */

import { createServer } from "node:http";

export function createMockServer({ token = null } = {}) {
  /** Bottom -> top. */
  let stack = [];
  let step = null;

  const iota = {
    number(value) {
      return {
        type: "hexcasting:double",
        text: value.toFixed(2),
        color: "#ff55ff",
        rich: [{ text: value.toFixed(2), color: "#ff55ff" }],
        value,
      };
    },
    pattern(startDir, angles) {
      return {
        type: "hexcasting:pattern",
        text: `${startDir} ${angles}`,
        color: "#b9a8ff",
        rich: [{ text: `${startDir} ${angles}`, color: "#b9a8ff" }],
        pattern: { startDir, angles },
      };
    },
    boolean(value) {
      return {
        type: "hexcasting:boolean",
        text: String(value),
        color: "#00ff00",
        rich: [{ text: String(value), color: "#00ff00" }],
        value,
      };
    },
  };

  const mishap = (message) => ({
    ok: false,
    lines: [`[HexCLI] ${message}`],
    data: {
      cast: null,
      prints: [],
      messages: [],
      parserMessages: [],
      media: { mode: "infinite", text: "infinite" },
      error: message,
      step: null,
    },
  });

  const castReply = ({ ok = true, stack: next, mishaps = [], prints = [] }) => {
    stack = next;
    return {
      ok,
      lines: ["[HexCLI] cast"],
      data: {
        cast: {
          resolution: ok ? "EVALUATED" : "ERRORED",
          steps: 3,
          ops: 3,
          stack,
          ravenmind: null,
          mishaps,
          mediaUsed: 0,
          mediaDust: 0,
        },
        prints,
        messages: [],
        parserMessages: [],
        media: { mode: "infinite", text: "infinite" },
        error: null,
        step,
      },
    };
  };

  /** Extremely small interpreter: enough to exercise the protocol surface. */
  const execute = (code) => {
    const tokens = code.trim().split(/\s+/).filter(Boolean);
    const next = [...stack];
    for (const raw of tokens) {
      if (raw.startsWith("num_")) {
        const value = Number(raw.slice(4));
        if (!Number.isFinite(value)) {
          return mishap(`bad number literal: ${raw}`);
        }
        next.push(iota.number(value));
        continue;
      }
      if (raw === "add" || raw === "subtract" || raw === "multiply") {
        const b = next.pop();
        const a = next.pop();
        if (a == null || b == null) {
          return mishap("not enough iotas on the stack");
        }
        const value =
          raw === "add"
            ? a.value + b.value
            : raw === "subtract"
              ? a.value - b.value
              : a.value * b.value;
        next.push(iota.number(value));
        continue;
      }
      if (raw === "true" || raw === "false") {
        next.push(iota.boolean(raw === "true"));
        continue;
      }
      // Unknown token: echo it as a pattern iota so the glyph path is covered.
      // `DIR_signature` splits on the last underscore (directions contain one).
      const underscore = raw.lastIndexOf("_");
      const [dir, angles] =
        underscore > 0 ? [raw.slice(0, underscore), raw.slice(underscore + 1)] : ["EAST", raw];
      next.push(iota.pattern(dir, angles));
    }
    return castReply({ stack: next });
  };

  const buildStep = (done, executed, stopped) => ({
    total: 3,
    index: Math.min(executed + 1, 3),
    done,
    executed,
    ...(done ? {} : { preview: iota.pattern("NORTH_EAST", "waaw") }),
    ...(stopped ? { stopped } : {}),
  });

  const handleRpc = (request) => {
    const cmd = request.cmd;
    switch (cmd) {
      case "ping":
        return { ok: true, lines: ["pong"], data: {} };
      case "run": {
        const code = String(request.code ?? "");
        if (code.trim() === "") {
          return mishap("hexParse produced no iotas");
        }
        return execute(code);
      }
      case "stack":
        return {
          ok: true,
          lines: ["[HexCLI] session state"],
          data: {
            stack: [...stack],
            ravenmind: iota.pattern("NORTH_EAST", "qaq"),
            parens: 0,
          },
        };
      case "reset":
        stack = [];
        step = null;
        return {
          ok: true,
          lines: ["[HexCLI] session reset"],
          data: { profile: "default", stackSize: 0, ravenmind: false },
        };
      case "step.begin":
        step = buildStep(false, 0);
        return {
          ok: true,
          lines: ["[HexCLI] stepping"],
          data: { step, parserMessages: [] },
        };
      case "step.next": {
        if (step == null) {
          return mishap("no step session");
        }
        // HexCLI semantics: `executed` is the zero-based index of the iota
        // just executed, `index` the next iota's index.
        const i = step.executed;
        const done = i + 1 >= step.total;
        stack = [...stack, iota.number(i + 1)];
        step = buildStep(done, i);
        return {
          ok: true,
          lines: [`[HexCLI] step ${i + 1}`],
          data: {
            cast: {
              resolution: "EVALUATED",
              steps: 1,
              ops: 1,
              stack: [...stack],
              ravenmind: null,
              mishaps: [],
              mediaUsed: 0,
              mediaDust: 0,
            },
            prints: [],
            messages: [],
            parserMessages: [],
            media: { mode: "infinite", text: "infinite" },
            error: null,
            step,
          },
        };
      }
      case "step.abort":
        step = null;
        return {
          ok: true,
          lines: ["[HexCLI] aborted"],
          data: { message: "step session aborted (stack kept)" },
        };
      default:
        return {
          ok: false,
          lines: [`unknown cmd ${cmd}`],
          data: { error: `unknown request type '${cmd}'` },
        };
    }
  };

  const corsHeaders = (origin) => ({
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  });

  const server = createServer((req, res) => {
    const origin = req.headers.origin;
    const headers = {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/v1/health") {
      res.writeHead(200, headers);
      res.end(
        JSON.stringify({
          ok: true,
          protocol: 1,
          server: "mock-hexcli",
          version: "0.0.0-smoke",
        }),
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/rpc") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        let request;
        try {
          request = JSON.parse(body);
        } catch {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ ok: false, data: { error: "bad json" } }));
          return;
        }

        if (token != null) {
          const auth = req.headers.authorization ?? "";
          const supplied = auth.startsWith("Bearer ")
            ? auth.slice("Bearer ".length)
            : request.token;
          if (supplied !== token) {
            res.writeHead(401, headers);
            res.end(JSON.stringify({ ok: false, data: { error: "unauthorized" } }));
            return;
          }
        }

        const reply = handleRpc(request);
        res.writeHead(200, headers);
        res.end(
          JSON.stringify({
            id: request.id ?? null,
            ok: reply.ok,
            lines: reply.lines ?? [],
            data: reply.data ?? {},
          }),
        );
      });
      return;
    }

    res.writeHead(404, headers);
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  });

  return server;
}

const isMain = process.argv[1] != null
  && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf("--port");
  const tokenIndex = args.indexOf("--token");
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 8742;
  const token = tokenIndex >= 0 ? args[tokenIndex + 1] : null;

  const server = createMockServer({ token });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`mock HexSimulator server on http://127.0.0.1:${actualPort}`);
    if (token != null) {
      console.log("token required");
    }
  });
}
