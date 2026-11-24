#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 80;
const HTML_FILE = path.join(__dirname, "twitch-overlap.html");

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    const html = fs.readFileSync(HTML_FILE, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => console.log("Twitch Overlap serveur sur port " + PORT));