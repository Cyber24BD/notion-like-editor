export const CUSTOM_HTML_CHANNEL = 'notion-custom-html'

export interface CustomHtmlSource {
  html: string
  css: string
  javascript: string
}

export const DEFAULT_CUSTOM_HTML = `<div class="custom-card">
  <span class="custom-eyebrow">CUSTOM BLOCK</span>
  <h2>Make it yours</h2>
  <p>Write HTML, CSS and JavaScript. The result runs in an isolated frame.</p>
  <button id="custom-action" type="button">Clicked 0 times</button>
</div>`

export const DEFAULT_CUSTOM_CSS = `body {
  margin: 0;
  padding: 28px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: #f7f7f5;
  color: #37352f;
}

.custom-card {
  max-width: 520px;
  margin: 0 auto;
  padding: 28px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
}

.custom-eyebrow {
  color: #6b6b67;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

h2 {
  margin: 8px 0 10px;
  font-size: 28px;
  line-height: 1.1;
}

p {
  margin: 0 0 18px;
  color: #6b6b67;
  line-height: 1.55;
}

button {
  border: 0;
  border-radius: 9px;
  padding: 10px 14px;
  background: #2383e2;
  color: #ffffff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}`

export const DEFAULT_CUSTOM_JAVASCRIPT = `const button = document.getElementById('custom-action')
let count = 0

button?.addEventListener('click', () => {
  count += 1
  button.textContent = \`Clicked \${count} \${count === 1 ? 'time' : 'times'}\`
})`

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const BRIDGE = `
<script>
(function () {
  var channel = '${CUSTOM_HTML_CHANNEL}';
  function send(type, payload) {
    try {
      parent.postMessage(Object.assign({ channel: channel, type: type }, payload || {}), '*');
    } catch (error) {}
  }
  function reportHeight() {
    var body = document.body;
    var root = document.documentElement;
    var height = Math.max(
      root ? root.scrollHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
    if (height > 0) send('height', { height: height });
  }
  window.addEventListener('error', function (event) {
    send('error', { message: event.message || 'Script error' });
  });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    send('error', {
      message: reason && reason.message ? reason.message : String(reason || 'Unhandled promise rejection')
    });
  });
  if (window.ResizeObserver) {
    try {
      new ResizeObserver(reportHeight).observe(document.documentElement);
    } catch (error) {}
  }
  window.addEventListener('load', reportHeight);
  setTimeout(reportHeight, 0);
  setTimeout(reportHeight, 120);
  setTimeout(reportHeight, 500);
})();
</script>`

/**
 * Builds a self-contained document for the sandboxed frame. CSS and JS are
 * base64-loaded so user strings such as `</style>` or `</script>` cannot break
 * out of their containers. HTML is intentionally raw: that is the feature.
 */
export function buildCustomHtmlDocument(source: CustomHtmlSource): string {
  const css = toBase64(source.css)
  const javascript = source.javascript.trim()
    ? `<script>
try {
  var run = new Function('return (async function () {' + String.fromCharCode(10) + atob('${toBase64(source.javascript)}') + String.fromCharCode(10) + '})()');
  Promise.resolve(run()).catch(function (error) {
    parent.postMessage({
      channel: '${CUSTOM_HTML_CHANNEL}',
      type: 'error',
      message: error && error.message ? error.message : 'Custom script error'
    }, '*');
  });
} catch (error) {
  parent.postMessage({
    channel: '${CUSTOM_HTML_CHANNEL}',
    type: 'error',
    message: error && error.message ? error.message : 'Custom script error'
  }, '*');
}
</script>`
    : ''

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<style>html,body{margin:0;padding:0}body{min-height:1px}*,*::before,*::after{box-sizing:border-box}</style>
<style id="notion-custom-html-css"></style>
${BRIDGE}
<script>
try {
  document.getElementById('notion-custom-html-css').textContent = atob('${css}');
} catch (error) {}
</script>
</head>
<body>
${source.html}
${javascript}
</body>
</html>`
}

export function downloadCustomHtml(source: CustomHtmlSource): void {
  const blob = new Blob([buildCustomHtmlDocument(source)], {
    type: 'text/html;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'custom-block.html'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
