const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8964;
const DB_PATH = path.resolve(process.env.HOME, '.codex/state_5.sqlite');
const HTML_PATH = path.join(__dirname, 'index.html');

// Cache the HTML
let HTML;
try {
  HTML = fs.readFileSync(HTML_PATH, 'utf-8');
} catch(e) {
  console.error('Cannot read HTML:', e.message);
  process.exit(1);
}

function query(sql) {
  const out = execSync(`sqlite3 -json "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8', timeout: 10000
  }).trim();
  return out ? JSON.parse(out) : [];
}

function mutate(sql) {
  execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8', timeout: 10000
  });
}

// Test DB
try {
  const test = execSync(`sqlite3 "${DB_PATH}" ".tables"`, { encoding: 'utf-8', timeout: 3000 });
  console.log('✅ Database OK');
} catch(e) {
  console.error('❌ Database error:', e.message);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
    res.end(HTML);
    return;
  }

  if (!pathname.startsWith('/api/')) {
    res.writeHead(302, { 'Location': '/' }); res.end(); return;
  }

  try {
    if (pathname === '/api/projects') {
      const rows = query("SELECT cwd, COUNT(*) as count, MAX(created_at) as last_active FROM threads GROUP BY cwd ORDER BY last_active DESC");
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
      return;
    }

    if (pathname === '/api/stats') {
      const rows = query("SELECT COUNT(*) as total, SUM(CASE WHEN archived=0 THEN 1 ELSE 0 END) as active, SUM(CASE WHEN archived=1 THEN 1 ELSE 0 END) as archived, SUM(tokens_used) as total_tokens FROM threads");
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows[0] || {total:0,active:0,archived:0,total_tokens:0}));
      return;
    }

    if (pathname === '/api/sizes') {
      const rows = query("SELECT cwd FROM threads GROUP BY cwd");
      const sizes = {};
      for (const r of rows) {
        const safe = r.cwd.replace(/'/g, "''");
        const files = query(`SELECT rollout_path FROM threads WHERE cwd='${safe}'`);
        let total = 0;
        for (const f of files) {
          if (f.rollout_path) {
            try { total += fs.statSync(f.rollout_path).size; } catch(e) {}
          }
        }
        sizes[r.cwd] = total;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sizes));
      return;
    }

    if (pathname === '/api/log-size') {
      const logDir = path.resolve(process.env.HOME, '.codex');
      let total = 0;
      try {
        for (const f of fs.readdirSync(logDir)) {
          if (f.startsWith('logs_') || f.startsWith('state_')) {
            const st = fs.statSync(path.join(logDir, f));
            total += st.size;
          }
        }
      } catch(e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ size: total }));
      return;
    }

    if (pathname === '/api/threads') {
      const cwd = url.searchParams.get('cwd') || '';
      const archived = url.searchParams.get('archived') === '1' ? 1 : 0;
      if (!cwd) { res.writeHead(400); res.end('{"error":"no cwd"}'); return; }
      const safe = cwd.replace(/'/g, "''");
      const rows = query(`SELECT id, title, created_at, updated_at, archived, tokens_used, model, git_branch, first_user_message, rollout_path FROM threads WHERE cwd='${safe}' AND archived=${archived} ORDER BY created_at DESC LIMIT 200`);
      for (const r of rows) {
        let s = 0;
        if (r.rollout_path) { try { s = fs.statSync(r.rollout_path).size; } catch(e) {} }
        r.file_size = s;
        delete r.rollout_path;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
      return;
    }

    if (pathname === '/api/delete' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const { ids } = JSON.parse(body);
          if (!ids || !ids.length) { res.writeHead(400); res.end('{"error":"no ids"}'); return; }
          for (const id of ids) {
            const safe = id.replace(/'/g, "''");
            const rows = query(`SELECT rollout_path FROM threads WHERE id='${safe}'`);
            if (rows[0] && rows[0].rollout_path) {
              try { fs.unlinkSync(rows[0].rollout_path); } catch(e) {}
            }
            mutate(`DELETE FROM threads WHERE id='${safe}'`);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ deleted: ids.length }));
        } catch(e) { res.writeHead(500); res.end(JSON.stringify({error: e.message})); }
      });
      return;
    }

    if (pathname === '/api/delete-project' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const { cwd } = JSON.parse(body);
          if (!cwd) { res.writeHead(400); res.end('{"error":"no cwd"}'); return; }
          const safe = cwd.replace(/'/g, "''");
          const rows = query(`SELECT id, rollout_path FROM threads WHERE cwd='${safe}'`);
          for (const r of rows) {
            if (r.rollout_path) try { fs.unlinkSync(r.rollout_path); } catch(e) {}
          }
          mutate(`DELETE FROM threads WHERE cwd='${safe}'`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ deleted: rows.length }));
        } catch(e) { res.writeHead(500); res.end(JSON.stringify({error: e.message})); }
      });
      return;
    }

    if (pathname === '/api/archive' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const { ids } = JSON.parse(body);
          if (!ids || !ids.length) { res.writeHead(400); res.end('{"error":"no ids"}'); return; }
          const now = Math.floor(Date.now() / 1000);
          for (const id of ids) {
            const safe = id.replace(/'/g, "''");
            mutate(`UPDATE threads SET archived=1, archived_at=${now} WHERE id='${safe}'`);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ archived: ids.length }));
        } catch(e) { res.writeHead(500); res.end(JSON.stringify({error: e.message})); }
      });
      return;
    }

    res.writeHead(404); res.end('{"error":"not found"}');
  } catch(e) {
    console.error('Error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('✅ Codex Manager: http://127.0.0.1:' + PORT);
});
