const $ = id => document.getElementById(id);
const fmt = value => value == null ? '—' : Math.round(value).toLocaleString();
const pct = value => value == null ? '—' : value.toFixed(2) + '%';
const periodLabel = period => new Intl.DateTimeFormat('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(period + '-01T00:00:00Z'));
const firstPeriod = DATA.periods[0], lastPeriod = DATA.periods[DATA.periods.length - 1];
const rangeLabel = `${periodLabel(firstPeriod)} to ${periodLabel(lastPeriod)}`;
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
  <option value="__cfo__">CFO Act agencies</option>
  <option value="__other__">Other agencies</option>
  <optgroup label="CFO Act agencies">${options(cfoNames)}</optgroup>
  <optgroup label="Other agencies">${options(otherNames)}</optgroup>`;

const bureauById = new Map(DATA.bureaus.map(row => [row.id, row]));
const bureauLookup = new Map(DATA.bureaus.map(row => [row.id + '|' + row.period, row]));
const bureauLabel = row => row.component === row.agency ? row.bureau :
  `${row.bureau} (${row.component})`;
const compareIds = new Set();
let compareInitialized = false;
const compareColors = ['#0f7791', '#b45c38', '#7053a6', '#22784f'];
const agencyBureaus = agency => [...bureauById.values()].filter(row => row.agency === agency);
const compareLabel = row => `${row.agency} › ${bureauLabel(row)}`;
function refreshCompareOptions() {
  const agency = $('agency').value, query = $('compare-search').value.trim().toLowerCase();
  if (agency && agency !== '__cfo__' && agency !== '__other__' && !compareInitialized) {
    compareInitialized = true;
    agencyBureaus(agency).sort((a, b) =>
      (bureauLookup.get(b.id + '|' + lastPeriod)?.employees || 0) -
      (bureauLookup.get(a.id + '|' + lastPeriod)?.employees || 0)).slice(0, 2)
      .forEach(row => compareIds.add(row.id));
  }
  const bureaus = [...bureauById.values()].filter(row =>
    (!agency || (agency === '__cfo__' ? groupOf[row.agency] === 'CFO Act' :
      agency === '__other__' ? groupOf[row.agency] === 'Other agency' : row.agency === agency)) &&
    (!query || compareLabel(row).toLowerCase().includes(query))).sort((a, b) =>
    (bureauLookup.get(b.id + '|' + lastPeriod)?.employees || 0) -
    (bureauLookup.get(a.id + '|' + lastPeriod)?.employees || 0) ||
    compareLabel(a).localeCompare(compareLabel(b)));
  $('compare-options').innerHTML = bureaus.length ? bureaus.map(row => `<label><input type="checkbox" value="${row.id}" ${compareIds.has(row.id) ? 'checked' : ''}><span>${escapeHtml(compareLabel(row))} · ${fmt(bureauLookup.get(row.id + '|' + lastPeriod)?.employees)} in ${periodLabel(lastPeriod)}</span></label>`).join('') : '<span>No matching bureaus.</span>';
  $('compare-limit').textContent = `${compareIds.size} bureau${compareIds.size === 1 ? '' : 's'} selected (maximum four). Change Agency to browse more; selections remain. The first agency you choose starts with its two largest latest-snapshot bureaus.`;
}
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
  return scope === '__cfo__' ? 'CFO Act agencies' :
    scope === '__other__' ? 'Other agencies' : scope || 'All available agencies';
}
function renderTrend(values, measure) {
  const present = values.filter(value => value != null);
  const high = Math.max(1, ...present) * 1.1;
  const y = value => 265 - value / high * 220;
  const dates = DATA.periods.map(period => Date.parse(period + '-01T00:00:00Z'));
  const span = dates[dates.length - 1] - dates[0];
  const x = index => span ? 120 + 580 * (dates[index] - dates[0]) / span : 410;
  const coords = values.map((value, index) => value == null ? null : [x(index), y(value)]);
  let svg = '';
  for (let i = 0; i <= 4; i++) {
    const tick = high * i / 4, yy = y(tick);
    svg += `<line x1="95" y1="${yy}" x2="710" y2="${yy}" stroke="#dce5e9"/>`;
    svg += `<text class="axis" x="88" y="${yy + 4}" text-anchor="end">${isPercent(measure) ? pct(tick) : fmt(tick)}</text>`;
  }
  for (let i = 0; i < coords.length - 1; i++) {
    if (coords[i] && coords[i + 1]) {
      svg += `<line class="line" x1="${coords[i][0]}" y1="${coords[i][1]}" x2="${coords[i + 1][0]}" y2="${coords[i + 1][1]}"/>`;
    }
  }
  for (let i = 0; i < DATA.periods.length; i++) {
    svg += `<text class="axis" x="${x(i)}" y="295" text-anchor="end" transform="rotate(-35 ${x(i)} 295)">${periodLabel(DATA.periods[i])}</text>`;
    if (coords[i]) {
      const [x, yy] = coords[i], display = isPercent(measure) ? pct(values[i]) : fmt(values[i]);
      svg += `<circle class="point" cx="${x}" cy="${yy}" r="6"><title>${DATA.periods[i]}: ${display}</title></circle>`;
      svg += `<text class="axis" x="${x}" y="${yy - 13}" text-anchor="middle">${display}</text>`;
    }
  }
  $('trend').innerHTML = svg;
}
function renderCompare(scope, measure) {
  const selected = [...compareIds].map(id => bureauById.get(id)).filter(Boolean);
  $('compare-caption').textContent = `${selected.length} OPM subelement${selected.length === 1 ? '' : 's'} selected. The chart uses ${measureLabel(measure)} and the same education choices as the main chart. You can compare bureaus from different agencies.`;
  $('compare-legend').innerHTML = selected.map((row, i) => `<span><i class="compare-swatch" style="background:${compareColors[i]}"></i>${escapeHtml(compareLabel(row))}<button type="button" data-remove-bureau="${row.id}" aria-label="Remove ${escapeHtml(compareLabel(row))} from comparison">×</button></span>`).join('');
  $('compare-header').innerHTML = selected.length ? '<th>OPM subelement</th>' +
    DATA.periods.map(period => `<th>${periodLabel(period)}</th>`).join('') +
    `<th>Change<br>${periodLabel(firstPeriod)}–${periodLabel(lastPeriod)}</th>` : '';
  if (!selected.length) {
    $('compare-trend').innerHTML = '';
    $('compare-rows').innerHTML = '';
    return;
  }
  const series = selected.map(row => ({row, values: DATA.periods.map(period =>
    value(bureauLookup.get(row.id + '|' + period), measure))}));
  const present = series.flatMap(item => item.values).filter(item => item != null);
  const high = Math.max(1, ...present) * 1.1;
  const y = item => 265 - item / high * 220;
  const dates = DATA.periods.map(period => Date.parse(period + '-01T00:00:00Z'));
  const span = dates[dates.length - 1] - dates[0];
  const x = index => span ? 120 + 580 * (dates[index] - dates[0]) / span : 410;
  let svg = '';
  for (let i = 0; i <= 4; i++) {
    const tick = high * i / 4, yy = y(tick);
    svg += `<line x1="95" y1="${yy}" x2="710" y2="${yy}" stroke="#dce5e9"/>`;
    svg += `<text class="axis" x="88" y="${yy + 4}" text-anchor="end">${isPercent(measure) ? pct(tick) : fmt(tick)}</text>`;
  }
  DATA.periods.forEach((period, i) => {
    svg += `<text class="axis" x="${x(i)}" y="295" text-anchor="end" transform="rotate(-35 ${x(i)} 295)">${periodLabel(period)}</text>`;
  });
  series.forEach(({row, values}, index) => {
    const color = compareColors[index];
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] != null && values[i + 1] != null) {
        svg += `<line x1="${x(i)}" y1="${y(values[i])}" x2="${x(i + 1)}" y2="${y(values[i + 1])}" stroke="${color}" stroke-width="3"/>`;
      }
    }
    values.forEach((item, i) => {
      if (item != null) svg += `<circle cx="${x(i)}" cy="${y(item)}" r="5" fill="${color}"><title>${escapeHtml(compareLabel(row))} · ${periodLabel(DATA.periods[i])}: ${isPercent(measure) ? pct(item) : fmt(item)}</title></circle>`;
    });
  });
  $('compare-trend').innerHTML = svg;
  $('compare-rows').innerHTML = series.map(({row, values}) => {
    const first = values[0], last = values[values.length - 1];
    const change = first == null || last == null ? '—' :
      (last - first > 0 ? '+' : '') + (isPercent(measure) ? (last - first).toFixed(2) + ' pp' : fmt(last - first));
    return `<tr><td>${escapeHtml(compareLabel(row))}</td>${values.map(item => `<td>${isPercent(measure) ? pct(item) : fmt(item)}</td>`).join('')}<td>${change}</td></tr>`;
  }).join('');
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
    `No ${periodLabel(lastPeriod)} employment record for this scope.`;
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
  $('agency-header').innerHTML = '<th>Agency</th>' + DATA.periods.map(period => `<th>${periodLabel(period)}</th>`).join('') +
    `<th>Change<br>${periodLabel(firstPeriod)}–${periodLabel(lastPeriod)}</th><th>Selected series share<br>${periodLabel(lastPeriod)}</th><th>Selected education share<br>${periodLabel(lastPeriod)}</th>`;
  const tableNames = names.filter(name => !scope ||
    (scope === '__cfo__' ? groupOf[name] === 'CFO Act' :
      scope === '__other__' ? groupOf[name] === 'Other agency' : name === scope));
  const rows = tableNames.map(name => {
    const observations = DATA.periods.map(period => lookup.get(name + '|' + period));
    const start = observations[0], end = observations[observations.length - 1];
    return {name, observations, end, change: start && end ? end.employees - start.employees : null};
  }).sort((a, b) => (b.end?.employees || 0) - (a.end?.employees || 0));
  $('rows').innerHTML = rows.map(row => `<tr>
    <td>${escapeHtml(row.name)}</td>${row.observations.map(item => `<td>${fmt(item?.employees)}</td>`).join('')}
    <td>${row.change == null ? '—' : (row.change > 0 ? '+' : '') + fmt(row.change)}</td>
    <td>${row.end?.employees ? pct(100 * row.end.selected / row.end.employees) : '—'}</td>
    <td>${pct(educationShare(row.end))}</td>
  </tr>`).join('');
}
function renderBureauTable(scope, selectedId) {
  $('bureau-header').innerHTML = '<th>OPM subelement</th>' + DATA.periods.map(period => `<th>${periodLabel(period)}</th>`).join('') +
    `<th>Change<br>${periodLabel(firstPeriod)}–${periodLabel(lastPeriod)}</th>`;
  const individual = scope && scope !== '__cfo__' && scope !== '__other__';
  if (!individual) {
    $('bureau-table-caption').textContent = 'Select an individual agency to see its OPM subelements.';
    $('bureau-rows').innerHTML = '';
    return;
  }
  const bureaus = [...bureauById.values()].filter(row => row.agency === scope)
    .map(row => {
      const observations = DATA.periods.map(period => bureauLookup.get(row.id + '|' + period));
      const start = observations[0], end = observations[observations.length - 1];
      return {row, observations, end,
        change: start && end ? end.employees - start.employees : null};
    }).sort((a, b) => (b.end?.employees || 0) - (a.end?.employees || 0));
  $('bureau-table-caption').textContent = `${bureaus.length} OPM subelements within ${scope}. Select one above to see its trend and education mix.`;
  $('bureau-rows').innerHTML = bureaus.map(item => `<tr${item.row.id === selectedId ? ' class="selected-bureau"' : ''}>
    <td>${escapeHtml(bureauLabel(item.row))}</td>
    ${item.observations.map(row => `<td>${fmt(row?.employees)}</td>`).join('')}
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
  const first = values[0], last = values[values.length - 1];
  const difference = first != null && last != null ? last - first : null;
  const selectedName = bureauId ? `${scope} › ${bureauLabel(bureauById.get(bureauId))}` : scopeLabel(scope);
  $('trend-title').textContent = selectedName + ' · ' + measureLabel(measure);
  $('period-note').textContent = `${DATA.periods.length} OPM employment snapshots · ${rangeLabel}`;
  $('start-period').textContent = periodLabel(firstPeriod);
  $('end-period').textContent = periodLabel(lastPeriod);
  $('coverage-note').textContent = periodLabel(lastPeriod);
  $('series-title').textContent = `Occupational series · ${periodLabel(lastPeriod)}`;
  $('education-title').textContent = `Education breakdown · ${periodLabel(lastPeriod)}`;
  $('agency-table-caption').textContent = `Agency employee counts across ${DATA.periods.length} snapshots. A missing observation (—) means that grouping is absent from that file, not zero. Change compares the first and latest observations only when both exist.`;
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
    row.period === lastPeriod && row.agency === scope && (!bureauId || row.id === bureauId)).length :
    DATA.records.filter(row => row.period === lastPeriod && inScope(row, scope)).length;
  $('trend-summary').textContent = difference == null ?
    `No complete ${rangeLabel} comparison for this scope.` :
    difference > 0 ? `Increase from ${rangeLabel}.` :
      difference < 0 ? `Decrease from ${rangeLabel}.` :
        `No change from ${rangeLabel}.`;
  renderTrend(values, measure);
  renderCompare(scope, measure);
  renderSeries(points[points.length - 1]);
  renderEducation(points[points.length - 1]);
  renderTable(scope);
  renderBureauTable(scope, bureauId);
}

$('agency').addEventListener('change', () => { refreshBureauOptions(); refreshCompareOptions(); render(); });
$('bureau').addEventListener('change', render);
$('measure').addEventListener('change', render);
$('compare-search').addEventListener('input', refreshCompareOptions);
$('compare-legend').addEventListener('click', event => {
  const id = event.target?.dataset?.removeBureau;
  if (!id) return;
  compareIds.delete(id);
  refreshCompareOptions();
  render();
});
$('compare-options').addEventListener('change', event => {
  const box = event.target;
  if (box.type !== 'checkbox') return;
  if (box.checked && compareIds.size >= compareColors.length) {
    box.checked = false;
    $('compare-limit').textContent = 'Select at most four bureaus. Uncheck one before adding another.';
    return;
  }
  if (box.checked) compareIds.add(box.value); else compareIds.delete(box.value);
  $('compare-limit').textContent = `${compareIds.size} bureau${compareIds.size === 1 ? '' : 's'} selected (maximum four).`;
  render();
});
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
refreshCompareOptions();
render();
