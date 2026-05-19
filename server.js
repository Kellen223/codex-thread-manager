const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8964;
const DB_PATH = path.resolve(process.env.HOME || '~', '.codex/state_5.sqlite');
const HTML_PATH = path.join(__dirname, 'index.html');
const CODEX_DIR = path.resolve(process.env.HOME || '~', '.codex');

let HTML;
try {
  HTML = fs.readFileSync(HTML_PATH, 'utf-8');
} catch(e) {
  console.error(`Cannot read ${HTML_PATH}:`, e.message);
  process.exit(1);
}

function query(sql) {
  try {
    const out = execSync(`sqlite3 -json "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8', timeout: 10000
    }).trim();
    return out ? JSON.parse(out) : [];
  } catch(e) {
    console.error('DB query error:', e.message.slice(0, 200));
    return [];
  }
}

function mutate(sql) {
  execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8', timeout: 10000
  });
}

// Startup check
try {
  execSync(`sqlite3 "${DB_PATH}" ".tables"`, { encoding: 'utf-8', timeout: 3000 });
  console.log(`Serving ${DB_PATH} on http://127.0.0.1:${PORT}`);
} catch(e) {
  console.error('Cannot access database:', e.message);
  process.exit(1);
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

function serveHTML(res) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(HTML);
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname === '/') return serveHTML(res);

  if (!pathname.startsWith('/api/')) {
    res.writeHead(302, { 'Location': '/' }); res.end(); return;
  }

  // ── GET handlers ──
  if (req.method === 'GET') {
    if (pathname === '/api/projects') {
      return sendJSON(res, query("SELECT cwd, COUNT(*) as count, MAX(created_at) as last_active FROM threads GROUP BY cwd ORDER BY last_active DESC"));
    }
    if (pathname === '/api/stats') {
      return sendJSON(res, query("SELECT COUNT(*) as total, SUM(CASE WHEN archived=0 THEN 1 ELSE 0 END) as active, SUM(CASE WHEN archived=1 THEN 1 ELSE 0 END) as archived, SUM(tokens_used) as total_tokens FROM threads")[0] || {total:0});
    }
    if (pathname === '/api/threads') {
      const cwd = url.searchParams.get('cwd') || '';
      const archived = url.searchParams.get('archived') === '1' ? 1 : 0;
      if (!cwd) return sendJSON(res, {error:'no cwd'}, 400);
      const safe = cwd.replace(/'/g, "''");
      const rows = query(`SELECT id, title, created_at, tokens_used, model, archived, first_user_message, rollout_path FROM threads WHERE cwd='${safe}' AND archived=${archived} ORDER BY created_at DESC LIMIT 200`);
      for (const r of rows) {
        let s = 0;
        if (r.rollout_path) { try { s = fs.statSync(r.rollout_path).size; } catch(e) {} }
        r.file_size = s;
        delete r.rollout_path;
      }
      return sendJSON(res, rows);
    }
    if (pathname === '/api/sizes') {
      const rows = query("SELECT cwd FROM threads GROUP BY cwd");
      const sizes = {};
      for (const r of rows) {
        const safe = r.cwd.replace(/'/g, "''");
        const files = query(`SELECT rollout_path FROM threads WHERE cwd='${safe}'`);
        let total = 0;
        for (const f of files) {
          if (f.rollout_path) { try { total += fs.statSync(f.rollout_path).size; } catch(e) {} }
        }
        sizes[r.cwd] = total;
      }
      return sendJSON(res, sizes);
    }
    if (pathname === '/api/log-size') {
      let total = 0;
      try {
        for (const f of fs.readdirSync(CODEX_DIR)) {
          if (f.startsWith('logs_') || f.startsWith('state_')) {
            try { total += fs.statSync(path.join(CODEX_DIR, f)).size; } catch(e) {}
          }
        }
      } catch(e) {}
      return sendJSON(res, { size: total });
    }
  }

  // ── POST handlers ──
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (pathname === '/api/delete' && data.ids) {
          for (const id of data.ids) {
            const safe = id.replace(/'/g, "''");
            const rows = query(`SELECT rollout_path FROM threads WHERE id='${safe}'`);
            if (rows[0]?.rollout_path) try { fs.unlinkSync(rows[0].rollout_path); } catch(e) {}
            mutate(`DELETE FROM threads WHERE id='${safe}'`);
          }
          return sendJSON(res, { deleted: data.ids.length });
        }
        if (pathname === '/api/delete-project' && data.cwd) {
          const safe = data.cwd.replace(/'/g, "''");
          const rows = query(`SELECT rollout_path FROM threads WHERE cwd='${safe}'`);
          for (const r of rows) {
            if (r.rollout_path) try { fs.unlinkSync(r.rollout_path); } catch(e) {}
          }
          mutate(`DELETE FROM threads WHERE cwd='${safe}'`);
          return sendJSON(res, { deleted: rows.length });
        }
        if (pathname === '/api/archive' && data.ids) {
          const now = Math.floor(Date.now() / 1000);
          for (const id of data.ids) {
            mutate(`UPDATE threads SET archived=1, archived_at=${now} WHERE id='${id.replace(/'/g, "''")}'`);
          }
          return sendJSON(res, { archived: data.ids.length });
        }
        sendJSON(res, {error:'bad request'}, 400);
      } catch(e) {
        sendJSON(res, {error:e.message}, 500);
      }
    });
    return;
  }

  sendJSON(res, {error:'not found'}, 404);
}).listen(PORT, '127.0.0.1');

