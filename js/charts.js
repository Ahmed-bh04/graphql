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

export function auditChart(container, up, down) {
  container.textContent = '';

  const width = 260;
  const rowH = 50;
  const barH = 14;
  const max = Math.max(up, down, 1);

  const ratio = down > 0 ? (up / down) : null;
  const ratioText = ratio === null ? '—' : ratio.toFixed(2);

  const svg = createSvg(width, rowH * 2 + 40,
    `Audit ratio ${ratioText}: ${formatXp(up)} done, ${formatXp(down)} received`);

  const rows = [
    { label: 'Audits done', value: up },
    { label: 'Audits received', value: down },
  ];

  rows.forEach((row, i) => {
    const top = i * rowH;
    const barW = Math.max(2, (row.value / max) * width);

    svg.append(svgEl('text', { class: 'audit-label', x: 0, y: top + 12 }, row.label));
    svg.append(svgEl('text', { class: 'audit-value', x: width, y: top + 12 }, formatXp(row.value)));
    svg.append(svgEl('rect', {
      class: 'bar', x: 0, y: top + 20, width: barW, height: barH, rx: 4,
    }));
  });

  svg.append(svgEl('text', {
    class: 'audit-ratio-readout', x: 0, y: rowH * 2 + 26,
  }, `Ratio ${ratioText}`));

  container.append(svg);
}
