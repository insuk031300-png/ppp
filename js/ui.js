/* 공용 UI 도우미: 이스케이프, 토스트, 확인 대화상자 */
(function (PPP) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function toast(msg, type) {
    var box = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, type === 'error' ? 6000 : 3000);
    setTimeout(function () { el.remove(); }, type === 'error' ? 6500 : 3500);
  }

  /* 모달: 포커스 가두기 + ESC 닫기 + 닫힌 뒤 원래 위치로 포커스 복귀 */
  function modal(opts) {
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      var wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<h2 id="modal-title">' + esc(opts.title) + '</h2><div class="modal-body">' + (opts.html || '<p>' + esc(opts.message).replace(/\n/g, '<br>') + '</p>') + '</div>' +
        '<div class="modal-actions">' + (opts.cancel === false ? '' : '<button type="button" class="btn btn-ghost" data-act="cancel">' + esc(opts.cancelText || '취소') + '</button>') +
        '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + esc(opts.okText || '확인') + '</button></div></div>';
      document.body.appendChild(wrap);
      var dlg = wrap.querySelector('.modal');
      function focusables() { return dlg.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'); }
      function close(val) { wrap.remove(); document.removeEventListener('keydown', onKey, true); if (prev && prev.focus) prev.focus(); resolve(val); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
        if (e.key === 'Tab') {
          var f = focusables(); if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKey, true);
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (b) {
          if (b.getAttribute('data-act') === 'ok') {
            if (opts.onOk) { var r = opts.onOk(dlg); if (r === false) return; close(r === undefined ? true : r); }
            else close(true);
          } else close(false);
        } else if (e.target === wrap) close(false);
      });
      if (opts.onOpen) opts.onOpen(dlg);
      var auto = dlg.querySelector('input, select, textarea') || dlg.querySelector('[data-act="ok"]');
      auto.focus();
    });
  }
  function confirmDlg(title, message, opts) { return modal(Object.assign({ title: title, message: message }, opts || {})); }

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  PPP.ui = { esc: esc, toast: toast, modal: modal, confirm: confirmDlg, download: download };
})(window.PPP = window.PPP || {});
