/* ═══════════════════════════════════════
   CODE-ENHANCE.JS
   Two jobs, both progressive enhancement — with JS off, every block below is
   still fully readable and correctly coloured, because the prompt/mode/token
   markup is emitted at build time by render-codeblock.html and the session,
   file and diff shortcodes. Nothing here is load-bearing for legibility.

     1. cpInput()  copy that strips prompts and program output.
     2. ANSI SGR   -> spans, for session blocks pasted with real escape codes.

   Load after article.js (which defines cpPre and owns .code-block wrapping).
═══════════════════════════════════════ */

/* ─── 1. COPY INPUT ───
   A plain "copy" on a session or config block is a trap: it hands you the
   prompts and the program output, and pasting that into a shell is a mess of
   command-not-found. These two strip both, so the paste is runnable.

   Session: the typed lines are already marked .s-cmd at build time, so we just
   collect those.
   IOS: keep prompt lines, drop the prompt itself, drop output/errors, and drop
   show-commands too — what is left pastes into a router already in 'conf t'. */
function cpInput(btn){
  const block = btn.closest('.code-block');
  const pre   = block && block.querySelector('pre');
  if(!pre) return;

  let text;
  const typed = pre.querySelectorAll('.s-cmd');
  if(typed.length){
    text = [...typed].map(el => el.textContent).join('\n');
  } else {
    const PROMPT = /^[A-Za-z][\w.-]*(\([\w-]+\))?[#>]/;
    const EXEC   = /^(show|debug|undebug|ping|traceroute|telnet|ssh|dir|more|clear|terminal|copy|write|reload)\b/i;
    text = pre.innerText.split('\n').filter(l => PROMPT.test(l)).map(l => {
      const cmd = l.replace(PROMPT, '').replace(/\s+!.*$/, '').trim();
      return EXEC.test(cmd) ? '' : cmd;
    }).filter(Boolean).join('\n');
  }

  navigator.clipboard.writeText(text).then(() => {
    const was = btn.textContent;
    btn.textContent = 'ok!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = was; btn.classList.remove('copied'); }, 1500);
  });
}

/* ─── 2. ANSI SGR -> SPANS ───
   Only the sixteen colour codes, bold, dim, italic, underline and reset — the
   subset a systemctl / ip / git / docker paste actually emits. Anything else
   is dropped rather than guessed at. Classes are .a-3x / .a-9x and map to the
   same eight hues as the syntax tokens (code.css). */
(function(){
  const blocks = document.querySelectorAll('.session-pre[data-ansi="true"], .out-pre');
  if(!blocks.length) return;

  const SGR = /\x1b\[([0-9;]*)m/g;

  function convert(raw){
    let outHtml = '', open = 0, last = 0, m;
    SGR.lastIndex = 0;
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    while((m = SGR.exec(raw)) !== null){
      outHtml += esc(raw.slice(last, m.index));
      last = m.index + m[0].length;

      const codes = (m[1] === '' ? '0' : m[1]).split(';').map(Number);
      if(codes.includes(0)){
        while(open > 0){ outHtml += '</span>'; open--; }
        continue;
      }
      const cls = [];
      codes.forEach(c => {
        if(c === 1) cls.push('a-b');
        else if(c === 2) cls.push('a-d');
        else if(c === 3) cls.push('a-i');
        else if(c === 4) cls.push('a-u');
        else if((c >= 30 && c <= 37) || (c >= 90 && c <= 97)) cls.push('a-' + c);
      });
      if(cls.length){ outHtml += '<span class="' + cls.join(' ') + '">'; open++; }
    }
    outHtml += esc(raw.slice(last));
    while(open > 0){ outHtml += '</span>'; open--; }
    return outHtml;
  }

  blocks.forEach(pre => {
    const code = pre.querySelector('code') || pre;
    const raw  = code.textContent;
    if(raw.indexOf('\x1b[') === -1) return;
    code.innerHTML = convert(raw);
  });
})();
