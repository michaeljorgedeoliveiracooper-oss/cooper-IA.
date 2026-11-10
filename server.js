require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const OpenAI = require("openai");
const path = require("path");
const fs = require("fs");

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "cooper.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tool TEXT NOT NULL,
    prompt TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("Defina SESSION_SECRET no ambiente de produção.");
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  store: new SQLiteStore({ db: "sessions.sqlite", dir: dataDir }),
  secret: process.env.SESSION_SECRET || "somente-desenvolvimento-altere-esta-chave",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const requireAuth = (req, res, next) => req.session.userId
  ? next() : res.status(401).json({ error: "Entre na sua conta para continuar." });

app.get("/api/status", (req, res) => {
  res.json({ app: "Cooper IA", aiConfigured: Boolean(process.env.OPENAI_API_KEY), loggedIn: Boolean(req.session.userId) });
});

app.post("/api/register", authLimiter, async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 70);
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || !emailOk(email) || password.length < 8) {
    return res.status(400).json({ error: "Informe nome, e-mail válido e senha com pelo menos 8 caracteres." });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name, email, hash);
    req.session.userId = Number(info.lastInsertRowid);
    req.session.userName = name;
    res.json({ user: { name, email } });
  } catch (e) {
    if (String(e.code).includes("SQLITE_CONSTRAINT")) return res.status(409).json({ error: "Este e-mail já possui cadastro." });
    res.status(500).json({ error: "Não foi possível criar sua conta." });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.json({ user: { name: user.name, email: user.email } });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT name,email,created_at FROM users WHERE id = ?").get(req.session.userId);
  if (!user) return res.status(401).json({ error: "Sessão inválida." });
  res.json({ user });
});

app.get("/api/history", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT id,tool,prompt,result,created_at FROM generations WHERE user_id = ? ORDER BY id DESC LIMIT 20").all(req.session.userId);
  res.json({ items: rows });
});

const prompts = {
  anuncio: "Crie um anúncio comercial persuasivo, claro e honesto em português do Brasil. Inclua título, benefícios, chamada para ação e uma versão curta para redes sociais.",
  venda: "Crie um texto de venda em português do Brasil, destacando benefícios reais, informações fornecidas e chamada para ação. Não invente especificações.",
  roteiro: "Crie um roteiro curto para vídeo promocional em português do Brasil, com cenas, falas e uma chamada para ação."
};

app.post("/api/generate", requireAuth, aiLimiter, async (req, res) => {
  const tool = String(req.body.tool || "");
  const prompt = String(req.body.prompt || "").trim().slice(0, 3000);
  if (!prompts[tool] || prompt.length < 5) return res.status(400).json({ error: "Escolha uma ferramenta e descreva o que precisa." });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "A IA ainda não foi conectada. Configure OPENAI_API_KEY no arquivo .env para ativar as gerações." });
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts[tool] },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 900
    });
    const result = completion.choices[0]?.message?.content || "Não foi possível gerar o conteúdo.";
    db.prepare("INSERT INTO generations(user_id,tool,prompt,result) VALUES(?,?,?,?)")
      .run(req.session.userId, tool, prompt, result);
    res.json({ result });
  } catch (e) {
    console.error("Erro na geração:", e.message);
    res.status(502).json({ error: "A geração falhou. Confira a configuração da chave de IA e tente novamente." });
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Cooper IA disponível em http://localhost:${PORT}`));
