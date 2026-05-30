(function () {
  var script = document.currentScript;
  if (!script) return;

  var tenant = script.getAttribute('data-tenant');
  var color = script.getAttribute('data-color') || '#3B82F6';
  var position = script.getAttribute('data-position') || 'right';
  var baseUrl = script.getAttribute('data-base-url') || (window.location.origin === 'localhost:3000' ? 'http://localhost:3000' : window.location.origin);

  if (!tenant) {
    console.error('BookerMap Widget: missing data-tenant attribute');
    return;
  }

  var styles = document.createElement('style');
  styles.textContent =
    '#bmw-root { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; } ' +
    '#bmw-root *, #bmw-root *::before, #bmw-root *::after { box-sizing: border-box; } ' +
    '#bmw-btn { position: fixed; bottom: 24px; ' + position + ': 24px; z-index: 2147483645; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); transition: transform 0.2s, box-shadow 0.2s; } ' +
    '#bmw-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.3); } ' +
    '#bmw-overlay { position: fixed; inset: 0; z-index: 2147483646; background: rgba(0,0,0,0.4); opacity: 0; visibility: hidden; transition: opacity 0.25s, visibility 0.25s; } ' +
    '#bmw-overlay.open { opacity: 1; visibility: visible; } ' +
    '#bmw-frame { position: fixed; bottom: 0; ' + position + ': 0; z-index: 2147483647; width: 100%; max-width: 400px; height: 0; background: white; border-radius: 16px 16px 0 0; box-shadow: 0 -8px 40px rgba(0,0,0,0.15); transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; } ' +
    '#bmw-frame.open { height: 90vh; max-height: 620px; } ' +
    '#bmw-frame iframe { width: 100%; height: 100%; border: none; } ' +
    '#bmw-close { position: absolute; top: 8px; ' + (position === 'left' ? 'right' : 'left') + ': 8px; z-index: 1; width: 28px; height: 28px; border-radius: 50%; border: none; background: #f3f4f6; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #666; } ' +
    '#bmw-close:hover { background: #e5e7eb; }';

  document.head.appendChild(styles);

  var root = document.createElement('div');
  root.id = 'bmw-root';

  var btn = document.createElement('button');
  btn.id = 'bmw-btn';
  btn.style.backgroundColor = color;
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6.5a2.5 2.5 0 0 0 0 5H20"/><path d="M8 7h8"/><path d="M8 11h6"/><path d="M8 15h4"/></svg>';

  var overlay = document.createElement('div');
  overlay.id = 'bmw-overlay';

  var frame = document.createElement('div');
  frame.id = 'bmw-frame';

  var closeBtn = document.createElement('button');
  closeBtn.id = 'bmw-close';
  closeBtn.innerHTML = '&times;';

  var iframe = document.createElement('iframe');
  iframe.src = baseUrl + '/widget/' + tenant;
  iframe.title = 'BookerMap Booking Widget';
  iframe.allow = '';

  frame.appendChild(closeBtn);
  frame.appendChild(iframe);
  root.appendChild(btn);
  root.appendChild(overlay);
  root.appendChild(frame);
  document.body.appendChild(root);

  function openWidget() {
    overlay.classList.add('open');
    frame.classList.add('open');
    btn.style.display = 'none';
  }

  function closeWidget() {
    overlay.classList.remove('open');
    frame.classList.remove('open');
    btn.style.display = 'flex';
  }

  btn.addEventListener('click', openWidget);
  closeBtn.addEventListener('click', closeWidget);
  overlay.addEventListener('click', closeWidget);

  window.addEventListener('message', function (event) {
    if (event.data.type === 'widget-resize' && event.data.height) {
      var maxH = Math.min(event.data.height + 32, 620);
      frame.style.maxHeight = maxH + 'px';
      if (frame.classList.contains('open')) {
        frame.style.height = maxH + 'px';
      }
    }
    if (event.data.type === 'booking-confirmed') {
      setTimeout(closeWidget, 3000);
    }
  });

  var existingBtn = document.getElementById('bmw-btn');
  if (existingBtn) {
    existingBtn.style.display = 'flex';
  }
})();
