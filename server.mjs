import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(".");
const port = Number(process.argv[2] || process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function resolveRequestPath(url) {
  const requestPath = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const filePath = normalize(join(root, relativePath));
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    return null;
  }
  return filePath;
}

createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method || "")) {
    send(res, 405, "Method not allowed");
    return;
  }

  const filePath = resolveRequestPath(req.url || "/");
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    send(res, 404, "Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
}).listen(port, () => {
  console.log(`Security+ practice app running at http://localhost:${port}/`);
});
