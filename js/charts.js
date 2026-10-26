/*
 * SVG 차트 (외부 라이브러리 없음)
 *  - 범주색은 고정 순서로 배정 (validate_palette 검증: 라이트 모드, 보조 인코딩 = 범례 수치 + 2px 간격 + 표 보기)
 *  - 8번째 범주부터는 '기타'로 합칩니다.
 */
(function (PPP) {
  'use strict';
  var esc = function (s) { return PPP.ui.esc(s); };
  var SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)'];
  var MAX = SERIES.length;
  var seq = 0;

  function fold(data) {
    var rows = data.filter(function (d) { return d.value > 0; });
    if (rows.length <= MAX) return rows;
    var head = rows.slice(0, MAX - 1);
    var rest = rows.slice(MAX - 1).reduce(function (s, d) { return s + d.value; }, 0);
    return head.concat([{ label: '기타', value: rest }]);
  }
  function arc(cx, cy, r, a0, a1) {
    var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2);
  }
  function table(caption, rows, unit, total) {
    return '<details class="chart-table"><summary>표로 보기</summary><table class="tbl compact"><caption class="sr-only">' + esc(caption) + '</caption><thead><tr><th scope="col">구분</th><th scope="col">' + esc(unit) + '</th>' + (total ? '<th scope="col">비율</th>' : '') + '</tr></thead><tbody>' +
      rows.map(function (d) { return '<tr><th scope="row">' + esc(d.label) + '</th><td class="num">' + d.value + '</td>' + (total ? '<td class="num">' + Math.round(d.value / total * 100) + '%</td>' : '') + '</tr>'; }).join('') +
      '</tbody></table></details>';
  }

  /* 도넛(원형) 차트 */
  function donut(title, data, opts) {
    opts = opts || {};
    var unit = opts.unit || '명';
    var rows = fold(data);
    var total = rows.reduce(function (s, d) { return s + d.value; }, 0);
    var id = 'c' + (++seq);
    if (!total) return '<figure class="chart"><figcaption class="chart-title">' + esc(title) + '</figcaption><p class="empty-mini">표시할 데이터가 없습니다.</p></figure>';
    var cx = 80, cy = 80, r = 62, w = 22;
    var a = -Math.PI / 2;
    var gap = rows.length > 1 ? 0.035 : 0;
    var paths = rows.map(function (d, i) {
      var sweep = d.value / total * Math.PI * 2;
      var a0 = a + gap / 2, a1 = a + sweep - gap / 2;
      a += sweep;
      var dPath = rows.length === 1 ? 'M' + cx + ' ' + (cy - r) + 'A' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) : arc(cx, cy, r, a0, a1);
      var pct = Math.round(d.value / total * 100);
      return '<path class="seg" d="' + dPath + '" stroke="' + SERIES[i] + '" stroke-width="' + w + '" fill="none" data-tip="' + esc(d.label) + ': ' + d.value + unit + ' (' + pct + '%)" tabindex="-1"><title>' + esc(d.label) + ' ' + d.value + unit + ' (' + pct + '%)</title></path>';
    }).join('');
    var legend = rows.map(function (d, i) {
      return '<li><span class="sw" style="background:' + SERIES[i] + '"></span><span class="lg-label">' + esc(d.label) + '</span><span class="lg-val">' + d.value + unit + ' · ' + Math.round(d.value / total * 100) + '%</span></li>';
    }).join('');
    return '<figure class="chart chart-donut" aria-labelledby="' + id + '">' +
      '<figcaption class="chart-title" id="' + id + '">' + esc(title) + '</figcaption>' +
      '<div class="donut-wrap"><svg viewBox="0 0 160 160" role="img" aria-label="' + esc(title + ': ' + rows.map(function (d) { return d.label + ' ' + d.value + unit; }).join(', ')) + '">' + paths +
      '<text x="80" y="76" text-anchor="middle" class="donut-total">' + total + '</text><text x="80" y="96" text-anchor="middle" class="donut-unit">' + esc(opts.totalLabel || ('전체(' + unit + ')')) + '</text></svg>' +
      '<ul class="legend">' + legend + '</ul></div>' + table(title, rows, unit, total) + '</figure>';
  }

  /* 가로 막대 (단일 계열) */
  function bars(title, data, opts) {
    opts = opts || {};
    var unit = opts.unit || '건';
    var rows = data.filter(function (d) { return opts.keepZero || d.value > 0; });
    var id = 'c' + (++seq);
    if (!rows.length) return '<figure class="chart"><figcaption class="chart-title">' + esc(title) + '</figcaption><p class="empty-mini">표시할 데이터가 없습니다.</p></figure>';
    var max = opts.max || Math.max.apply(null, rows.map(function (d) { return d.value; }));
    var items = rows.map(function (d) {
      var pct = max ? d.value / max * 100 : 0;
      return '<li data-tip="' + esc(d.label) + ': ' + d.value + unit + '"><span class="bar-label">' + esc(d.label) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + pct.toFixed(1) + '%;' + (opts.color ? 'background:' + opts.color : '') + '"></span></span><span class="bar-val">' + d.value + unit + '</span></li>';
    }).join('');
    return '<figure class="chart chart-bars" aria-labelledby="' + id + '"><figcaption class="chart-title" id="' + id + '">' + esc(title) + '</figcaption>' +
      (opts.note ? '<p class="chart-note">' + esc(opts.note) + '</p>' : '') +
      '<ul class="bars" role="list">' + items + '</ul>' + table(title, rows, unit, 0) + '</figure>';
  }

  /* 차트 위 공용 툴팁 */
  function bindTooltips(root) {
    var tip = document.getElementById('chart-tip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'chart-tip'; tip.setAttribute('role', 'presentation'); document.body.appendChild(tip); }
    root.querySelectorAll('[data-tip]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        tip.textContent = el.getAttribute('data-tip');
        tip.style.display = 'block';
        tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px';
        tip.style.top = (e.clientY + 14) + 'px';
        el.classList.add('hover');
      });
      el.addEventListener('mouseleave', function () { tip.style.display = 'none'; el.classList.remove('hover'); });
    });
  }

  PPP.charts = { donut: donut, bars: bars, bindTooltips: bindTooltips };
})(window.PPP = window.PPP || {});
