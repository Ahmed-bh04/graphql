import { formatXp, formatDate } from './format.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function createSvg(width, height, title) {
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img' });
  svg.append(svgEl('title', {}, title));
  return svg;
}

export function lineChart(container, points) {
  container.textContent = '';
  if (points.length < 2) {
    container.textContent = 'Not enough XP to draw this graph yet.';
    return;
  }

  const width = 720;
  const height = 300;
  const margin = { top: 20, right: 50, bottom: 40, left: 70 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const startTime = points[0].time;
  const endTime = points[points.length - 1].time;
  const maxXp = points[points.length - 1].xp;

  const x = (time) => margin.left + ((time - startTime) / (endTime - startTime)) * plotW;
  const y = (xp) => margin.top + plotH - (xp / maxXp) * plotH;

  const svg = createSvg(width, height, `Cumulative XP over time, up to ${formatXp(maxXp)}`);

  for (let i = 0; i <= 4; i += 1) {
    const xp = (maxXp / 4) * i;
    svg.append(svgEl('line', {
      class: 'grid-line', x1: margin.left, x2: margin.left + plotW, y1: y(xp), y2: y(xp),
    }));
    svg.append(svgEl('text', {
      class: 'label label-end', x: margin.left - 10, y: y(xp) + 4,
    }, formatXp(xp)));
  }

  for (let i = 0; i <= 3; i += 1) {
    const time = startTime + ((endTime - startTime) / 3) * i;
    svg.append(svgEl('text', {
      class: 'label label-middle', x: x(time), y: margin.top + plotH + 24,
    }, formatDate(time)));
  }

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.time).toFixed(1)},${y(p.xp).toFixed(1)}`)
    .join(' ');

  const baseline = y(0);
  svg.append(svgEl('path', {
    class: 'area',
    d: `${line} L${x(endTime).toFixed(1)},${baseline} L${x(startTime).toFixed(1)},${baseline} Z`,
  }));
  svg.append(svgEl('path', { class: 'line', d: line }));

  container.append(svg);
}

export function barChart(container, rows) {
  container.textContent = '';
  if (rows.length === 0) {
    container.textContent = 'No project XP to draw yet.';
    return;
  }

  const width = 720;
  const rowH = 32;
  const barH = 18;
  const left = 180;
  const right = 80;
  const plotW = width - left - right;
  const maxXp = rows[0].xp;

  const svg = createSvg(width, rows.length * rowH, `XP earned per project, ${rows.length} projects`);

  rows.forEach((row, i) => {
    const top = i * rowH;
    const barW = Math.max(2, (row.xp / maxXp) * plotW);
    const middle = top + rowH / 2 + 4;

    const group = svgEl('g', { class: 'bar-row' });

    group.append(svgEl('title', {}, `${row.name}: ${formatXp(row.xp)}`));
    group.append(svgEl('text', { class: 'label label-end', x: left - 12, y: middle }, row.name));
    group.append(svgEl('rect', {
      class: 'bar', x: left, y: top + (rowH - barH) / 2, width: barW, height: barH, rx: 3,
    }));
    group.append(svgEl('text', {
      class: 'label label-value', x: left + barW + 10, y: middle,
    }, formatXp(row.xp)));

    svg.append(group);
  });

  container.append(svg);
}

const TAU = Math.PI * 2;

function arcPath(cx, cy, outer, inner, start, end) {
  const at = (radius, angle) => [
    (cx + radius * Math.cos(angle)).toFixed(1),
    (cy + radius * Math.sin(angle)).toFixed(1),
  ];

  const large = end - start > Math.PI ? 1 : 0;
  const [x0, y0] = at(outer, start);
  const [x1, y1] = at(outer, end);
  const [x2, y2] = at(inner, end);
  const [x3, y3] = at(inner, start);

  return `M${x0},${y0} A${outer},${outer} 0 ${large} 1 ${x1},${y1}`
    + ` L${x2},${y2} A${inner},${inner} 0 ${large} 0 ${x3},${y3} Z`;
}

export function donutChart(container, passed, failed) {
  container.textContent = '';

  const total = passed + failed;
  if (total === 0) {
    container.textContent = 'No graded projects yet.';
    return;
  }

  const cx = 130;
  const cy = 122;
  const outer = 84;
  const inner = 56;

  const svg = createSvg(260, 300, `${passed} of ${total} graded projects passed`);

  const slices = [
    { label: 'Passed', value: passed, className: 'slice-pass' },
    { label: 'Failed', value: failed, className: 'slice-fail' },
  ];

  let angle = -Math.PI / 2;

  for (const slice of slices) {
    if (slice.value === 0) continue;

    const sweep = Math.min((slice.value / total) * TAU, TAU - 0.001);

    const group = svgEl('g');
    group.append(svgEl('title', {}, `${slice.label}: ${slice.value} of ${total}`));
    group.append(svgEl('path', {
      class: slice.className,
      d: arcPath(cx, cy, outer, inner, angle, angle + sweep),
    }));

    svg.append(group);
    angle += sweep;
  }

  svg.append(svgEl('text', {
    class: 'donut-value', x: cx, y: cy + 4,
  }, `${Math.round((passed / total) * 100)}%`));
  svg.append(svgEl('text', { class: 'label label-middle', x: cx, y: cy + 26 }, 'passed'));

  const legendTop = cy + outer + 38;
  svg.append(svgEl('line', {
    class: 'grid-line', x1: 20, x2: 240, y1: legendTop, y2: legendTop,
  }));

  slices.forEach((slice, i) => {
    const y = legendTop + 26 + i * 28;
    svg.append(svgEl('rect', {
      class: slice.className, x: 20, y: y - 9, width: 9, height: 9, rx: 2,
    }));
    svg.append(svgEl('text', { class: 'label', x: 38, y }, slice.label));
    svg.append(svgEl('text', {
      class: 'label label-value', x: 220, y, 'text-anchor': 'end',
    }, String(slice.value)));
  });

  container.append(svg);
}
