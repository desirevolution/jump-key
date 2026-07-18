import { LitElement, html } from 'lit';
import { validateConfig } from '../utils/config-validator.js';

import { createEditor } from 'prism-code-editor';
import { matchBrackets } from 'prism-code-editor/match-brackets';
import { defaultCommands, addEditorHotkey } from 'prism-code-editor/commands';
import { highlightBracketPairs } from 'prism-code-editor/highlight-brackets';
import { indentGuides } from 'prism-code-editor/guides';
import { cursorPosition } from 'prism-code-editor/cursor';

import 'prism-code-editor/layout.css';
import 'prism-code-editor/guides.css';
import 'prism-code-editor/prism/languages/json';
import '../styles/jump-key-dark.css';

// 1. Static styling dictionary isolating layouts from the application engine
const styles = {
  containerBase: `w-full h-full min-h-[400px] rounded-xl overflow-auto bg-slate-950 border shadow-inner transition-colors`,
  containerValid: `border-slate-700 focus-within:border-indigo-500`,
  containerInvalid: `border-rose-500 focus-within:border-rose-500`,
};

export class JkConfigEditor extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind CSS execution space
  }

  static properties = {
    value: { type: String },
    originalValue: { type: String },
    isValid: { type: Boolean },
  };

  constructor() {
    super();
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
    // Falls Prism-Code-Editor eine Teardown-Methode hat:
    // this._editorInstance?.destroy();
    this._editorInstance = null;
  }

  editorRows(editor) {
    const textarea = editor.textarea;

    // 1. Hole die tatsächliche visuelle Höhe der TextArea (in Pixeln)
    const clientHeight = 300;

    // 2. Berechne die Zeilenhöhe (Line-Height) aus dem CSS
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight);
    const editorWrapper = editor.textarea.closest('.prism-code-editor');
    const korrekteHoehe = editorWrapper.clientHeight;

    return Math.floor(clientHeight / lineHeight);
  }

  initEditor() {
    const container = this.querySelector('#editorContainer');
    if (!container) return;

    container.innerHTML = '';

    this._editorInstance = createEditor(
      container,
      {
        value: this.value,
        language: 'json',
        theme: 'jump-key-dark',
        onUpdate: (val) => {
          this.value = val;
          let valid = false;
          try {
            const parsed = JSON.parse(val);
            valid = validateConfig(parsed);
          } catch (err) {
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
            }),
          );
        },
      },
      () => {
        requestAnimationFrame(() => {
          this._editorInstance?.textarea?.focus();
        });
      },
      defaultCommands(),
      matchBrackets(),
      highlightBracketPairs(),
      indentGuides(),
      cursorPosition(),
    );
  }

  render() {
    const stateClass = this.isValid ? styles.containerValid : styles.containerInvalid;

    return html` <div id="editorContainer" class="${styles.containerBase} ${stateClass}"></div> `;
  }
}

customElements.define('jk-config-editor', JkConfigEditor);
