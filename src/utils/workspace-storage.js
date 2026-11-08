export function workspaceStorage(user,id) {
 const scope = `jumpkey:${encodeURIComponent(user)}:${id}:`;
 return { favorites:scope+'favorites', continueHistory:scope+'history', configCache:scope+'config', preferences:scope+'preferences' };
}
// Migrate browser-local references when a workspace JSON file is renamed on the server.
// The server's durable rename map is also returned to browsers that reconnect later.
