import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT ?? 8080);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function resolveRequestPath(requestUrl = "/") {
  const pathname = new URL(requestUrl, "http://localhost").pathname;
  return pathname === "/" ? "/index.html" : pathname;
}

function sendNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
}

const server = http.createServer((req, res) => {
  const requestPath = resolveRequestPath(req.url);
  const filePath = path.join(__dirname, requestPath);
  const extension = path.extname(filePath);
  const contentType = MIME_TYPES[extension] ?? "text/plain; charset=utf-8";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendNotFound(res);
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
