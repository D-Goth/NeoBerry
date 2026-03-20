/**
 * NeoBerry v2 — dashboard.js
 * GridStack init, drag-and-drop, layout save/restore.
 */

const Dashboard = (() => {

  const LAYOUT_KEY = 'neoberry_layout';
  let _grid = null;

  function init() {
    _grid = GridStack.init({
      cellHeight: 80,
      margin: 8,
      animate: true,
      handle: '.widget__drag-handle',
      resizable: { handles: 'se' },
      draggable: { scroll: true },
    }, '#dashboard-grid');

    // Restore saved layout
    const saved = _loadLayout();
    if (saved && saved.length) {
      _grid.load(saved);
    }

    // Save on any change
    _grid.on('change', () => _saveLayout());
    _grid.on('resizestop', () => _saveLayout());
  }

  function _saveLayout() {
    if (!_grid) return;
    const items = _grid.save(false);   // false = don't include content
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(items));
  }

  function _loadLayout() {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function getGrid() { return _grid; }

  document.addEventListener('DOMContentLoaded', init);

  return { getGrid };
})();
