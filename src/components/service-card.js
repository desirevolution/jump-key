import { LitElement, html, css } from "lit";
import "./icon.js";

export class JkServiceCard extends LitElement {
  static properties = {
    name: { type: String },
    subtitle: { type: String },
    icon: { type: String },
    category: { type: String },
    badgeText: { type: String },
    showCategoryBadge: { type: Boolean },
  };

  // Convert Tailwind classes to encapsulated vanilla CSS
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    /* Base Button Container */
    .card-button {
      position: relative;
      background-color: #1e293b; /* bg-slate-800 */
      border: 1px solid #334155; /* border-slate-700 */
      border-radius: 1rem; /* rounded-2xl */
      padding: 1rem; /* p-4 */
      display: flex;
      align-items: center; /* items-center */
      gap: 1rem; /* gap-4 */
      text-align: left; /* text-left */
      cursor: pointer; /* cursor-pointer */
      width: 100%; /* w-full */
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* transition-all duration-300 */
      outline: none;
      font-family: inherit;
    }

    /* Hover & Active States */
    .card-button:hover {
      border-color: #6366f1; /* hover:border-indigo-500 */
      transform: translateY(-0.125rem); /* hover:-translate-y-0.5 */
      box-shadow:
        0 10px 15px -3px rgba(99, 102, 241, 0.05),
        0 4px 6px -4px rgba(99, 102, 241, 0.05); /* hover:shadow-lg hover:shadow-indigo-500/5 */
    }

    .card-button:active {
      transform: scale(0.98); /* active:scale-[0.98] */
    }

    /* Icon Container */
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 4.5rem; /* size-18 (18 * 0.25rem) */
      height: 4.5rem;
      border-radius: 1rem; /* rounded-2xl */
      background-color: #1e293b; /* bg-slate-800 */
      color: #6366f1; /* text-indigo-500 */
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* transition duration-300 */
      flex-shrink: 0; /* shrink-0 */
      overflow: hidden; /* overflow-hidden */
    }

    /* Group Hover Interactions on Icon Container */
    .card-button:hover .icon-container {
      background-color: #334155; /* group-hover:bg-slate-700 */
      color: #e2e8f0; /* group-hover:text-slate-200 */
      transform: scale(1.05); /* group-hover:scale-105 */
    }

    /* Jk Icon Inner Component */
    .icon-element {
      width: 100%;
      height: 100%;
    }

    /* Text Content Wrapper */
    .content-wrapper {
      min-width: 0; /* min-w-0 */
      flex-grow: 1; /* grow */
      padding-right: 2rem; /* pr-8 */
    }

    /* Card Name (Title) */
    .card-title {
      font-weight: 700; /* font-bold */
      color: #ffffff; /* text-white */
      display: block; /* block */
      font-size: 1rem; /* text-base */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap; /* truncate */
      letter-spacing: 0.025em; /* tracking-wide */
      margin-bottom: 0.125rem; /* mb-0.5 */
      transition: color 0.3s ease; /* transition-colors */
    }

    .card-button:hover .card-title {
      color: #a5b4fc; /* group-hover:text-indigo-300 */
    }

    /* Card Subtitle */
    .card-subtitle {
      font-size: 0.75rem; /* text-xs */
      color: #94a3b8; /* text-slate-400 */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap; /* truncate */
      display: block; /* block */
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; /* font-mono */
      opacity: 0.8; /* opacity-80 */
      transition: color 0.3s ease; /* transition-colors */
    }

    .card-button:hover .card-subtitle {
      color: #cbd5e1; /* group-hover:text-slate-300 */
    }

    /* Category Badge */
    .category-badge {
      display: inline-block; /* inline-block */
      margin-top: 0.5rem; /* mt-2 */
      padding: 0.125rem 0.5rem; /* py-0.5 px-2 */
      font-size: 10px; /* text-[10px] */
      text-transform: uppercase; /* uppercase */
      letter-spacing: 0.05em; /* tracking-wider */
      font-weight: 600; /* font-semibold */
      background-color: #0f172a; /* bg-slate-900 */
      border: 1px solid #334155; /* border-slate-700 */
      color: #94a3b8; /* text-slate-400 */
      border-radius: 0.25rem; /* rounded */
    }

    /* Top-Right Absolute Badge Text */
    .top-badge {
      position: absolute;
      top: 1rem; /* top-4 */
      right: 1rem; /* right-4 */
      padding: 0.125rem 0.5rem; /* py-0.5 px-2 */
      font-weight: 700; /* font-bold */
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; /* font-mono */
      font-size: 0.75rem; /* text-xs */
      background-color: #4f46e5; /* bg-indigo-600 */
      color: #ffffff; /* text-white */
      border-radius: 0.25rem; /* rounded */
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.5); /* shadow shadow-indigo-500/50 */
      display: none; /* hidden by default, mapped from 'hidden sm:inline' */
    }

    /* Media query matching the Tailwind 'sm' breakpoint (640px) */
    @media (min-width: 640px) {
      .top-badge {
        display: inline; /* sm:inline */
        font-size: 0.875rem; /* sm:text-sm */
      }
    }
  `;

  constructor() {
    super();
    this.name = "";
    this.subtitle = "";
    this.icon = "";
    this.category = "";
    this.badgeText = "";
    this.showCategoryBadge = false;
  }

  _handleClick() {
    this.dispatchEvent(
      new CustomEvent("card-click", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const isUrl =
      this.subtitle &&
      (this.subtitle.includes(".") || this.subtitle.includes("/"));
    const displaySubtitle = isUrl
      ? this.subtitle.replace(/^https?:\/\/(www\.)?/, "")
      : this.subtitle || "";

    return html`
      <button @click="${this._handleClick}" class="card-button">
        <div class="icon-container">
          <jk-icon .icon=${this.icon} class="icon-element"></jk-icon>
        </div>

        <div class="content-wrapper">
          <span class="card-title">${this.name}</span>
          <span class="card-subtitle">${displaySubtitle}</span>

          ${
            this.showCategoryBadge && this.category
              ? html`<span class="category-badge">${this.category}</span>`
              : ""
          }
        </div>

        ${
          this.badgeText
            ? html`<kbd class="top-badge">${this.badgeText.toUpperCase()}</kbd>`
            : ""
        }
      </button>
    `;
  }
}

customElements.define("jk-service-card", JkServiceCard);
