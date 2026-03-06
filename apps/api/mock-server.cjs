const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const store = {
  documents: new Map(),
  versions: new Map(),
  envelopes: new Map(),
  fields: new Map()
};

const baseDir = path.join(process.cwd(), ".local-storage", "mock");
fs.mkdirSync(baseDir, { recursive: true });

function id() {
  return crypto.randomUUID();
}

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ message: "Missing Authorization header" });
  next();
}

app.post("/v1/auth/login", (req, res) => {
  res.json({ accessToken: "demo-token", refreshToken: "demo-refresh" });
});

app.post("/v1/documents", auth, (req, res) => {
  const document = {
    id: id(),
    organizationId: req.body.organizationId || "demo-org",
    ownerUserId: "demo-user",
    title: req.body.title || "Untitled",
    createdAt: new Date().toISOString()
  };
  store.documents.set(document.id, document);
  res.json(document);
});

app.post("/v1/documents/:id/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "File is required" });
  if (!(req.file.mimetype === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf"))) {
    return res.status(400).json({ message: "Only PDF files are allowed" });
  }

  const documentId = req.params.id;
  if (!store.documents.has(documentId)) return res.status(404).json({ message: "Document not found" });

  const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const version = {
    id: id(),
    documentId,
    sha256,
    storageKey: `documents/${documentId}/${Date.now()}.pdf`,
    createdAt: new Date().toISOString()
  };
  const filePath = path.join(baseDir, `${version.id}.pdf`);
  fs.writeFileSync(filePath, req.file.buffer);
  version.filePath = filePath;

  if (!store.versions.has(documentId)) store.versions.set(documentId, []);
  store.versions.get(documentId).push(version);
  res.json(version);
});

app.get("/v1/documents/:id/versions/latest", auth, (req, res) => {
  const versions = store.versions.get(req.params.id) || [];
  if (!versions.length) return res.status(404).json({ message: "No version found" });
  res.json(versions[versions.length - 1]);
});

app.get("/v1/documents/:id/versions/latest/file", auth, (req, res) => {
  const versions = store.versions.get(req.params.id) || [];
  if (!versions.length) return res.status(404).json({ message: "No version found" });
  const latest = versions[versions.length - 1];
  res.setHeader("Content-Type", "application/pdf");
  fs.createReadStream(latest.filePath).pipe(res);
});

app.post("/v1/envelopes", auth, (req, res) => {
  const envelope = {
    id: id(),
    organizationId: req.body.organizationId,
    documentId: req.body.documentId,
    recipients: req.body.recipients || [],
    status: "DRAFT",
    createdAt: new Date().toISOString()
  };
  store.envelopes.set(envelope.id, envelope);
  store.fields.set(envelope.id, []);
  res.json(envelope);
});

app.get("/v1/envelopes/:id/status", auth, (req, res) => {
  const envelope = store.envelopes.get(req.params.id);
  if (!envelope) return res.status(404).json({ message: "Envelope not found" });
  res.json(envelope);
});

app.get("/v1/envelopes/:id/fields", auth, (req, res) => {
  res.json(store.fields.get(req.params.id) || []);
});

app.post("/v1/envelopes/:id/fields", auth, (req, res) => {
  const envelope = store.envelopes.get(req.params.id);
  if (!envelope) return res.status(404).json({ message: "Envelope not found" });
  const fields = (req.body.fields || []).map((f) => ({
    id: id(),
    type: f.type || "SIGNATURE",
    page: f.page || 1,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height
  }));
  store.fields.set(req.params.id, fields);
  res.json(fields);
});

app.listen(port, () => {
  console.log(`Mock API running on http://localhost:${port}`);
});

