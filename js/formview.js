/*
 * 서식 렌더러 — 같은 스키마로 '입력(edit)'과 '보기/인쇄(view)' 두 모드를 그립니다.
 * 입력값은 data 객체에 data-path(JSON 배열) 경로로 즉시 반영됩니다.
 */
(function (PPP) {
  'use strict';
  var esc = function (s) { return PPP.ui.esc(s); };
  var idSeq = 0;

  function P(path) { return esc(JSON.stringify(path)); }
  function getPath(obj, path) {
    return path.reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function setPath(obj, path, val) {
    var o = obj;
    for (var i = 0; i < path.length - 1; i++) {
      if (o[path[i]] == null || typeof o[path[i]] !== 'object') o[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
      o = o[path[i]];
    }
    o[path[path.length - 1]] = val;
  }
  function fmtNum(v) { var n = Number(v); return v === '' || v == null || isNaN(n) ? '' : n.toLocaleString('ko-KR'); }
  function fmtDate(v) { if (!v) return ''; var p = v.split('-'); return p[0] + '년 ' + Number(p[1]) + '월 ' + Number(p[2]) + '일'; }
  function ph(text, ctx) { return String(text || '').replace(/\{Y\}/g, ctx.year || '____').replace(/\{Y1\}/g, ctx.year ? ctx.year + 1 : '____'); }

  /* ---------- 단일 입력 ---------- */
  function input(def, path, data, mode, label) {
    var v = getPath(data, path);
    var type = def.input || 'text';
    if (mode === 'view') {
      if (type === 'checks' || type === 'radio') {
        var sel = type === 'checks' ? (Array.isArray(v) ? v : []) : [v];
        return '<span class="v-opts' + (def.column ? ' col' : '') + '">' + def.options.map(function (o) { return '<span class="v-opt">' + (sel.indexOf(o) >= 0 ? '■' : '□') + ' ' + esc(o) + '</span>'; }).join('') + '</span>';
      }
      var shown = type === 'date' ? fmtDate(v) : (type === 'number' ? fmtNum(v) : (v == null ? '' : String(v)));
      return '<span class="v-text' + (type === 'textarea' ? ' multi' : '') + '">' + esc(shown) + '</span>';
    }
    var id = 'f' + (++idSeq);
    var aria = ' aria-label="' + esc(label || def.label || '') + '"';
    var dp = ' data-path="' + P(path) + '"';
    switch (type) {
      case 'textarea':
        return '<textarea id="' + id + '" rows="' + (def.rowsN || 2) + '"' + dp + aria + '>' + esc(v || '') + '</textarea>';
      case 'select':
        return '<select id="' + id + '"' + dp + aria + '><option value="">선택</option>' + def.options.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      case 'radio':
      case 'checks':
        var name = 'n' + id;
        var arr = type === 'checks' ? (Array.isArray(v) ? v : []) : null;
        return '<fieldset class="opts' + (def.column ? ' col' : '') + '"><legend class="sr-only">' + esc(label || def.label || '') + '</legend>' + def.options.map(function (o, i) {
          var checked = type === 'checks' ? arr.indexOf(o) >= 0 : v === o;
          return '<label class="opt" for="' + id + '_' + i + '"><input id="' + id + '_' + i + '" type="' + (type === 'checks' ? 'checkbox' : 'radio') + '" name="' + name + '" value="' + esc(o) + '"' + (checked ? ' checked' : '') + dp + ' data-kind="' + type + '"> ' + esc(o) + '</label>';
        }).join('') + (type === 'radio' ? '<button type="button" class="link-btn clear-radio" data-clear="' + P(path) + '" aria-label="' + esc((label || def.label || '') + ' 선택 해제') + '">해제</button>' : '') + '</fieldset>';
      case 'number':
        return '<input id="' + id + '" type="number" inputmode="decimal" step="any"' + (def.min != null ? ' min="' + def.min + '"' : ' min="0"') + ' value="' + esc(v == null ? '' : v) + '"' + dp + aria + ' data-kind="number">';
      case 'date':
        return '<input id="' + id + '" type="date" max="2100-12-31" value="' + esc(v || '') + '"' + dp + aria + '>';
      case 'tel':
        return '<input id="' + id + '" type="tel" inputmode="tel" placeholder="010-0000-0000" value="' + esc(v || '') + '"' + dp + aria + ' data-kind="tel">';
      default:
        return '<input id="' + id + '" type="text" value="' + esc(v || '') + '"' + dp + aria + '>';
    }
  }
  function inline(def, data, mode, rowLabel) {
    var inner = input(def, [def.key], data, mode, def.label || rowLabel);
    return '<span class="inline-group' + (def.input === 'checks' && def.column ? ' block' : '') + '">' + (def.prefix ? '<span class="affix">' + esc(def.prefix) + '</span>' : '') + inner + (def.suffix ? '<span class="affix">' + esc(def.suffix) + '</span>' : '') + '</span>';
  }

  /* ---------- 블록 ---------- */
  function blockTitle(b) { return b.title ? '<h4 class="blk-title">' + esc(b.title) + '</h4>' : ''; }

  function fields(b, data, mode) {
    var rows = b.rows.map(function (r) {
      var content = r.inputs ? r.inputs.map(function (d) { return inline(d, data, mode, r.label); }).join('') : inline(r, data, mode, r.label);
      var hint = r.hint ? '<span class="hint">' + esc(r.hint) + '</span>' : '';
      if (r.hideLabel) return '<tr><td colspan="2" class="td-full">' + content + '</td></tr>';
      if (r.wide) return '<tr><th colspan="2" class="th-wide" scope="colgroup">' + esc(r.label) + hint + '</th></tr><tr><td colspan="2" class="td-full">' + content + '</td></tr>';
      return '<tr><th scope="row">' + esc(r.label) + hint + '</th><td>' + content + '</td></tr>';
    }).join('');
    return blockTitle(b) + '<table class="ftable' + (b.sensitive ? ' sensitive' : '') + '"><tbody>' + rows + '</tbody></table>';
  }

  function group(b, data, mode) {
    var rows = b.items.map(function (it, i) {
      return '<tr>' + (i === 0 ? '<th scope="rowgroup" rowspan="' + b.items.length + '" class="th-group">' + esc(b.label) + '</th>' : '') +
        '<th scope="row" class="th-sub">' + esc(it.label) + '</th><td>' + input({ input: 'text', key: it.key }, [it.key], data, mode, b.label + ' - ' + it.label) + '</td></tr>';
    }).join('');
    return blockTitle(b) + '<table class="ftable grouped"><tbody>' + rows + '</tbody></table>';
  }

  function grid(b, data, mode) {
    var list = getPath(data, [b.key]);
    list = Array.isArray(list) ? list : [];
    var n = b.fixedRows ? b.fixedRows.length : Math.max(b.rows || 1, list.length);
    var editAdd = mode === 'edit' && b.addable;
    var head = '<tr>' + (b.fixedRows ? '<th scope="col" class="th-rowhead">' + esc(b.rowHeader || '') + '</th>' : '') +
      b.columns.map(function (c) { return '<th scope="col"' + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + esc(c.label) + '</th>'; }).join('') +
      (editAdd ? '<th scope="col" class="th-act"><span class="sr-only">행 삭제</span></th>' : '') + '</tr>';
    var body = '';
    for (var i = 0; i < n; i++) {
      var rowLabel = b.fixedRows ? b.fixedRows[i] : (i + 1) + '행';
      body += '<tr>' + (b.fixedRows ? '<th scope="row">' + esc(b.fixedRows[i]) + '</th>' : '') +
        b.columns.map(function (c) { return '<td>' + input(c, [b.key, i, c.key], data, mode, rowLabel + ' ' + c.label) + '</td>'; }).join('') +
        (editAdd ? '<td class="td-act"><button type="button" class="icon-btn" data-del-row="' + esc(b.key) + '" data-idx="' + i + '" aria-label="' + (i + 1) + '번째 행 삭제" title="행 삭제">×</button></td>' : '') + '</tr>';
    }
    return blockTitle(b) + '<div class="tbl-scroll"><table class="ftable grid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      (editAdd ? '<button type="button" class="btn btn-ghost btn-sm add-row" data-add-row="' + esc(b.key) + '">+ 행 추가</button>' : '');
  }

  function weekly(b, data, mode) {
    var head = '<tr><th scope="col" class="th-rowhead">구분</th>' + PPP.DAYS.map(function (d) { return '<th scope="col">' + d + '</th>'; }).join('') + '</tr>';
    var body = b.rows.map(function (r, ri) {
      return '<tr><th scope="row">' + esc(r) + '</th>' + PPP.DAYS.map(function (d) { return '<td>' + input({ input: 'textarea', rowsN: 2 }, [b.key, String(ri), d], data, mode, r + ' ' + d + '요일') + '</td>'; }).join('') + '</tr>';
    }).join('');
    return blockTitle(b) + '<div class="tbl-scroll"><table class="ftable weekly"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function matrix(b, data, mode) {
    var head = '<tr><th scope="col" rowspan="2" class="th-item">' + esc(b.itemHeader) + '</th><th scope="colgroup" colspan="' + b.scale.length + '">스스로 할 수 있나요?</th></tr><tr>' +
      b.scale.map(function (s) { return '<th scope="col" class="th-scale">' + esc(s) + '</th>'; }).join('') + '</tr>';
    var body = b.groups.map(function (g, gi) {
      return '<tr class="mgroup"><th scope="rowgroup" colspan="' + (b.scale.length + 1) + '">' + esc(g.title) + '</th></tr>' + g.items.map(function (it, ii) {
        var k = gi + '_' + ii;
        var v = getPath(data, [b.key, k]);
        var name = 'm' + (++idSeq);
        return '<tr><th scope="row" class="th-mitem">' + esc(it) + '</th>' + b.scale.map(function (s, si) {
          if (mode === 'view') return '<td class="center">' + (v === si ? '●' : '') + '</td>';
          return '<td class="center"><input type="radio" name="' + name + '" value="' + si + '"' + (v === si ? ' checked' : '') + ' data-path="' + P([b.key, k]) + '" data-kind="level" aria-label="' + esc(it + ': ' + s) + '"></td>';
        }).join('') + '</tr>';
      }).join('');
    }).join('');
    return blockTitle(b) + '<div class="tbl-scroll"><table class="ftable matrix"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function checkgrid(b, data, mode) {
    var head = '<tr><th scope="col">항목</th>' + b.columns.map(function (c) { return '<th scope="col">' + esc(c.label) + '</th>'; }).join('') + '</tr>';
    var body = b.items.map(function (it, i) {
      var checked = !!getPath(data, [b.key, i, 'checked']);
      var first = mode === 'view' ? (checked ? '■ ' : '□ ') + esc(it) :
        '<label class="opt"><input type="checkbox" data-path="' + P([b.key, i, 'checked']) + '" data-kind="bool"' + (checked ? ' checked' : '') + '> ' + esc(it) + '</label>';
      return '<tr><th scope="row" class="th-check">' + first + '</th>' + b.columns.map(function (c) { return '<td>' + input({ input: 'text' }, [b.key, i, c.key], data, mode, it + ' ' + c.label) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return blockTitle(b) + '<div class="tbl-scroll"><table class="ftable grid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function compare(b, data, mode) {
    var head = '<tr><th scope="col">구분</th><th scope="col">현재</th><th scope="col">미래</th><th scope="col">이유</th></tr>';
    var body = b.rows.map(function (r) {
      function side(s) {
        var opts = s === 'future' && r.futureOptions ? r.futureOptions : r.options;
        var def = r.input === 'checks' ? { input: 'checks', options: opts, column: true } : { input: 'text' };
        var html = input(def, [b.key, r.key, s], data, mode, r.label + ' (' + (s === 'now' ? '현재' : '미래') + ')');
        if (r.detail || (r.options && r.options.indexOf('기타') >= 0)) {
          html += '<span class="inline-group"><span class="affix">' + (r.detail ? '지역' : '기타') + '</span>' + input({ input: 'text' }, [b.key, r.key, s + 'Detail'], data, mode, r.label + ' ' + (s === 'now' ? '현재' : '미래') + ' 상세') + '</span>';
        }
        return html;
      }
      return '<tr><th scope="row">' + esc(r.label) + '</th><td>' + side('now') + '</td><td>' + side('future') + '</td><td>' + input({ input: 'textarea' }, [b.key, r.key, 'reason'], data, mode, r.label + ' 이유') + '</td></tr>';
    }).join('');
    return blockTitle(b) + '<div class="tbl-scroll"><table class="ftable compare"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function amountTotal(b, data, gi) {
    var groups = gi == null ? b.groups.map(function (_, i) { return i; }) : [gi];
    var sum = 0;
    groups.forEach(function (g) {
      b.groups[g].items.forEach(function (it, ii) {
        var v = Number(getPath(data, [b.key, g + '_' + ii, 'v']));
        if (!isNaN(v)) sum += v * (it.sign || 1);
      });
    });
    return sum;
  }
  function amounts(b, data, mode) {
    var hasCat = b.groups.some(function (g) { return g.items.some(function (it) { return it.cat; }); });
    var head = '<tr><th scope="col">구분</th>' + (hasCat ? '<th scope="col">세부</th>' : '') + '<th scope="col">항목</th><th scope="col">' + esc(b.valueLabel) + '</th>' + (b.ratioLabel ? '<th scope="col">' + esc(b.ratioLabel) + '</th>' : '') + '</tr>';
    var cols = (hasCat ? 4 : 3) + (b.ratioLabel ? 1 : 0);
    var body = b.groups.map(function (g, gi) {
      var span = g.items.length + (b.grandTotal ? 0 : 1);
      var rows = g.items.map(function (it, ii) {
        var k = gi + '_' + ii;
        var catCell = '';
        if (hasCat) {
          var first = ii === 0 || g.items[ii - 1].cat !== it.cat;
          if (first) { var n = g.items.filter(function (x) { return x.cat === it.cat; }).length; catCell = '<th scope="rowgroup" rowspan="' + n + '" class="th-sub">' + esc(it.cat || '') + '</th>'; }
        }
        return '<tr>' + (ii === 0 ? '<th scope="rowgroup" rowspan="' + span + '" class="th-group">' + esc(g.label) + '</th>' : '') + catCell +
          '<th scope="row" class="th-mitem">' + esc(it.label) + '</th><td class="num">' + input({ input: 'number', min: 0 }, [b.key, k, 'v'], data, mode, g.label + ' ' + it.label + ' 금액') + '</td>' +
          (b.ratioLabel ? '<td>' + input({ input: 'select', options: ['1', '2', '3', '4', '5'] }, [b.key, k, 'ratio'], data, mode, it.label + ' 장애인 지출 비율') + '</td>' : '') + '</tr>';
      }).join('');
      if (!b.grandTotal) rows += '<tr class="total"><th scope="row" colspan="' + (cols - 2 - (b.ratioLabel ? 1 : 0)) + '">총 계</th><td class="num" data-total="' + esc(b.key) + '" data-g="' + gi + '">' + fmtNum(amountTotal(b, data, gi)) + '</td>' + (b.ratioLabel ? '<td></td>' : '') + '</tr>';
      return rows;
    }).join('');
    if (b.grandTotal) body += '<tr class="total"><th scope="row" colspan="' + (cols - 1 - (b.ratioLabel ? 1 : 0)) + '">총 계</th><td class="num" data-total="' + esc(b.key) + '">' + fmtNum(amountTotal(b, data)) + '</td>' + (b.ratioLabel ? '<td></td>' : '') + '</tr>';
    return blockTitle(b) + '<div class="tbl-scroll"><table class="ftable amounts"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function photo(b, data, mode) {
    var src = data[b.key];
    var img = src ? '<img src="' + esc(src) + '" alt="참여자 사진">' : '<span class="photo-empty">' + esc(b.label) + '</span>';
    var ctrl = mode === 'edit' ? '<div class="photo-ctrl"><label class="btn btn-ghost btn-sm" for="photo-in">사진 선택</label><input type="file" id="photo-in" accept="image/*" data-photo="' + esc(b.key) + '" class="sr-only">' +
      (src ? '<button type="button" class="btn btn-ghost btn-sm" data-photo-del="' + esc(b.key) + '">사진 삭제</button>' : '') + '<span class="hint">긴 변 480px로 줄여 저장합니다. 본인·보호자 동의 후 등록하세요.</span></div>' : '';
    return '<table class="ftable photo-tbl"><tbody><tr><td class="photo-cell"><div class="photo-box">' + img + '</div>' + ctrl + '</td></tr><tr><th scope="row" class="th-wide">' + esc(b.captionLabel) + '</th></tr><tr><td>' + input({ input: 'textarea' }, [b.captionKey], data, mode, '사진 설명') + '</td></tr></tbody></table>';
  }

  var BLOCKS = { fields: fields, group: group, grid: grid, weekly: weekly, matrix: matrix, checkgrid: checkgrid, compare: compare, amounts: amounts, photo: photo,
    note: function (b) { return '<p class="form-note">' + esc(b.text) + '</p>'; } };

  /* ---------- 서식 전체 ---------- */
  function render(form, data, mode, ctx) {
    ctx = ctx || {};
    var title = form.nameInTitle ? '《 ' + esc(ctx.name || '　　　') + ' 》' + esc(form.title) : esc(form.title);
    var yearTag = form.yearly && form.id === 'plan' ? '<span class="doc-year">' + esc(ctx.year || '') + '년</span>' : '';
    var html = '<article class="doc doc-' + form.id + ' mode-' + mode + '">';
    html += '<header class="doc-head">' + (form.program ? '<p class="doc-program">' + esc(form.program) + '</p>' : '') +
      '<h2 class="doc-title">' + yearTag + title + '</h2>' + (form.subtitle ? '<p class="doc-sub">' + esc(form.subtitle) + '</p>' : '') + '</header>';
    if (form.header) {
      html += '<table class="ftable doc-meta"><tbody><tr>' + form.header.map(function (h) { return '<th scope="row">◾ ' + esc(h.label) + '</th><td>' + input(h, [h.key], data, mode, h.label) + '</td>'; }).join('') + '</tr></tbody></table>';
    }
    if (form.preface) html += '<p class="doc-preface">' + esc(form.preface) + '</p>';
    form.sections.forEach(function (s) {
      html += '<section class="form-section' + (s.area ? ' area-section' : '') + (s.sensitive ? ' sensitive' : '') + '" id="sec-' + s.id + '">';
      if (s.nameTitle) html += '<h3 class="name-title">《 ' + esc(ctx.name || '　　　') + ' 》의 이야기</h3>';
      if (s.title) {
        html += s.area ? '<h3 class="area-title"><span class="area-name">' + esc(s.title) + '</span><span class="area-lead">' + esc(s.lead || '') + '</span></h3>'
          : '<h3 class="sec-title">' + esc(ph(s.title, ctx)) + '</h3>';
      }
      if (s.sensitive && mode === 'edit') html += '<p class="sensitive-note" role="note">민감정보 영역입니다. 상담·계획에 꼭 필요한 항목만 기록하고, 본인·보호자 동의 범위를 지켜주세요.</p>';
      s.blocks.forEach(function (b) { html += '<div class="blk blk-' + b.type + '">' + BLOCKS[b.type](b, data, mode) + '</div>'; });
      html += '</section>';
    });
    return html + '</article>';
  }

  /* ---------- 입력 이벤트 바인딩 ---------- */
  function resizeImage(file, max) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error('이미지 파일만 선택할 수 있습니다.'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('15MB 이하 이미지만 선택할 수 있습니다.'));
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다.')); };
      img.src = url;
    });
  }

  function bind(root, form, data, hooks) {
    function blockByKey(key) {
      var found = null;
      form.sections.forEach(function (s) { s.blocks.forEach(function (b) { if (b.key === key) found = b; }); });
      return found;
    }
    function updateTotals(key) {
      var b = blockByKey(key); if (!b || b.type !== 'amounts') return;
      root.querySelectorAll('[data-total="' + key + '"]').forEach(function (td) {
        var g = td.getAttribute('data-g');
        td.textContent = fmtNum(amountTotal(b, data, g == null ? null : Number(g)));
      });
    }
    function onField(e) {
      var el = e.target;
      var raw = el.getAttribute('data-path');
      if (!raw) return;
      var path = JSON.parse(raw);
      var kind = el.getAttribute('data-kind');
      if (kind === 'checks') {
        var arr = getPath(data, path);
        arr = Array.isArray(arr) ? arr.slice() : [];
        var i = arr.indexOf(el.value);
        if (el.checked && i < 0) arr.push(el.value);
        if (!el.checked && i >= 0) arr.splice(i, 1);
        setPath(data, path, arr);
      } else if (kind === 'radio') {
        setPath(data, path, el.value);
      } else if (kind === 'level') {
        setPath(data, path, Number(el.value));
      } else if (kind === 'bool') {
        setPath(data, path, el.checked);
      } else if (kind === 'number') {
        var ok = el.value === '' || (!isNaN(Number(el.value)) && Number(el.value) >= (el.min === '' ? -Infinity : Number(el.min)));
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        setPath(data, path, el.value === '' ? '' : Number(el.value));
        if (path.length === 3 && path[2] === 'v') updateTotals(path[0]);
      } else if (kind === 'tel') {
        var good = el.value === '' || /^[0-9+\-() ]{7,20}$/.test(el.value);
        el.setAttribute('aria-invalid', good ? 'false' : 'true');
        setPath(data, path, el.value);
      } else {
        setPath(data, path, el.value);
      }
      hooks.dirty();
    }
    root.addEventListener('input', onField);
    root.addEventListener('change', function (e) {
      if (e.target.matches('[data-photo]')) {
        var key = e.target.getAttribute('data-photo');
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        resizeImage(f, 480).then(function (url) { data[key] = url; hooks.dirty(); hooks.rerender(); })
          .catch(function (err) { PPP.ui.toast(err.message, 'error'); });
        return;
      }
      if (e.target.type === 'radio' || e.target.type === 'checkbox' || e.target.tagName === 'SELECT') onField(e);
    });
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-add-row')) {
        var k = t.getAttribute('data-add-row');
        var b = blockByKey(k);
        var list = Array.isArray(data[k]) ? data[k] : [];
        while (list.length < (b.rows || 1)) list.push({});
        list.push({});
        data[k] = list; hooks.dirty(); hooks.rerender();
      } else if (t.hasAttribute('data-del-row')) {
        var key = t.getAttribute('data-del-row'), idx = Number(t.getAttribute('data-idx'));
        var bl = blockByKey(key);
        var arr = Array.isArray(data[key]) ? data[key] : [];
        while (arr.length < (bl.rows || 1)) arr.push({});
        arr.splice(idx, 1);
        data[key] = arr; hooks.dirty(); hooks.rerender();
      } else if (t.hasAttribute('data-clear')) {
        var p = JSON.parse(t.getAttribute('data-clear'));
        setPath(data, p, '');
        t.closest('fieldset').querySelectorAll('input').forEach(function (r) { r.checked = false; });
        hooks.dirty();
      } else if (t.hasAttribute('data-photo-del')) {
        data[t.getAttribute('data-photo-del')] = '';
        hooks.dirty(); hooks.rerender();
      }
    });
  }

  /* 작성 정도 (빈칸이 아닌 값 수) */
  function filledCount(data) {
    var n = 0;
    (function walk(v) {
      if (v == null || v === '' || v === false) return;
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (typeof v === 'object') { Object.keys(v).forEach(function (k) { walk(v[k]); }); return; }
      n++;
    })(data);
    return n;
  }

  PPP.formview = { render: render, bind: bind, filledCount: filledCount, fmtDate: fmtDate, getPath: getPath };
})(window.PPP = window.PPP || {});
