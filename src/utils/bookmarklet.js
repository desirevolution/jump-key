/** Build a self-contained bookmarklet for this installation, including its base path. */
export function createBookmarklet(baseUrl, currentUrl) {
  const target = new URL(baseUrl, currentUrl);
  target.search = '';
  target.hash = '';
  const code = `(()=>{const u=new URL(${JSON.stringify(target.href)});u.searchParams.set('share','1');u.searchParams.set('url',location.href);u.searchParams.set('title',document.title);window.open(u.href,'_blank','noopener,noreferrer')})()`;
  return `javascript:${encodeURIComponent(code)}`;
}
