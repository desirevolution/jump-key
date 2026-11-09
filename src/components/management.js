import { LitElement, html } from 'lit';
import { generateShortcuts } from '../utils/shortcuts.js';
import { migrateConfig } from '../utils/configuration.js';
import { workspaceSlug, workspaceError, createWorkspaceRequest, workspaceHeaders } from '../utils/workspace-management.js';
import { reorderItems, reorderConfiguration, addCategory, editCategory, deleteCategory, suggestCategoryShortcut, categoryError } from '../utils/management.js';
import { buildDeleteConfig } from '../utils/quick-add.js';
import { prepareSortSave } from '../utils/sort-save.js';
import { draftKind, selectionAfterRemoval, workspaceIndexById, categoryIndexByName, serviceIndexById } from '../utils/management-draft.js';
import './sortable-list.js';
import './change-guard.js';
import './icon.js';
import './icon-picker.js';

const base = import.meta.env.BASE_URL;
const titles = { workspace: 'Workspace', category: 'Kategorie', service: 'Service' };

/** Adaptive master-detail manager. There is no second set of management tabs. */
export class JkManagement extends LitElement {
  createRenderRoot() { return this; }
  static properties = {
    user: {}, activeWorkspace: {}, readOnly: {type:Boolean}, t: {},
    _workspaces: {state:true}, _workspaceDraft: {state:true}, _selected: {state:true},
    _selectedCategory: {state:true}, _config: {state:true}, _configDraft: {state:true},
    _mobileStep: {state:true}, _workspacePane: {state:true}, _view: {state:true},
    _error: {state:true}, _busy: {state:true}, _promptNav: {state:true},
    _formDirty: {state:true}, _formValid: {state:true}, _categoryError: {state:true},
    _categoryKeyMode: {state:true}, _categoryKey: {state:true}, _categoryName: {state:true}, _categoryIcon: {state:true}, _confirm: {state:true},
  };
  constructor() {
    super(); this._categoryKeyMode='auto'; this._categoryKey=''; this._categoryName=''; this._categoryIcon=''; this._categoryError=''; this.t = k=>k; this._workspaces=[]; this._workspaceDraft=[];
    this._selected=''; this._selectedCategory=0; this._config=null; this._configDraft=null;
    this._mobileStep='categories'; this._workspacePane=false; this._view='list';
    this._error=''; this._busy=false; this._promptNav=false; this._formDirty=false; this._confirm=null;
    this._orderETag=null; this._configETag=null; this._next=null;this._preferredIndex=null;
    this._destination='zur vorherigen Ansicht zurückkehrst';
  }
  connectedCallback() { super.connectedCallback(); this._refreshWorkspaces(); }
  _draftKind() { return draftKind(this._workspaces,this._workspaceDraft,this._config,this._configDraft); }
  get hasUnsavedChanges() { return this._formDirty || Boolean(this._draftKind()); }
  get editing() { return this._view!=='list' || Boolean(this._confirm) || this._promptNav || Boolean(this.querySelector('jk-sortable-list')?._drag); }
  _emit(name,detail) { this.dispatchEvent(new CustomEvent(name,{detail,bubbles:true,composed:true})); }

  async _refreshWorkspaces(prefer) {
    if (this._draftKind()) { this._error='Ungespeicherte Sortierung zuerst speichern oder verwerfen.'; return; }
    try {
      const response=await fetch(`${base}api/workspaces`,{cache:'no-store'});
      if(!response.ok)throw await workspaceError(response);
      const data=await response.json();
      this._workspaces=data.workspaces||[];
      this._workspaceDraft=[...this._workspaces];
      this._orderETag=data.orderETag||response.headers.get('ETag');
      this._emit('workspaces-refreshed',data);
      const next=this._workspaces.find(w=>w.id===(prefer||this._selected))?.id
        || this._workspaces[this._preferredIndex===null?0:Math.min(this._preferredIndex,this._workspaces.length-1)]?.id;
      this._preferredIndex=null;
      // Reload the selected config too: its ETag may have changed since the
      // management view was opened (e.g. a save from another editor/tab).
      if(next) await this._loadConfig(next);
      if(!next) {this._selected='';this._config=null;this._configDraft=null;}
    }catch(error){this._error=error.message||'Workspaces konnten nicht geladen werden.';}
  }
  async _loadConfig(id) {
    const categoryName=id===this._selected?this._activeCategory?.category:null;
    this._busy=true; this._error='';
    try {
      const response=await fetch(`${base}config/services.json?workspace=${encodeURIComponent(id)}`,{
        cache:'no-store',headers:{'X-JumpKey-User':this.user||''},
      });
      if(!response.ok)throw await workspaceError(response);
      const config=migrateConfig(await response.json());
      this._selected=id; this._config=config; this._configDraft=structuredClone(config);
      this._configETag=response.headers.get('ETag');
      const index=categoryIndexByName(config,categoryName);
      this._selectedCategory=index>=0?index:0;
    }catch(error){this._error=error.message||'Workspace konnte nicht geladen werden.';}
    finally{this._busy=false;}
  }
  async _saveConfig(next, { expectedETag = this._configETag, workspaceId = this._selected } = {}) {
    if(this.readOnly || !expectedETag)throw new Error('Konfigurationsversion fehlt; bitte neu laden.');
    const config=migrateConfig(next);
    const response=await fetch(`${base}config/services.json?workspace=${encodeURIComponent(workspaceId)}`,{
      method:'PUT',headers:workspaceHeaders(this.user,{'If-Match':expectedETag}),body:JSON.stringify(config,null,2),
    });
    if(!response.ok)throw await workspaceError(response);
    this._configETag=response.headers.get('ETag');
    this._config=config; this._configDraft=structuredClone(config);
    this._emit('management-config-saved',{id:workspaceId,config,etag:this._configETag});
    return config;
  }
  async _saveSort() {
    const kind=this._draftKind();
    if(!kind || this.readOnly || this._busy)return !kind;
    if(kind==='conflict'){this._error='Zwei unterschiedliche Speicherbereiche sind verändert. Bitte neu laden.';return false;}
    this._busy=true;this._error='';
    try {
      if(kind==='workspaces') {
        if(!this._orderETag)throw new Error('Workspace-Versionskennung fehlt.');
        const response=await fetch(`${base}api/workspace-order`,{
          method:'PUT',headers:workspaceHeaders(this.user,{'If-Match':this._orderETag}),
          body:JSON.stringify({order:this._workspaceDraft.map(w=>w.id)}),
        });
        if(!response.ok)throw await workspaceError(response);
        this._workspaces=[...this._workspaceDraft];
        this._orderETag=response.headers.get('ETag')||this._orderETag;
        await this._refreshWorkspaces(this._selected);
      } else {
        // A sorter can be based on an old manager ETag after a dashboard edit.
        // Rebase only ordering on fresh data, never overwrite other edits.
        const workspaceId=this._selected;
        const prepared=await prepareSortSave({base,user:this.user,id:workspaceId,baseline:this._config,draft:this._configDraft});
        await this._saveConfig(prepared.config,{expectedETag:prepared.etag,workspaceId});
      }
      this._emit('notify',{type:'success',message:'Reihenfolge gespeichert.'});
      return true;
    }catch(error){this._error=error.status===412?'Versionskonflikt: Der Serverstand hat sich geändert. Bitte Änderungen vergleichen.':error.message;return false;}
    finally{this._busy=false;}
  }
  _discardSort() {
    const selectedName=this._activeCategory?.category;
    this._workspaceDraft=[...this._workspaces];
    if(this._config){
      this._configDraft=structuredClone(this._config);
      const index=categoryIndexByName(this._configDraft,selectedName);
      this._selectedCategory=index>=0?index:Math.min(this._selectedCategory,Math.max(0,this._configDraft.categories.length-1));
    }
  }
  /** Public: the settings shell uses this same guard for navigation away. */
  requestNavigate(fn,destination='fortfährst') {
    if(this.hasUnsavedChanges) {
      this._next=fn;this._destination=destination;this._promptNav=true;
      return false;
    }
    fn();return true;
  }
  _guard(fn,destination='fortfährst'){return this.requestNavigate(fn,destination);}
  async _resolveNav(save) {
    if(this._busy)return;
    if(save) {
      if(this._view!=='list') {
        // Keep the destination queued. A successful form submit consumes it.
        const form=this.querySelector('.jk-manager-form');
        if(!form?.reportValidity())return;
        form.requestSubmit();return;
      }
      if(!await this._saveSort()){this._stay();return;}
    }else {
      this._discardSort();this._formDirty=false;this._view='list';
    }
    const next=this._next;
    this._next=null;this._promptNav=false;
    next?.();
  }
  _stay(){this._promptNav=false;this._next=null;}
  discardChanges(){this._discardSort();this._formDirty=false;this._view='list';this._confirm=null;this._stay();}
  _selectWorkspace(id) {
    if(this._busy)return;
    if(id===this._selected){this._mobileStep='categories';this._workspacePane=false;return;}
    // Selecting a workspace is allowed with an open *workspace-order* draft.
    const change=()=>{this._loadConfig(id);this._mobileStep='categories';this._workspacePane=false;};
    if(this._draftKind()==='config')this._guard(change,`zu Workspace „${id}“ wechselst`);
    else change();
  }
  _selectCategory(index) {
    if(this._busy)return;
    this._selectedCategory=index;
    this._mobileStep='services';
  }
  _reorder(event,type) {
    if(this.readOnly||this._busy)return;
    const {from,to}=event.detail;
    const wanted=type==='workspaces'?'workspaces':'config';
    const action=()=>{
      if(type==='workspaces') {this._workspaceDraft=reorderItems(this._workspaceDraft,from,to)||this._workspaceDraft;return;}
      const selected=this._configDraft?.categories?.[this._selectedCategory]?.category;
      const next=reorderConfiguration(this._configDraft,type,this._selectedCategory,from,to);
      if(next){this._configDraft=next; if(type==='categories')this._selectedCategory=Math.max(0,next.categories.findIndex(c=>c.category===selected));}
    };
    const active=this._draftKind();
    if(active && active!==wanted)this._guard(action,'im anderen Bereich sortierst');
    else action();
  }
  _startForm(type,mode,index=-1,advanced=false){
    const identity=type==='workspace'?this._workspaceDraft[index]?.id
      :type==='category'?this._configDraft?.categories[index]?.category:null;
    this._guard(()=>{
      const resolved=type==='workspace'&&index>=0?workspaceIndexById(this._workspaceDraft,identity)
        :type==='category'&&index>=0?categoryIndexByName(this._configDraft,identity):index;
      if(index>=0 && resolved<0){this._error='Der Eintrag ist nicht mehr vorhanden. Bitte neu laden.';return;}
      this._view=type;this._formMode=mode;this._formIndex=resolved;
      this._formDirty=false;this._formValid=mode!=='create';this._categoryError='';this._error='';
      this._formSource=type==='workspace'?this._workspaceDraft[resolved]?.id||this._selected:'';
      this._idEdited=false;this._showAdvancedId=advanced;
      this._formInitial=this._formDefaults(type,mode,resolved);
      if(type==='category') {
        this._categoryKeyMode=this._formInitial.keyMode;
        this._categoryKey=this._formInitial.shortcut||'';
        this._categoryName=this._formInitial.name;
        this._categoryIcon=this._formInitial.icon||'';
      }
    },`„${titles[type]} bearbeiten“ öffnest`);
  }
  _formDefaults(type,mode,index){
    if(type==='workspace'){
      const selected=this._workspaceDraft[index];
      if(mode==='edit')return {name:selected?.name||'',id:selected?.id||''};
      if(mode==='duplicate')return {name:`${selected?.name||''} (Kopie)`,id:workspaceSlug((selected?.id||'workspace')+'-copy')};
      return {name:'',id:''};
    }
    if(mode==='edit') {
      const category=this._config?.categories[index];
      const key=category?.categoryKey||'';
      const keyMode=category?.shortcutDisabled?'none':key?'manual':'auto';
      return {name:category?.category||'',keyMode,...(keyMode==='manual'?{shortcut:key}:{}),icon:category?.icon||''};
    }
    return {name:'',keyMode:'auto',icon:''};
  }
  _formChanged(){
    const form=this.querySelector('.jk-manager-form');
    if(!form)return;
    this._formDirty=JSON.stringify(Object.fromEntries(new FormData(form).entries()))!==JSON.stringify(this._formInitial);
    this._formValid=form.checkValidity();
    if(this._view==='category') {
      const values=Object.fromEntries(new FormData(form).entries());
      this._categoryError=categoryError(this._config||{categories:[]},values.name||'',values.shortcut?.trim()||'',
        this._formMode==='edit'?this._formIndex:-1,values.keyMode);
      this._formValid=this._formValid&&!this._categoryError;
    }
  }
  _openService(index=-1){
    const categoryName=this._activeCategory?.category;
    const serviceId=index>=0?this._activeCategory?.services[index]?.id:null;
    this._guard(()=>{
      const categoryIndex=categoryIndexByName(this._configDraft,categoryName);
      if(categoryIndex<0){this._error='Die Kategorie ist nicht mehr vorhanden.';return;}
      if(serviceId && serviceIndexById(this._configDraft,categoryIndex,serviceId)<0){
        this._error='Der Service ist nicht mehr vorhanden.';return;
      }
      this._selectedCategory=categoryIndex;
      this._emit('open-service-editor',{
        initial:serviceId?{serviceId}:{},config:this._config,
        initialCategoryIndex:categoryIndex,
        saveConfig:next=>this._saveConfig(next),workspaceId:this._selected,
      });
    },'den Service-Editor öffnest');
  }
  _back(){this._guard(()=>{this._view='list';this._formDirty=false;this._error='';},'zur Verwaltung zurückkehrst');}
  goBack(){this._back();}
  async _formSubmit(event){
    event.preventDefault();if(this.readOnly||this._busy)return;
    const values=Object.fromEntries(new FormData(event.currentTarget).entries());
    this._busy=true;this._error='';
    try {
      if(this._view==='workspace'){
        const id=values.id.trim(),name=values.name.trim();
        if(!name||name.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||id.length>64)throw new Error('Ungültiger Name oder technische ID.');
        if(this._formMode==='create'||this._formMode==='duplicate'){
          await createWorkspaceRequest({base,user:this.user,id,name,sourceId:this._formMode==='duplicate'?this._formSource:''});
          await this._refreshWorkspaces(id);
        }else{
          const previous=this._formSource;
          let revision=this._configETag;
          if(previous!==this._selected){
            const current=await fetch(`${base}config/services.json?workspace=${encodeURIComponent(previous)}`,{cache:'no-store',headers:{'X-JumpKey-User':this.user||''}});
            if(!current.ok)throw await workspaceError(current);
            revision=current.headers.get('ETag');
          }
          const response=await fetch(`${base}api/workspaces/${encodeURIComponent(previous)}`,{
            method:'PATCH',headers:workspaceHeaders(this.user,{'If-Match':revision}),
            body:JSON.stringify({name,...(id!==previous?{id}:{})}),
          });
          if(!response.ok)throw await workspaceError(response);
          await this._refreshWorkspaces(id);
          if(id!==this._selected)await this._loadConfig(id);
        }
      }else if(this._view==='category'){
        const next=this._formMode==='create'
          ?addCategory(this._config,values.name,values.keyMode,values.shortcut?.trim()||'',values.icon||'')
          :editCategory(this._config,this._formIndex,values.name,values.shortcut?.trim()||'',values.keyMode,values.icon||'');
        await this._saveConfig(next);
        this._selectedCategory=this._formMode==='create'?next.categories.length-1:Math.min(this._selectedCategory,next.categories.length-1);
      }
      this._view='list';this._formDirty=false;
      this._emit('notify',{type:'success',message:'Änderungen gespeichert.'});
      if(this._promptNav){const fn=this._next;this._stay();fn?.();}
    }catch(error){this._error=error.status===412?'Versionskonflikt: Bitte Serverstand prüfen, bevor du erneut speicherst.':error.message;
      if(this._promptNav)this._stay();}
    finally{this._busy=false;}
  }
  _requestDelete(kind,index){
    const workspaceId=kind==='workspace'?this._workspaceDraft[index]?.id:null;
    const categoryName=this._activeCategory?.category;
    const targetCategory=kind==='category'?this._configDraft?.categories[index]?.category:null;
    const serviceId=kind==='service'?this._activeCategory?.services[index]?.id:null;
    this._guard(()=>{
      let resolved=index;
      if(kind==='workspace')resolved=workspaceIndexById(this._workspaceDraft,workspaceId);
      if(kind==='category')resolved=categoryIndexByName(this._configDraft,targetCategory);
      if(kind==='service'){
        const catIndex=categoryIndexByName(this._configDraft,categoryName);
        if(catIndex>=0){this._selectedCategory=catIndex;resolved=serviceIndexById(this._configDraft,catIndex,serviceId);}
        else resolved=-1;
      }
      if(resolved<0){this._error='Der Eintrag ist nicht mehr vorhanden. Bitte neu laden.';return;}
      this._deleteReturnFocus=document.activeElement;
      this._confirm={kind,index:resolved};this._error='';
    },'die Löschbestätigung öffnest');
  }
  _cancelDelete(){
    this._confirm=null;
    if(this._deleteReturnFocus?.isConnected)this._deleteReturnFocus.focus({preventScroll:true});
  }
  updated(changed){
    if(changed.has('_view'))this._emit('management-view-changed',{editing:this._view!=='list'});
    if(changed.has('_confirm') && this._confirm)this.querySelector('.jk-manager-delete-cancel')?.focus();
  }
  _deleteKey(e){
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();this._cancelDelete();}
    if(e.key!=='Tab')return;
    const buttons=[...this.querySelectorAll('.jk-manager-delete-dialog button:not(:disabled)')];
    const index=buttons.indexOf(document.activeElement);
    if(e.shiftKey && index<=0){e.preventDefault();buttons.at(-1)?.focus();}
    else if(!e.shiftKey && index===buttons.length-1){e.preventDefault();buttons[0]?.focus();}
  }
  async _deleteConfirmed(){
    if(!this._confirm||this._busy)return;
    const {kind,index}=this._confirm;this._busy=true;this._error='';
    try {
      if(kind==='workspace'){
        const entry=this._workspaceDraft[index];
        const configResponse=await fetch(`${base}config/services.json?workspace=${encodeURIComponent(entry.id)}`,{
          cache:'no-store',headers:{'X-JumpKey-User':this.user||''},
        });
        if(!configResponse.ok)throw await workspaceError(configResponse);
        const response=await fetch(`${base}api/workspaces/${encodeURIComponent(entry.id)}`,{
          method:'DELETE',headers:workspaceHeaders(this.user,{'If-Match':configResponse.headers.get('ETag')}),
        });
        if(!response.ok)throw await workspaceError(response);
        if(entry.id===this._selected){this._selected='';this._preferredIndex=index;}
        await this._refreshWorkspaces(this._selected);
      }else{
        const next=kind==='category' ? deleteCategory(this._config,index)
          : buildDeleteConfig(this._config,this._config.categories[this._selectedCategory]?.services[index]?.id);
        await this._saveConfig(next);
        if(kind==='category')this._selectedCategory=selectionAfterRemoval(this._selectedCategory,index,next.categories.length);
      }
      this._confirm=null;this._emit('notify',{type:'success',message:'Gelöscht.'});
    }catch(error){this._error=error.status===412?'Versionskonflikt – bitte den Serverstand prüfen.':error.message;}
    finally{this._busy=false;}
  }
  get _activeCategory(){return this._configDraft?.categories?.[this._selectedCategory];}
  _formView(){
    if(this._view==='workspace'){
      const current=this._workspaces.find(w=>w.id===this._formSource);
      const existing=this._formMode==='edit';
      return html`<form class="jk-manager-form" @submit=${this._formSubmit} @input=${this._formChanged}>
        <label>Anzeigename<input name="name" maxlength="64" required autocomplete="off" .value=${existing?current?.name||'':this._formMode==='duplicate'?`${current?.name||''} (Kopie)`:''} @input=${e=>{if(!existing&&!this._idEdited)this.querySelector('.jk-manager-form [name=id]').value=workspaceSlug(e.target.value);}}></label>
        ${existing?html`<details class="jk-advanced" ?open=${this._showAdvancedId}><summary>Erweitert: Technische ID / Dateiname</summary>
          <label>Technische ID<input name="id" maxlength="64" required pattern="[a-z0-9]+(-[a-z0-9]+)*" autocomplete="off" .value=${current?.id||''} @input=${()=>this._idEdited=true}></label>
          <p class="jk-manager-hint">Eine ID-Änderung benennt die Datei um und aktualisiert lokale Referenzen beim nächsten Abgleich.</p>
        </details>`:html`<label>Technische ID / Dateiname<input name="id" maxlength="64" required pattern="[a-z0-9]+(-[a-z0-9]+)*" autocomplete="off" .value=${this._formMode==='duplicate'?workspaceSlug((current?.id||'workspace')+'-copy'):''} @input=${()=>this._idEdited=true}></label>`}
        <div class="jk-manager-footer"><button type="button" class="jk-btn jk-btn-secondary" @click=${this._back}>Abbrechen</button><button class="jk-btn jk-btn-primary" ?disabled=${this._busy||!this._formValid||(this._formMode==='edit'&&!this._formDirty)}>Speichern</button></div>
      </form>`;
    }
    const category=this._config?.categories[this._formIndex];
    return html`<form class="jk-manager-form" @submit=${this._formSubmit} @input=${this._formChanged}>
      <label>Kategoriename<input name="name" required maxlength="120" autocomplete="off" .value=${this._categoryName||''} @input=${e=>this._categoryName=e.target.value}></label>
      <label>Shortcut-Vergabe<select name="keyMode" .value=${this._categoryKeyMode||'auto'} @change=${e=>{
        this._categoryKeyMode=e.target.value;
        this.updateComplete.then(()=>this._formChanged());
      }}>
        <option value="auto">Automatisch</option>
        <option value="manual">Manuell</option>
        <option value="none">Kein Shortcut</option>
      </select></label>
      ${this._categoryKeyMode==='manual'?html`
        <label>Shortcut (A–Z)<input name="shortcut" maxlength="1" pattern="[A-Za-z]?" autocomplete="off"
          .value=${this._categoryKey||''} @input=${e=>this._categoryKey=e.target.value}></label>
        <p class="jk-manager-hint">Eine freie Taste A–Z wählen. Belegte Kürzel können nicht ausgewählt werden.</p>
        <div class="jk-shortcut-grid" role="group" aria-label="Verfügbare Tasten">
          ${[...'abcdefghijklmnopqrstuvwxyz'].map(letter=>{
            const taken=generateShortcuts(this._config?.categories||[]).some((cat,i)=>i!==this._formIndex && cat.categoryKey===letter);
            return html`<button type="button" ?disabled=${taken} aria-pressed=${String((this._categoryKey||'').toLowerCase()===letter)}
              title=${taken?'Bereits belegt':'Frei'} @click=${()=>{
                this._categoryKey=letter;
                const input=this.querySelector('.jk-manager-form [name=shortcut]');
                if(input)input.value=letter;
                this._formChanged();
              }}>${letter.toUpperCase()}</button>`;
          })}
        </div>`:this._categoryKeyMode==='auto'?html`<p class="jk-manager-hint">${
          this._categoryName.trim()
            ? (suggestCategoryShortcut(this._config||{categories:[]},this._categoryName,this._formMode==='edit'?this._formIndex:-1)
              ? `Vorschlag: ${suggestCategoryShortcut(this._config||{categories:[]},this._categoryName,this._formMode==='edit'?this._formIndex:-1).toUpperCase()}`
              : 'Kein freier Shortcut vorhanden.')
            : 'Kategoriename eingeben, um einen Shortcut vorzuschlagen.'
        }</p>`:''}
      <jk-icon-picker .value=${this._categoryIcon} @change-icon=${e=>{
        this._categoryIcon=e.detail;
        this.updateComplete.then(()=>this._formChanged());
      }}></jk-icon-picker>
      ${this._categoryError&&this._formDirty?html`<p class="jk-status-danger" role="status">${this._categoryError}</p>`:''}
      <div class="jk-manager-footer"><button type="button" class="jk-btn jk-btn-secondary" @click=${this._back}>Abbrechen</button><button class="jk-btn jk-btn-primary" ?disabled=${this._busy||!this._formValid||(this._formMode==='edit'&&!this._formDirty)}>Speichern</button></div>
    </form>`;
  }
  _editButton(name,handler){return html`<button type="button" class="jk-manager-edit" aria-label=${`${name} bearbeiten`} title="Bearbeiten" @click=${handler}><jk-icon icon="ui:pencil" class="size-4"></jk-icon></button>`;}
  _actionButton(name,icon,handler,{danger=false,disabled=false}={}){return html`<button type="button" class=${`jk-manager-edit jk-manager-direct-action ${danger?'jk-manager-delete-action':''}`}
    aria-label=${name} title=${name} ?disabled=${disabled} @click=${handler}><jk-icon .icon=${icon} class="size-4"></jk-icon></button>`;}
  _workspaceItems(){return this._workspaceDraft.map((w,i)=>({
    id:w.id,name:w.name||w.id,subtitle:`${w.id}.json`,selected:w.id===this._selected,
    select:()=>this._selectWorkspace(w.id),
    actions:this.readOnly?null:html`${this._editButton(`Workspace ${w.name||w.id}`,()=>this._startForm('workspace','edit',i))}
      ${this._actionButton(`Workspace ${w.name||w.id} duplizieren`,'ui:copy',()=>this._startForm('workspace','duplicate',i))}
      ${this._actionButton(`Workspace ${w.name||w.id} löschen`,'ui:trash-2',()=>this._requestDelete('workspace',i),{danger:true,disabled:this._workspaceDraft.length<2})}`,
  }));}
  _categoryItems(){const keys=generateShortcuts(this._configDraft?.categories||[]);return (this._configDraft?.categories||[]).map((c,i)=>({
    id:c.category,name:c.category,subtitle:`${c.services.length} Services · ${keys[i]?.categoryKey?`Shortcut: ${keys[i].categoryKey.toUpperCase()}`:'Kein Shortcut'}`,
    subtitleMain:`${c.services.length} Services`,subtitleShortcut:keys[i]?.categoryKey?`Shortcut: ${keys[i].categoryKey.toUpperCase()}`:'Kein Shortcut',
    selected:i===this._selectedCategory,select:()=>this._selectCategory(i),
    actions:this.readOnly?null:html`${this._editButton(`Kategorie ${c.category}`,()=>this._startForm('category','edit',i))}
      ${this._actionButton(`Kategorie ${c.category} löschen`,'ui:trash-2',()=>this._requestDelete('category',i),{danger:true})}`,
  }));}
  _serviceItems(){return (generateShortcuts(this._configDraft?.categories||[])[this._selectedCategory]?.services||[]).map((s,i)=>({
    id:s.id,name:s.name,subtitle:`${s.url||'Keine URL'} · ${s.key?`Shortcut: ${s.key.toUpperCase()}`:'Kein Shortcut'}`,
    subtitleMain:s.url||'Keine URL',subtitleShortcut:s.key?`Shortcut: ${s.key.toUpperCase()}`:'Kein Shortcut',
    actions:this.readOnly?null:html`${this._editButton(`Service ${s.name}`,()=>this._openService(i))}
      ${this._actionButton(`Service ${s.name} löschen`,'ui:trash-2',()=>this._requestDelete('service',i),{danger:true})}`,
  }));}
  _workspaceChooser(){return html`<div class="jk-manager-context"><label>Workspace
    <select .value=${this._selected} ?disabled=${this._busy} @change=${e=>{const id=e.target.value;this._selectWorkspace(id);e.target.value=this._selected;}}>
      ${this._workspaces.map(w=>html`<option value=${w.id}>${w.name||w.id}</option>`)}
    </select></label>
    <button type="button" class="jk-manager-workspace-link" @click=${()=>{this._workspacePane=true;this._mobileStep='workspaces';}}>Workspaces verwalten</button>
  </div>`;}
  _panel(type,items){return html`<section class="jk-manager-panel jk-manager-panel-${type}" aria-label=${type==='workspaces'?'Workspaces':type==='categories'?'Kategorien':'Services'}>
    <header class="jk-manager-panel-header"><h3>${type==='workspaces'?'Workspaces':type==='categories'?'Kategorien':'Services'}</h3>
      ${!this.readOnly?html`<button type="button" class="jk-manager-plus" aria-label=${`${type==='workspaces'?'Workspace':type==='categories'?'Kategorie':'Service'} erstellen`}
        title="Erstellen" ?disabled=${this._busy||(type!=='workspaces'&&!this._config)||(type==='services'&&!this._activeCategory)}
        @click=${()=>type==='workspaces'?this._startForm('workspace','create'):type==='categories'?this._startForm('category','create'):this._openService()}>+ <span class="jk-sr-only">Erstellen</span></button>`:''}</header>
    ${items.length?html`<jk-sortable-list .items=${items} .disabled=${this.readOnly||this._busy} .label=${type}
      @reorder=${e=>{e.stopPropagation();this._reorder(e,type);}}></jk-sortable-list>`:
      html`<p class="jk-manager-empty">${type==='workspaces'?'Keine Workspaces vorhanden':type==='categories'?'Noch keine Kategorien. Erstelle die erste Kategorie.':'Keine Services in dieser Kategorie.'}</p>`}
  </section>`;}
  _mobileBack(){if(this._workspacePane){this._workspacePane=false;this._mobileStep='categories';}
    else if(this._mobileStep==='services')this._mobileStep='categories';}
  render(){
    const kind=this._draftKind();
    const selectedName=this._workspaces.find(w=>w.id===this._selected)?.name||this._selected;
    return html`<div class="jk-manager" data-mobile-step=${this._mobileStep} ?data-workspace-pane=${this._workspacePane}>
      ${this._view!=='list'?html`<div class="jk-manager-subview">
        <div class="jk-editor-title"><h2>${this._formMode==='create'?`${titles[this._view]} erstellen`:this._formMode==='duplicate'?'Workspace duplizieren':`${titles[this._view]} bearbeiten`}</h2>
          <p>${this._view==='workspace'?'Workspace-Verwaltung':`${this._workspaces.find(w=>w.id===this._selected)?.name||this._selected}${this._view==='category'?' · Kategorien':''}`}</p></div>
        <div class="jk-manager-form-width">${this._formView()}</div>
      </div>`:html`
        <div class="jk-manager-mobile-header">
          <button type="button" class="jk-manager-back" @click=${this._mobileBack} ?hidden=${!this._workspacePane&&this._mobileStep==='categories'}>← Zurück</button>
          <strong>${this._workspacePane?'Workspaces':this._mobileStep==='services'?'Services':'Kategorien'}</strong>
        </div>
        ${this._workspaceChooser()}
        <div class="jk-manager-grid">
          ${this._panel('workspaces',this._workspaceItems())}
          ${this._panel('categories',this._categoryItems())}
          ${this._panel('services',this._serviceItems())}
        </div>
        ${kind?html`<div class="jk-manager-savebar" role="status"><div><strong>Ungespeicherte Sortierung</strong><small>${kind==='workspaces'?'Workspace-Reihenfolge':kind==='config'?`Kategorien und Services · ${selectedName}`:'Unvereinbare Entwürfe'}</small></div>
          <button type="button" class="jk-btn jk-btn-secondary" ?disabled=${this._busy} @click=${this._discardSort}>Verwerfen</button>
          <button type="button" class="jk-btn jk-btn-primary" ?disabled=${this._busy||this.readOnly||kind==='conflict'} @click=${this._saveSort}>${this._busy?'Speichern …':'Speichern'}</button>
        </div>`:''}
      `}
      ${this._error?html`<div role="alert" class="jk-config-save-error"><p>${this._error}</p><button type="button" class="jk-btn jk-btn-secondary" @click=${()=>this._guard(()=>this._refreshWorkspaces(this._selected),'den Serverstand neu lädst')}>Serverstand neu laden</button></div>`:''}
      ${this._confirm?html`<div class="jk-change-guard-backdrop" @keydown=${this._deleteKey}><section role="alertdialog" aria-modal="true"
        aria-labelledby="jk-manager-delete-title" aria-describedby="jk-manager-delete-message" class="jk-change-guard jk-manager-delete-dialog">
        <h2 id="jk-manager-delete-title">${titles[this._confirm.kind]} wirklich löschen?</h2>
        <p id="jk-manager-delete-message">${this._confirm.kind==='workspace'?'Die aktuellste Version wird dauerhaft gesichert. Der letzte Workspace kann nicht gelöscht werden.':this._confirm.kind==='category'?`${this._config?.categories[this._confirm.index]?.services?.length||0} Services werden mitgelöscht. Vorher erfolgt ein Backup.`:'Der Service wird auch aus Favoriten und Verlauf entfernt.'}</p>
        <div class="jk-change-guard-actions"><button type="button" class="jk-btn jk-btn-secondary jk-manager-delete-cancel" ?disabled=${this._busy} @click=${this._cancelDelete}>Abbrechen</button>
          <button type="button" class="jk-btn jk-btn-danger-filled" ?disabled=${this._busy} @click=${this._deleteConfirmed}>Löschen</button></div>
      </section></div>`:''}
      ${this._promptNav?html`<jk-change-guard .destination=${this._destination} .subject=${this._view==='list'?'Die Sortierung':'Die Eingaben'} .busy=${this._busy}
        @guard-stay=${this._stay} @guard-discard=${()=>this._resolveNav(false)} @guard-save=${()=>this._resolveNav(true)}
        .saveDisabled=${this._view!=='list' && this._formValid===false}></jk-change-guard>`:''}
    </div>`;
  }
}
customElements.define('jk-management',JkManagement);
