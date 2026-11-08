import { LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { reorderPreview, dragInsertionIndex } from '../utils/sort-preview.js';

/** Shared accessible sort surface. Cross-list dropping is intentionally unsupported. */
export class SortableList extends LitElement {
  static properties = { items: {type:Array}, disabled: {type:Boolean}, label: {}, _drag: {state:true}, _landed: {state:true} };
  createRenderRoot() { return this; }
  constructor() {
    super(); this.items=[];this.disabled=false;this.label='Einträge';this._drag=null;
    this._pointer=null;this._landed=null;this._raf=0;this._landingTimer=null;
    this._movePointer=this._movePointer.bind(this);
    this._endPointer=this._endPointer.bind(this);
    this._cancelPointerEvent=this._cancelPointerEvent.bind(this);
    this._globalDragKey=this._globalDragKey.bind(this);
  }
  disconnectedCallback(){this._stopPointer();clearTimeout(this._landingTimer);super.disconnectedCallback();}
  _pointerDown(event, from) {
    if(this.disabled || event.button!==0 || this._drag)return;
    event.preventDefault();
    const handle=event.currentTarget;
    const row=handle.closest('[data-sort-row]');
    const rect=row?.getBoundingClientRect();
    if(!rect)return;
    handle.focus({preventScroll:true});
    this._pointer={id:event.pointerId,from,x:event.clientX,y:event.clientY,
      grabX:event.clientX-rect.left,grabY:event.clientY-rect.top,
      width:rect.width,height:rect.height,outside:false};
    this._drag={from,to:from,mode:'pointer'};
    window.addEventListener('pointermove',this._movePointer,{passive:false});
    window.addEventListener('pointerup',this._endPointer);
    window.addEventListener('pointercancel',this._cancelPointerEvent);
    window.addEventListener('keydown',this._globalDragKey,true);
    this._autoScroll();
    this._announce(`${this.items[from]?.name} aufgenommen. Ziehe an die gewünschte Position.`);
  }
  _movePointer(event){
    if(!this._pointer || event.pointerId!==this._pointer.id)return;
    if(event.cancelable)event.preventDefault();
    this._pointer.x=event.clientX;this._pointer.y=event.clientY;
    this._updatePointerTarget();
    this.requestUpdate();
  }
  _updatePointerTarget(){
    if(!this._pointer || !this._drag)return;
    const list=this.querySelector('.jk-sort-list');
    if(!list)return;
    const rect=list.getBoundingClientRect();
    this._pointer.outside=this._pointer.x < rect.left-18 || this._pointer.x > rect.right+18;
    if(this._pointer.outside)return;
    // A data-drag-source attribute is not a reliable way to distinguish rows:
    // an undefined attribute binding can be serialized, marking every row.
    // Use the stable item ID instead; never fall back to the first position
    // if Lit is in the middle of updating the list.
    const dragged=this.items[this._drag.from];
    const sourceId=dragged?.id??dragged?.name??this._drag.from;
    const rowCenters=[...this.querySelectorAll('[data-sort-row]')].map(row=>({
      id:row.dataset.sortId,
      center:rect.top+row.offsetTop+row.offsetHeight/2,
    }));
    if(rowCenters.length!==this.items.length)return;
    const index=dragInsertionIndex(this._pointer.y,rowCenters,sourceId);
    if(index!==null)this._setTarget(index);
  }
  _setTarget(to){
    if(!this._drag || this._drag.to===to)return;
    const positions=new Map([...this.querySelectorAll('[data-sort-row]')].map(row=>[row.dataset.sortId,row.getBoundingClientRect().top]));
    this._drag={...this._drag,to};
    const dragState=this._drag;
    this.updateComplete.then(()=>{
      if(!this._drag || this._drag!==dragState || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
      for(const row of this.querySelectorAll('[data-sort-row]')){
        if(row.dataset.sortId===String(this.items[dragState.from]?.id??this.items[dragState.from]?.name??dragState.from))continue;
        const old=positions.get(row.dataset.sortId);
        if(old===undefined)continue;
        const delta=old-row.getBoundingClientRect().top;
        if(Math.abs(delta)>1){
          row.getAnimations?.().forEach(animation=>animation.cancel());
          row.animate?.([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
        }
      }
    });
  }
  _scrollParent(){
    let element=this.parentElement;
    while(element){
      const style=getComputedStyle(element);
      if(/auto|scroll/.test(style.overflowY) && element.scrollHeight>element.clientHeight+1)return element;
      element=element.parentElement;
    }
    return document.scrollingElement;
  }
  _autoScroll(){
    if(!this._pointer)return;
    const scroll=this._scrollParent();
    if(scroll){
      const r=scroll===document.scrollingElement?{top:0,bottom:window.innerHeight}:scroll.getBoundingClientRect();
      const distance=48;
      const down=Math.max(0,distance-(r.bottom-this._pointer.y));
      const up=Math.max(0,distance-(this._pointer.y-r.top));
      const step=down>0?Math.min(18,down/3):up>0?-Math.min(18,up/3):0;
      if(step){scroll.scrollTop+=step;this._updatePointerTarget();}
    }
    this._raf=requestAnimationFrame(()=>this._autoScroll());
  }
  _endPointer(event){
    if(!this._pointer||event.pointerId!==this._pointer.id)return;
    this._updatePointerTarget();
    const outside=this._pointer.outside;
    const {from,to}=this._drag||{};
    this._stopPointer();
    if(!outside)this._commit(from,to);
    else this._announce('Außerhalb der Liste losgelassen. Sortierung abgebrochen.');
  }
  _cancelPointerEvent(event){if(this._pointer && event.pointerId===this._pointer.id)this._cancelPointer();}
  _globalDragKey(event){if(this._pointer && event.key==='Escape'){
    event.preventDefault();event.stopPropagation();this._cancelPointer();
  }}
  _cancelPointer(){this._stopPointer();this._announce('Sortierung abgebrochen.');}
  _stopPointer(){
    window.removeEventListener('pointermove',this._movePointer);
    window.removeEventListener('pointerup',this._endPointer);
    window.removeEventListener('pointercancel',this._cancelPointerEvent);
    window.removeEventListener('keydown',this._globalDragKey,true);
    if(this._raf)cancelAnimationFrame(this._raf);
    this._raf=0;this._pointer=null;this._drag=null;
  }
  _keydown(event,index){
    if(this.disabled)return;
    if(this._pointer){if(event.key==='Escape'){event.preventDefault();this._cancelPointer();}return;}
    if(!this._drag){
      if(event.key===' '||event.key==='Spacebar'){
        event.preventDefault();this._drag={from:index,to:index,mode:'keyboard'};
        this._announce('Aufgenommen. Pfeiltasten verschieben, Leertaste oder Enter legt ab, Escape bricht ab.');
      }
      return;
    }
    if(event.key==='Escape'){event.preventDefault();this._drag=null;this._announce('Abgebrochen.');return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      const to=Math.max(0,Math.min(this.items.length-1,this._drag.to+(event.key==='ArrowDown'?1:-1)));
      this._setTarget(to);
      this._announce(`Position ${to+1} von ${this.items.length}`);
      return;
    }
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();const {from,to}=this._drag;this._drag=null;this._commit(from,to);
    }
  }
  _announce(message){const region=this.querySelector('[aria-live]');if(region)region.textContent=message;}
  _commit(from,to){
    if(!Number.isInteger(from)||!Number.isInteger(to)||from===to)return;
    const item=this.items[from];
    this._landed=item?.id??item?.name??null;
    clearTimeout(this._landingTimer);
    this._landingTimer=setTimeout(()=>this._landed=null,240);
    this.dispatchEvent(new CustomEvent('reorder',{detail:{from,to},bubbles:true,composed:true}));
    this._announce(`Auf Position ${to+1} verschoben. Änderung noch nicht gespeichert.`);
  }
  render(){
    const entries=this.items.map((item,originalIndex)=>({item,originalIndex}));
    const reordered=this._drag?reorderPreview(entries,this._drag.from,this._drag.to):entries;
    const dragged=this._drag?this.items[this._drag.from]:null;
    const p=this._pointer;
    return html`<div class="jk-sort-list ${this._drag?'jk-sort-active':''}" aria-label=${this.label}>
      ${repeat(reordered,({item},index)=>item.id??item.name??index,({item,originalIndex},index)=>{
        const source=this._drag?.from===originalIndex;
        const key=item.id??item.name??index;
        return html`<div data-sort-row data-sort-id=${String(key)} ?data-drag-source=${source}
          class="jk-sort-row ${source?(this._drag?.mode==='keyboard'?'jk-sort-keyboard-source':'jk-sort-placeholder'):''} ${this._landed===key?'jk-sort-landed':''}">
          <button class="jk-sort-handle" type="button" ?disabled=${this.disabled}
            aria-label=${`${item.name} verschieben. Leertaste aufnehmen, Pfeiltasten bewegen, Enter ablegen, Escape abbrechen.`}
            aria-pressed=${String(source)}
            @pointerdown=${e=>this._pointerDown(e,originalIndex)}
            @keydown=${e=>this._keydown(e,originalIndex)}><span aria-hidden="true">⠿</span></button>
          ${item.select?html`<button type="button" class="jk-sort-description jk-sort-select ${item.selected?'jk-sort-selected':''}"
            aria-current=${item.selected?'true':'false'} @click=${item.select}>
            <strong title=${item.name}>${item.name}</strong>${item.subtitleMain!==undefined?html`<small class="jk-sort-meta"><span class="jk-sort-meta-primary" title=${item.subtitleMain}>${item.subtitleMain}</span><span aria-hidden="true">·</span><span class="jk-sort-meta-shortcut">${item.subtitleShortcut}</span></small>`:item.subtitle?html`<small title=${item.subtitle}>${item.subtitle}</small>`:''}
          </button>`:html`<div class="jk-sort-description"><strong title=${item.name}>${item.name}</strong>${item.subtitleMain!==undefined?html`<small class="jk-sort-meta"><span class="jk-sort-meta-primary" title=${item.subtitleMain}>${item.subtitleMain}</span><span aria-hidden="true">·</span><span class="jk-sort-meta-shortcut">${item.subtitleShortcut}</span></small>`:item.subtitle?html`<small title=${item.subtitle}>${item.subtitle}</small>`:''}</div>`}
          ${item.actions?html`<div class="jk-sort-actions">${item.actions}</div>`:''}
        </div>`;
      })}
      ${p&&dragged?html`<div class="jk-sort-floating ${p.outside?'jk-sort-floating-outside':''}"
        style=${`left:${p.x-p.grabX}px;top:${p.y-p.grabY}px;width:${p.width}px;min-height:${p.height}px;`} aria-hidden="true">
        <span class="jk-sort-floating-grip">⠿</span><span class="jk-sort-floating-description"><strong>${dragged.name}</strong><small>${dragged.subtitle||''}</small></span>
      </div>`:''}
      <span class="jk-sr-only" aria-live="polite" aria-atomic="true"></span>
    </div>`;
  }
}
customElements.define('jk-sortable-list',SortableList);
