export function showToast(app, message, type = 'success') {
  app.toastConfig = {
    show: true,
    message,
    type,
  };

  app.requestUpdate();
}

export function showKeyBadge(app, text, state = 'default') {
  app.currentInput = text;

  app.isValidInput = state === 'valid';
  app.isInvalidInput = state === 'invalid';

  app.requestUpdate();
}

export function clearKeyBadge(app) {
  app.currentInput = '';
  app.isValidInput = false;
  app.isInvalidInput = false;

  app.requestUpdate();
}
