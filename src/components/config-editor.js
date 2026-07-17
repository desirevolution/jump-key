import { LitElement, html } from "lit";
import { validateConfig } from "../utils/config-validator.js";

import { createEditor } from "prism-code-editor";
import { matchBrackets } from "prism-code-editor/match-brackets";
import { defaultCommands, addEditorHotkey } from "prism-code-editor/commands";
import { highlightBracketPairs } from "prism-code-editor/highlight-brackets";
import { indentGuides } from "prism-code-editor/guides";

import "prism-code-editor/layout.css";
import "prism-code-editor/guides.css";
import "prism-code-editor/prism/languages/json";
import "prism-code-editor/themes/night-owl.css";
import { cursorPosition } from "prism-code-editor/cursor";

export class JkConfigEditor extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    value: { type: String },
    originalValue: { type: String },
    isValid: { type: Boolean },
  };

  constructor() {
    super();
    this.value = "";
    this.originalValue = "";
    this.isValid = true;
    this._editorInstance = null;
  }

  firstUpdated() {
    this.initEditor();
  }

  editorRows(editor) {
    const textarea = editor.textarea;

    // 1. Hole die tatsächliche visuelle Höhe der TextArea (in Pixeln)
    const clientHeight = 300;

    // 2. Berechne die Zeilenhöhe (Line-Height) aus dem CSS
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight);
    console.error(clientHeight);
    console.error(lineHeight);
    const editorWrapper = editor.textarea.closest(".prism-code-editor");
    const korrekteHoehe = editorWrapper.clientHeight;

    return Math.floor(clientHeight / lineHeight);
  }

  initEditor() {
    const container = this.querySelector("#editorContainer");
    if (!container) return;

    container.innerHTML = "";

    this._editorInstance = createEditor(
      container,
      {
        value: this.value,
        language: "json",
        theme: "night-owl",
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
            new CustomEvent("editor-change", {
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

    const editor = this._editorInstance;
    addEditorHotkey(editor, "PageDown", () => {
      editor.container.scrollBy(0, 1);
      requestAnimationFrame(() => {
        this._editorInstance?.textarea?.focus();
      });
    });
    /*
    const rows = this.editorRows(editor);
    addEditorHotkey(editor, "PageUp", () =>
      this.moveDownByLines(editor, -rows),
    );
    addEditorHotkey(editor, "PageDown", () =>
      this.moveDownByLines(editor, rows),
    );
    */
  }

  render() {
    return html`
      <div id="test">
        <style>
          height: 300px; /* oder max-height: 300px; */
          overflow: auto; /* Wichtig, damit Scrollbalken erscheinen */
        </style>
        <div
          id="editorContainer"
          class="w-full h-full rounded-xl overflow-hidden bg-slate-900 border ${
            this.isValid
              ? "border-slate-700 focus-within:border-indigo-500"
              : "border-rose-500 focus-within:border-rose-500"
          } transition-colors"
        ></div>
      </div>
    `;
  }
}

customElements.define("jk-config-editor", JkConfigEditor);
