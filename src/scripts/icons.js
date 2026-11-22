const shapes = {
  speaker: '<path d="M3 9h4l5-4v14l-5-4H3z M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M3 9h4l5-4v14l-5-4H3z M16 9l5 6m0-6-5 6"/>',
  keyboard:
    '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.1m4 0h.1m4 0h.1m4 0h.1M6 12h.1m4 0h.1m4 0h.1m4 0h.1M8 15h8"/>',
  github:
    '<path fill="currentColor" stroke="none" d="M12 .95a11.05 11.05 0 0 0-3.5 21.53c.55.1.75-.24.75-.53v-2.08c-3.07.67-3.72-1.3-3.72-1.3-.5-1.27-1.23-1.6-1.23-1.6-1-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.98 1.68 2.58 1.2 3.2.92.1-.71.39-1.2.7-1.47-2.45-.28-5.03-1.23-5.03-5.46 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.92 0 0 .93-.29 3.04 1.13a10.6 10.6 0 0 1 5.53 0c2.12-1.42 3.04-1.13 3.04-1.13.61 1.52.23 2.64.12 2.92a4.26 4.26 0 0 1 1.13 2.95c0 4.24-2.59 5.18-5.05 5.45.4.34.75 1.01.75 2.04v3.04c0 .3.2.64.76.53A11.05 11.05 0 0 0 12 .95Z"/>',
  play: '<path d="M6 3.8a.8.8 0 0 1 1.2-.7l13 8.2a.8.8 0 0 1 0 1.4l-13 8.2a.8.8 0 0 1-1.2-.7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M5 4h5v16H5zm9 0h5v16h-5z" fill="currentColor" stroke="none"/>',
  first: '<path d="M5 5v14m14-13-9 6 9 6z"/>',
  last: '<path d="M19 5v14M5 6l9 6-9 6z"/>',
  previous: '<path d="m14 6-6 6 6 6"/>',
  next: '<path d="m10 6 6 6-6 6"/>',
  shuffle:
    '<path d="M3 6h3c5 0 7 12 12 12h3m-3-3 3 3-3 3M3 18h3c2.3 0 3.8-2.1 5-4m3-5c1.5-2 2.5-3 4-3h3m-3-3 3 3-3 3"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zm-9 5 9 5 9-5m-9 5v10"/>',
  code: '<path d="m7 7-5 5 5 5m10-10 5 5-5 5m-4-14-2 18"/>',
  close: '<path d="m6 6 12 12m0-12L6 18"/>',
};
export function icon(name) {
  return (
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    shapes[name] +
    '</svg>'
  );
}
export function iconsIn(root) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}
