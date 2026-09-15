import { HttpResponse, http } from "msw";
import {
  realBtOption,
  realBtPeers,
  realBtTask,
  realGlobalOption,
  realHttpTask,
  realTaskOption,
} from "./fixtures";
import { realAria2Log } from "./fixtures.logs";
import {
  realBtFromMagnetTask,
  realMagnetMetadataTask,
} from "./fixtures.magnet";

type MockRequest = {
  method: string;
  id: string;
  params?: unknown[];
};

function ok(id: string, result: unknown) {
  return HttpResponse.json({ jsonrpc: "2.0", id, result });
}

function err(id: string, message: string) {
  return HttpResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code: 1, message },
  });
}

/**
 * All responses are derived from real aria2 1.37.0 wire data captured in
 * ./fixtures.ts. The mock keeps a tiny in-memory task store so interactive
 * flows (add / pause / remove) behave like a real daemon.
 */
const tasks = new Map<string, Record<string, unknown>>();

tasks.set(realHttpTask.gid, realHttpTask as unknown as Record<string, unknown>);
tasks.set(
  realBtTask.gid,
  structuredClone(realBtTask) as unknown as Record<string, unknown>,
);
tasks.set(
  realMagnetMetadataTask.gid,
  realMagnetMetadataTask as unknown as Record<string, unknown>,
);
tasks.set(
  realBtFromMagnetTask.gid,
  structuredClone(realBtFromMagnetTask) as unknown as Record<string, unknown>,
);

/** Test hook: restore the seeded task store (e2e isolation). */
function resetTasks() {
  tasks.clear();
  tasks.set(
    realHttpTask.gid,
    realHttpTask as unknown as Record<string, unknown>,
  );
  tasks.set(
    realBtTask.gid,
    structuredClone(realBtTask) as unknown as Record<string, unknown>,
  );
  tasks.set(
    realMagnetMetadataTask.gid,
    realMagnetMetadataTask as unknown as Record<string, unknown>,
  );
  tasks.set(
    realBtFromMagnetTask.gid,
    structuredClone(realBtFromMagnetTask) as unknown as Record<string, unknown>,
  );
}

function listTasks(...statuses: string[]) {
  return [...tasks.values()].filter(
    (task) => statuses.indexOf(String(task.status)) !== -1,
  );
}

export const handlers = [
  // Same-origin aria2 log file (provided by the all-in-one image nginx);
  // seeded from real captured log lines.
  http.get("/aria2-log", () => HttpResponse.text(realAria2Log)),
  http.post("http://localhost:6800/jsonrpc", async ({ request }) => {
    const data = (await request.json()) as MockRequest;
    // params[0] is `token:<secret>` when a secret is configured.
    const args = (data.params ?? []).filter(
      (p) => typeof p !== "string" || !p.startsWith("token:"),
    );

    switch (data.method) {
      case "aria2.getGlobalStat": {
        const active = listTasks("active");
        return ok(data.id, {
          downloadSpeed: String(
            active.reduce((sum, t) => sum + Number(t.downloadSpeed ?? 0), 0),
          ),
          uploadSpeed: String(
            active.reduce((sum, t) => sum + Number(t.uploadSpeed ?? 0), 0),
          ),
          numActive: String(active.length),
          numWaiting: String(listTasks("waiting", "paused").length),
          numStopped: String(listTasks("complete", "error", "removed").length),
          numStoppedTotal: "3",
        });
      }

      case "aria2.tellActive":
        return ok(data.id, listTasks("active"));

      case "aria2.tellWaiting":
        return ok(data.id, listTasks("waiting", "paused"));

      case "aria2.tellStopped":
        return ok(data.id, listTasks("complete", "error", "removed"));

      case "aria2.tellStatus": {
        const task = tasks.get(String(args[0]));
        return task
          ? ok(data.id, task)
          : err(data.id, "Active download not found for this GID");
      }

      case "aria2.getVersion":
        return ok(data.id, {
          version: "1.37.0",
          enabledFeatures: [
            "Async DNS",
            "BitTorrent",
            "GZip",
            "HTTPS",
            "Metalink",
            "XML-RPC",
            "SFTP",
          ],
        });

      case "aria2.getGlobalOption":
        return ok(data.id, realGlobalOption);

      case "aria2.changeGlobalOption":
        Object.assign(realGlobalOption, args[0] as Record<string, string>);
        return ok(data.id, "OK");

      case "aria2.getOption":
        return ok(
          data.id,
          args[0] === realBtTask.gid ? realBtOption : realTaskOption,
        );

      case "aria2.changeOption":
        return ok(data.id, "OK");

      case "aria2.getPeers":
        return ok(data.id, args[0] === realBtTask.gid ? realBtPeers : []);

      case "aria2.addUri": {
        const gid = `mock-${Math.random().toString(16).slice(2, 16)}`;
        tasks.set(gid, {
          gid,
          status: "active",
          totalLength: String(50 * 1024 * 1024),
          completedLength: "0",
          uploadLength: "0",
          downloadSpeed: "1024000",
          uploadSpeed: "0",
          dir: realGlobalOption.dir,
          connections: "1",
          files: (args[0] as string[]).map((uri, i) => ({
            index: String(i + 1),
            path: `${realGlobalOption.dir}/${uri.split("/").pop() ?? "download"}`,
            length: String(50 * 1024 * 1024),
            completedLength: "0",
            selected: "true",
            uris: [{ status: "used", uri }],
          })),
        });
        return ok(data.id, gid);
      }

      case "aria2.addTorrent":
      case "aria2.addMetalink": {
        const gid = `mock-${Math.random().toString(16).slice(2, 16)}`;
        tasks.set(
          gid,
          structuredClone(realBtTask) as unknown as Record<string, unknown>,
        );
        return ok(data.id, gid);
      }

      case "aria2.pause":
      case "aria2.forcePause": {
        const task = tasks.get(String(args[0]));
        if (task) task.status = "paused";
        return ok(data.id, args[0]);
      }

      case "aria2.unpause": {
        const task = tasks.get(String(args[0]));
        if (task) task.status = "active";
        return ok(data.id, args[0]);
      }

      case "aria2.remove":
      case "aria2.forceRemove": {
        const task = tasks.get(String(args[0]));
        if (task) task.status = "removed";
        return ok(data.id, args[0]);
      }

      case "aria2.pauseAll":
        for (const task of tasks.values()) {
          if (task.status === "active") task.status = "paused";
        }
        return ok(data.id, "OK");

      case "aria2.unpauseAll":
        for (const task of tasks.values()) {
          if (task.status === "paused") task.status = "active";
        }
        return ok(data.id, "OK");

      case "aria2.purgeDownloadResult":
        for (const [gid, task] of tasks) {
          if (
            task.status === "complete" ||
            task.status === "error" ||
            task.status === "removed"
          ) {
            tasks.delete(gid);
          }
        }
        return ok(data.id, "OK");

      case "mock.resetState":
        resetTasks();
        return ok(data.id, "OK");

      default:
        return ok(data.id, "OK");
    }
  }),
];
