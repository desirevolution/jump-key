import { readJsonStorage, writeJsonStorage } from './storage.js';
export class InstallController {
  constructor(host) {
    this.host=host; host.addController(this);
    this.dismissed=readJsonStorage('jump-key-install-dismissed',false);
    this.standalone=matchMedia('(display-mode: standalone)');
    this.capture=e=>{e.preventDefault();this.promptEvent=e;this.host.requestUpdate();};
    this.installed=()=>{this.promptEvent=null;this.done=true;this.host.requestUpdate();};
    this.change=()=>this.host.requestUpdate();
  }
  hostConnected() { window.addEventListener('beforeinstallprompt',this.capture);window.addEventListener('appinstalled',this.installed);this.standalone.addEventListener('change',this.change); }
  hostDisconnected() {window.removeEventListener('beforeinstallprompt',this.capture);window.removeEventListener('appinstalled',this.installed);this.standalone.removeEventListener('change',this.change);}
  get available() { return isSecureContext && !this.done && !this.standalone.matches && !navigator.standalone; }
  dismiss() {this.dismissed=true;writeJsonStorage('jump-key-install-dismissed',true);this.host.requestUpdate();}
  async install() {
    if (!this.promptEvent) return false;
    const event=this.promptEvent;this.promptEvent=null;
    await event.prompt();
    const choice=await event.userChoice;
    if(choice.outcome==='accepted') this.done=true;
    this.host.requestUpdate();return true;
  }
}
