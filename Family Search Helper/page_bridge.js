// Runs in PAGE context — can access React fiber and patch event listeners

// ── Patch dismiss handlers ────────────────────────────────────────────────
// Prevent the global document/window tracker from dismissing the view when
// clicking or dragging inside our button OR inside the add-person popup.
// mouseup is included because the site fires its dismiss logic on mouseup
// after a drag, which was destroying the popup after any move operation.
const BTN_ID        = 'fs-quick-add-nav-btn';
const DIALOG_ATTR   = 'data-testid';
const DIALOG_VALUES = ['add-person-modal', 'add-unconnected-person-modal'];

function _isProtectedTarget(e) {
  if (!e.target || !e.target.closest) return false;
  if (e.target.closest('#' + BTN_ID)) return true;
  for (const val of DIALOG_VALUES) {
    if (e.target.closest(`[${DIALOG_ATTR}="${val}"]`)) return true;
  }
  const dialog = e.target.closest('[role="dialog"]');
  if (dialog && (
    dialog.querySelector('input[data-testid="first-name"]') ||
    dialog.querySelector('input[name="birthDate"]')
  )) return true;
  return false;
}

const _origAEL = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (typeof listener !== 'function') {
    return _origAEL.call(this, type, listener, options);
  }
  if ((type === 'mousedown' || type === 'mouseup' || type === 'click') &&
      (this === document || this === window)) {
    const wrapped = function (e) {
      if (_isProtectedTarget(e)) return;
      return listener.call(this, e);
    };
    return _origAEL.call(this, type, wrapped, options);
  }
  return _origAEL.call(this, type, listener, options);
};

// ── Simulated Click Bridge ──────────────────────────────────────────────
window.addEventListener('fs-quick-add-direct', function () {
  const dropdownTrigger = document.querySelector('[data-testid="recents-button"]');
  if (!dropdownTrigger) return;
  
  // 1. Open the dropdown menu naturally if it's closed
  const alreadyOpen = document.querySelector('[data-testid="add-unconnected-person"]');
  if (!alreadyOpen) {
    dropdownTrigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    dropdownTrigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    dropdownTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }

  // 2. Poll rapidly for the hidden button to mount in the DOM
  let tries = 0;
  const id = setInterval(() => {
    const realButton = document.querySelector('[data-testid="add-unconnected-person"]');

    if (realButton) {
      clearInterval(id);

      // 3. Fire a full native mouse action sequence on the button.
      // This tells React's event pooling that a standard UI event happened,
      // which keeps the dropdown open and focuses the modal naturally.
      const eventOptions = { bubbles: true, cancelable: true, view: window };
      
      realButton.dispatchEvent(new MouseEvent('mousedown', eventOptions));
      realButton.dispatchEvent(new MouseEvent('mouseup', eventOptions));
      realButton.dispatchEvent(new MouseEvent('click', eventOptions));
      return;
    }

    if (++tries > 30) clearInterval(id);
  }, 5);
});