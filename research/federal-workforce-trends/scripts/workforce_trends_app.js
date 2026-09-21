const $ = id => document.getElementById(id);
const fmt = value => value == null ? '—' : Math.round(value).toLocaleString();
const pct = value => value == null ? '—' : value.toFixed(2) + '%';
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const names = [...new Set(DATA.records.map(row => row.agency))].sort();
const groupOf = Object.fromEntries(DATA.records.map(row => [row.agency, row.group]));
const cfoNames = names.filter(name => groupOf[name] === 'CFO Act');
const otherNames = names.filter(name => groupOf[name] === 'Other agency');
const options = values => values.map(name =>
  `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
$('agency').innerHTML = `
  <option value="">All available agencies</option>
  <option value="__cfo__">CFO Act agencies (24)</option>
  <option value="__other__">Other agencies</option>
  <optgroup label="CFO Act agencies">${options(cfoNames)}</optgroup>
  <optgroup label="Other agencies">${options(otherNames)}</optgroup>`;

const bureauById = new Map(DATA.bureaus.map(row => [row.id, row]));
const bureauLookup = new Map(DATA.bureaus.map(row => [row.id + '|' + row.period, row]));
const bureauLabel = row => row.component === row.agency ? row.bureau :
  `${row.bureau} (${row.component})`;
function refreshBureauOptions() {
  const agency = $('agency').value;
  const individual = agency && agency !== '__cfo__' && agency !== '__other__';
  $('bureau').disabled = !individual;
  if (!individual) {
    $('bureau').innerHTML = '<option value="">Select an individual agency first</option>';
    return;
  }
  const bureaus = [...bureauById.values()].filter(row => row.agency === agency)
    .sort((a, b) => bureauLabel(a).localeCompare(bureauLabel(b)));
  $('bureau').innerHTML = '<option value="">All bureaus in this agency</option>' +
    bureaus.map(row => `<option value="${row.id}">${escapeHtml(bureauLabel(row))}</option>`).join('');
}

const educationKeys = Object.keys(DATA.education_labels);
const bachelorsPlus = ['BACHELORS DEGREE', 'MASTERS OR PROFESSIONAL DEGREE', 'DOCTORATE DEGREE'];
const graduatePlus = ['MASTERS OR PROFESSIONAL DEGREE', 'DOCTORATE DEGREE'];
const reportedKeys = educationKeys.filter(key => key !== 'NO DATA REPORTED');
$('education-options').innerHTML = educationKeys.map(key => `
  <label><input type="checkbox" value="${escapeHtml(key)}" ${bachelorsPlus.includes(key) ? 'checked' : ''}>
  ${escapeHtml(DATA.education_labels[key])}</label>`).join('');
const educationChecks = [...$('education-options').querySelectorAll('input[type="checkbox"]')];
const selectedEducation = () => educationChecks.filter(box => box.checked).map(box => box.value);
const educationCount = row => row ? selectedEducation().reduce((sum, key) =>
  sum + (row.education[key] || 0), 0) : null;
const educationShare = row => row && row.employees ?
  100 * educationCount(row) / row.employees : null;

const lookup = new Map(DATA.records.map(row => [row.agency + '|' + row.period, row]));
function inScope(row, scope) {
  return !scope || (scope === '__cfo__' ? row.group === 'CFO Act' :
    scope === '__other__' ? row.group === 'Other agency' : row.agency === scope);
}
function total(period, scope) {
  const rows = DATA.records.filter(row => row.period === period && inScope(row, scope));
  const sumByKey = (field, keys) => Object.fromEntries(keys.map(key =>
    [key, rows.reduce((sum, row) => sum + (row[field][key] || 0), 0)]));
  return {
    employees: rows.reduce((sum, row) => sum + row.employees, 0),
    selected: rows.reduce((sum, row) => sum + row.selected, 0),
    series: sumByKey('series', Object.keys(DATA.series_labels)),
    education: sumByKey('education', educationKeys)
  };
}
function value(row, measure) {
  if (!row) return null;
  if (measure === 'share') return row.employees ? 100 * row.selected / row.employees : null;
  if (measure === 'education') return educationCount(row);
  if (measure === 'educationShare') return educationShare(row);
  return row[measure];
}
const isPercent = measure => measure === 'share' || measure === 'educationShare';
const measureLabel = measure => ({
  employees: 'employees', selected: 'employees in selected occupational series',
  share: 'selected series share', education: 'employees at selected education levels',
  educationShare: 'selected education share'
})[measure];
function scopeLabel(scope) {
  return scope === '__cfo__' ? 'CFO Act agencies (24)' :
    scope === '__other__' ? 'Other agencies' : scope || 'All available agencies';
}
function renderTrend(values, measure) {
  const present = values.filter(value => value != null);
  const high = Math.max(1, ...present) * 1.1;
  const y = value => 265 - value / high * 220;
  const coords = values.map((value, index) => value == null ? null : [120 + index * 250, y(value)]);
  let svg = '';
  for (let i = 0; i <= 4; i++) {
    const tick = high * i / 4, yy = y(tick);
    svg += `<line x1="95" y1="${yy}" x2="650" y2="${yy}" stroke="#dce5e9"/>`;
    svg += `<text class="axis" x="88" y="${yy + 4}" text-anchor="end">${isPercent(measure) ? pct(tick) : fmt(tick)}</text>`;
  }
  for (let i = 0; i < 2; i++) {
    if (coords[i] && coords[i + 1]) {
      svg += `<line class="line" x1="${coords[i][0]}" y1="${coords[i][1]}" x2="${coords[i + 1][0]}" y2="${coords[i + 1][1]}"/>`;
    }
  }
  for (let i = 0; i < 3; i++) {
    svg += `<text class="axis" x="${120 + i * 250}" y="295" text-anchor="middle">${DATA.periods[i]}</text>`;
    if (coords[i]) {
      const [x, yy] = coords[i], display = isPercent(measure) ? pct(values[i]) : fmt(values[i]);
      svg += `<circle class="point" cx="${x}" cy="${yy}" r="6"><title>${DATA.periods[i]}: ${display}</title></circle>`;
      svg += `<text class="axis" x="${x}" y="${yy - 13}" text-anchor="middle">${display}</text>`;
    }
  }
  $('trend').innerHTML = svg;
}
function renderSeries(row) {
  const counts = row?.series || {};
  const entries = Object.entries(DATA.series_labels).map(([key, name]) =>
    [name, counts[key] || 0]).sort((a, b) => b[1] - a[1]);
  const top = Math.max(1, ...entries.map(entry => entry[1]));
  $('series').innerHTML = entries.map(([name, count]) => `
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin:8px 0">
      <span>${escapeHtml(name)}</span><b>${fmt(count)}</b>
      <div style="grid-column:1/-1;background:#e6eef1;height:9px;border-radius:5px">
        <div class="bar" style="width:${100 * count / top}%;height:9px;border-radius:5px"></div>
      </div>
    </div>`).join('');
}
function renderEducation(row) {
  const counts = row?.education || {}, chosen = selectedEducation();
  const selectedCount = educationCount(row), share = educationShare(row);
  $('education-caption').textContent = row?.employees ?
    `${fmt(selectedCount)} employees (${pct(share)}) across ${chosen.length} selected level${chosen.length === 1 ? '' : 's'}. Shares use all employees in this scope as the denominator.` :
    'No July 2026 employment record for this scope.';
  $('education-summary').textContent = `Education levels · ${chosen.length} selected`;
  $('education-breakdown').innerHTML = educationKeys.map(key => {
    const count = counts[key] || 0, width = row?.employees ? 100 * count / row.employees : 0;
    return `<div style="display:grid;grid-template-columns:minmax(160px,1fr) auto auto;gap:10px;margin:9px 0;align-items:center;${chosen.includes(key) ? 'font-weight:700' : ''}">
      <span>${escapeHtml(DATA.education_labels[key])}</span><span>${fmt(count)}</span><span>${row?.employees ? pct(width) : '—'}</span>
      <div style="grid-column:1/-1;background:#e6eef1;height:9px;border-radius:5px"><div class="bar-secondary" style="width:${width}%;height:9px;border-radius:5px"></div></div>
    </div>`;
  }).join('');
}
function renderTable(scope) {
  const tableNames = names.filter(name => !scope ||
    (scope === '__cfo__' ? groupOf[name] === 'CFO Act' :
      scope === '__other__' ? groupOf[name] === 'Other agency' : name === scope));
  const rows = tableNames.map(name => {
    const start = lookup.get(name + '|2025-09'), middle = lookup.get(name + '|2026-02');
    const end = lookup.get(name + '|2026-07');
    return {name, start, middle, end, change: start && end ? end.employees - start.employees : null};
  }).sort((a, b) => (b.end?.employees || 0) - (a.end?.employees || 0));
  $('rows').innerHTML = rows.map(row => `<tr>
    <td>${escapeHtml(row.name)}</td><td>${fmt(row.start?.employees)}</td>
    <td>${fmt(row.middle?.employees)}</td><td>${fmt(row.end?.employees)}</td>
    <td>${row.change == null ? '—' : (row.change > 0 ? '+' : '') + fmt(row.change)}</td>
    <td>${row.end?.employees ? pct(100 * row.end.selected / row.end.employees) : '—'}</td>
    <td>${pct(educationShare(row.end))}</td>
  </tr>`).join('');
}
function renderBureauTable(scope, selectedId) {
  const individual = scope && scope !== '__cfo__' && scope !== '__other__';
  if (!individual) {
    $('bureau-table-caption').textContent = 'Select an individual agency to see its OPM subelements.';
    $('bureau-rows').innerHTML = '';
    return;
  }
  const bureaus = [...bureauById.values()].filter(row => row.agency === scope)
    .map(row => {
      const start = bureauLookup.get(row.id + '|2025-09');
      const middle = bureauLookup.get(row.id + '|2026-02');
      const end = bureauLookup.get(row.id + '|2026-07');
      return {row, start, middle, end,
        change: start && end ? end.employees - start.employees : null};
    }).sort((a, b) => (b.end?.employees || 0) - (a.end?.employees || 0));
  $('bureau-table-caption').textContent = `${bureaus.length} OPM subelements within ${scope}. Select one above to see its trend and education mix.`;
  $('bureau-rows').innerHTML = bureaus.map(item => `<tr${item.row.id === selectedId ? ' style="background:#e8f3f6;font-weight:700"' : ''}>
    <td>${escapeHtml(bureauLabel(item.row))}</td>
    <td>${fmt(item.start?.employees)}</td>
    <td>${fmt(item.middle?.employees)}</td>
    <td>${fmt(item.end?.employees)}</td>
    <td>${item.change == null ? '—' : (item.change > 0 ? '+' : '') + fmt(item.change)}</td>
  </tr>`).join('');
}
function render() {
  const scope = $('agency').value || null, bureauId = $('bureau').value || null;
  const measure = $('measure').value;
  const groupScope = scope === '__cfo__' || scope === '__other__';
  const points = DATA.periods.map(period => bureauId ? bureauLookup.get(bureauId + '|' + period) :
    !scope || groupScope ? total(period, scope) : lookup.get(scope + '|' + period));
  const values = points.map(row => value(row, measure));
  const first = values[0], last = values[2];
  const difference = first != null && last != null ? last - first : null;
  const selectedName = bureauId ? `${scope} › ${bureauLabel(bureauById.get(bureauId))}` : scopeLabel(scope);
  $('trend-title').textContent = selectedName + ' · ' + measureLabel(measure);
  $('notice').textContent = scope ? 'Selected scope: ' + selectedName :
    'Totals cover every agency grouping present in each file; coverage can change between snapshots.';
  $('start').textContent = isPercent(measure) ? pct(first) : fmt(first);
  $('end').textContent = isPercent(measure) ? pct(last) : fmt(last);
  $('start-note').textContent = measureLabel(measure);
  $('end-note').textContent = measureLabel(measure);
  $('change').textContent = difference == null ? '—' :
    (difference > 0 ? '+' : '') + (isPercent(measure) ? difference.toFixed(2) + ' pp' : fmt(difference));
  $('change').className = difference == null ? '' : difference >= 0 ? 'positive' : 'negative';
  $('change-note').textContent = difference == null ? 'Missing endpoint' :
    isPercent(measure) ? 'percentage points' : first ?
      `(${(100 * difference / first).toFixed(1)}%)` : 'No baseline';
  const individual = scope && !groupScope;
  $('coverage-label').textContent = individual ? 'Bureaus represented' : 'Agencies represented';
  $('coverage').textContent = individual ? DATA.bureaus.filter(row =>
    row.period === '2026-07' && row.agency === scope && (!bureauId || row.id === bureauId)).length :
    DATA.records.filter(row => row.period === '2026-07' && inScope(row, scope)).length;
  $('trend-summary').textContent = difference == null ?
    'No complete September-to-July comparison for this scope.' :
    difference > 0 ? 'Increase from September 2025 to July 2026.' :
      difference < 0 ? 'Decrease from September 2025 to July 2026.' :
        'No change from September 2025 to July 2026.';
  renderTrend(values, measure);
  renderSeries(points[2]);
  renderEducation(points[2]);
  renderTable(scope);
  renderBureauTable(scope, bureauId);
}

$('agency').addEventListener('change', () => { refreshBureauOptions(); render(); });
$('bureau').addEventListener('change', render);
$('measure').addEventListener('change', render);
educationChecks.forEach(box => box.addEventListener('change', () => {
  if (!selectedEducation().length) box.checked = true;
  if (!['education', 'educationShare'].includes($('measure').value)) {
    $('measure').value = 'educationShare';
  }
  render();
}));
document.querySelectorAll('[data-education-preset]').forEach(button => {
  button.addEventListener('click', () => {
    const preset = button.dataset.educationPreset;
    const keys = preset === 'bachelors' ? bachelorsPlus :
      preset === 'graduate' ? graduatePlus : reportedKeys;
    educationChecks.forEach(box => { box.checked = keys.includes(box.value); });
    $('measure').value = 'educationShare';
    render();
  });
});
refreshBureauOptions();
render();
