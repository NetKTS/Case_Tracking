// ตัวแปลง Markdown → HTML แบบเบา (ไม่มี dependency, Node 12+) ใช้ร่วมกันโดย md-to-teams.js และ build-spec.js
// รองรับ: หัวข้อ, ตาราง, รายการ (ซ้อนได้ 1 ระดับ), **ตัวหนา**, *เอียง*, `code`, [ลิงก์](url), > quote, ```code block```, ---
//
// renderMarkdown(md, { teams })  teams: true = ใส่ inline style (Teams เก็บ style ตอนวาง), false = ใช้ class ของเว็บ
// splitSections(md)              แบ่งตามหัวข้อ "## " → [{ id, title, md }]

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ลิงก์ไปไฟล์ .md อื่นในโปรเจกต์ (เช่น HANDOFF.md) ไม่มีในเว็บ → แสดงเป็นข้อความ
function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/<a id="[^"]*"><\/a>/g, "").replace(/&lt;a id="[^"]*"&gt;&lt;\/a&gt;/g, "");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => (/^https?:/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t));
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function renderMarkdown(md, { teams = false } = {}) {
  const st = (css) => (teams ? ` style="${css}"` : "");
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (l.startsWith("```")) {
      const buf = [];
      while (++i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i]);
      html += `<pre${st("font-family:Consolas,monospace;font-size:12px;background:#f4f4f4;padding:8px;white-space:pre")}>${esc(buf.join("\n"))}</pre>`;
    } else if (/^#{1,6} /.test(l)) {
      const n = Math.min(l.match(/^#+/)[0].length + (teams ? 1 : 0), 4);
      html += `<h${n}>${inline(l.replace(/^#+ /, ""))}</h${n}>`;
    } else if (/^-{3,}$/.test(l.trim())) {
      html += "<hr>";
    } else if (l.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      i--;
      const [head, , ...body] = rows;
      html += `<div class="md-table"><table${teams ? ' border="1" cellpadding="6" style="border-collapse:collapse"' : ""}>
        <thead><tr>${cells(head).map((c) => `<th${st("background:#eef0f8;text-align:left")}>${inline(c)}</th>`).join("")}</tr></thead>
        <tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    } else if (/^\s*([-*]|\d+\.) /.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i])) {
        const depth = lines[i].match(/^\s*/)[0].length;
        items.push(`<li${depth ? (teams ? ' style="margin-left:20px"' : ' class="sub"') : ""}>${inline(lines[i].replace(/^\s*([-*]|\d+\.) /, ""))}</li>`);
        i++;
      }
      i--;
      html += ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`;
    } else if (l.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(inline(lines[i++].replace(/^>\s?/, "")));
      i--;
      html += `<blockquote${st("border-left:3px solid #6264a7;padding-left:10px;color:#555")}>${buf.join("<br>")}</blockquote>`;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||```|>|\s*([-*]|\d+\.) |-{3,}$)/.test(lines[i])) buf.push(inline(lines[i++]));
      i--;
      html += `<p>${buf.join("<br>")}</p>`;
    }
  }
  return html;
}

function splitSections(md) {
  return md.replace(/\r\n/g, "\n").split(/\n(?=## )/).map((p, i) => ({
    id: "s" + i,
    title: i ? p.split("\n")[0].replace(/^## /, "") : (p.match(/^# (.+)$/m) || [, ""])[1],
    md: p,
  }));
}

module.exports = { renderMarkdown, splitSections, inline, esc };
