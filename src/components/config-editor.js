import { html, LitElement } from 'lit';
import { getConfigErrors } from '../utils/config-validator.js';
import { jsonSyntaxLocation } from '../utils/json-error.js';

import { createEditor } from 'prism-code-editor';
import { defaultCommands } from 'prism-code-editor/commands';
import { cursorPosition } from 'prism-code-editor/cursor';
import { indentGuides } from 'prism-code-editor/guides';
import { highlightBracketPairs } from 'prism-code-editor/highlight-brackets';
import { matchBrackets } from 'prism-code-editor/match-brackets';

import 'prism-code-editor/layout.css';
import 'prism-code-editor/guides.css';
import 'prism-code-editor/prism/languages/json';
import '../styles/jump-key-dark.css';

// 1. Static styling dictionary isolating layouts from the application engine
const styles = {
  containerBase: `w-full min-h-0 rounded-xl overflow-auto bg-slate-950 border shadow-inner transition-colors`,
  containerValid: `border-slate-700 focus-within:border-indigo-500`,
  containerInvalid: `jk-invalid-container`,
};

export class JkConfigEditor extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind CSS execution space
  }

  static properties = {
    errors: { state: true },
    t: { type: Function },
    readOnly: { type: Boolean },
    value: { type: String },
    originalValue: { type: String },
    isValid: { type: Boolean },
  };

  constructor() {
    super();
    this.errors = [];
    this.t = key => key;
    this.value = '';
    this.originalValue = '';
    this.isValid = true;
    this._editorInstance = null;
  }

  firstUpdated() {
    this.initEditor();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._editorInstance?.remove();
    this._editorInstance = null;
  }

  updated(changed) {
    if (changed.has('readOnly')) this._editorInstance?.setOptions({ readOnly: this.readOnly });
  }

  pageKey(e) {
    if (!['PageDown', 'PageUp'].includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    const editor = this._editorInstance;
    if (!editor || e.target !== editor.textarea) return;
    e.preventDefault();
    e.stopPropagation();
    const input = editor.textarea;
    const viewport = this.querySelector('#editorContainer');
    const lineHeight = parseFloat(getComputedStyle(input).lineHeight) || 20;
    const lines = input.value.split('\n');
    const caret = input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;
    const before = input.value.slice(0, caret).split('\n');
    const row = before.length - 1, column = before.at(-1).length;
    const step = Math.max(1, Math.floor(viewport.clientHeight / lineHeight) - 1);
    const target = Math.max(0, Math.min(lines.length - 1, row + (e.key === 'PageDown' ? step : -step)));
    const offset = lines.slice(0, target).reduce((sum, line) => sum + line.length + 1, 0) + Math.min(column, lines[target].length);
    if (e.shiftKey) {
      const anchor = input.selectionDirection === 'backward' ? input.selectionEnd : input.selectionStart;
      input.setSelectionRange(Math.min(anchor, offset), Math.max(anchor, offset), offset < anchor ? 'backward' : 'forward');
    } else input.setSelectionRange(offset, offset);
    viewport.scrollTop += (target - row) * lineHeight;
  }

  initEditor() {
    const container = this.querySelector('#editorContainer');
    if (!container) return;

    container.innerHTML = '';
    container.addEventListener('keydown', e => this.pageKey(e), true);

    this._editorInstance = createEditor(
      container,
      {
        value: this.value,
        readOnly: this.readOnly,
        language: 'json',
        theme: 'jump-key-dark',
        onUpdate: (val) => {
          this.value = val;
          let valid = false;
          try {
            const parsed = JSON.parse(val);
            this.errors = getConfigErrors(parsed);
            valid = this.errors.length === 0;
          } catch (err) {
            this.errors = [{ path: '$', code: 'syntax', detail: err.message,
              position: jsonSyntaxLocation(err.message, val) }];
            valid = false;
          }

          this.isValid = valid;

          // Event an Modal senden, damit dieses über Änderungen Bescheid weiß
          this.dispatchEvent(
            new CustomEvent('editor-change', {
              detail: {
                value: val,
                isValid: valid,
                hasChanged: val !== this.originalValue,
              },
              bubbles: true,
              composed: true,
            })
          );
        },
      },
      () => {
        requestAnimationFrame(() => {
          if (window.matchMedia('(min-width: 768px) and (pointer: fine)').matches) {
            this._editorInstance?.textarea?.focus({ preventScroll: true });
          }
        });
      },
      defaultCommands(),
      matchBrackets(),
      highlightBracketPairs(),
      indentGuides(),
      cursorPosition()
    );
  }

  focusError(position) {
    const input = this._editorInstance?.textarea;
    if (!input || position === null) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(position, position);
    const before = input.value.slice(0, position);
    const row = before.split('\n').length - 1;
    const height = parseFloat(getComputedStyle(input).lineHeight) || 20;
    this.querySelector('#editorContainer')?.scrollTo({ top: Math.max(0, row * height - 2 * height), behavior: 'instant' });
  }

  render() {
    const stateClass = this.isValid ? styles.containerValid : styles.containerInvalid;

    return html`
      ${this.errors.length ? html`<ul class="jk-config-errors" aria-live="polite">${this.errors.map(error => html`<li><code>${error.path}</code>: ${this.t('validation_' + error.code)} ${error.other || error.detail || ''}${error.position != null ? html` <button class="jk-json-error-jump" type="button" @click=${()=>this.focusError(error.position)}>↗</button>` : ''}</li>`)}</ul>` : ''}
      <div id="editorContainer" class="${styles.containerBase} ${stateClass}"></div>`;
  }
}

customElements.define('jk-config-editor', JkConfigEditor);
