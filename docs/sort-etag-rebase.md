# Sort save: stale ETags and safe rebasing

A `PUT /config/services.json?workspace=<id>` requires `If-Match` for the exact
file revision (the Go server hashes the bytes on disk). Management can become
stale if another editor or browser tab saves the same workspace after the
management view was loaded.

For **drag-and-drop order saves only**, the management UI now:

1. Fetches the latest JSON and ETag with `cache: no-store`.
2. Applies only the requested category/service ordering to this latest JSON.
   It keeps updated URLs, names, options, and other unrelated changes from the
   server. It never submits an old full configuration snapshot wholesale.
3. Rejects a stale draft (HTTP-412-like conflict) if another writer has
   reordered the same list, changed its membership, or renamed a category.
4. Writes once using `If-Match: <fresh ETag>`; a further concurrent write
   during steps 1–4 is still correctly rejected by the server as HTTP 412.
5. Keeps the user's draft on failure. Only a successful write updates the
   manager baseline and the dashboard/offline cache.

The **Serverstand neu laden** action also fetches the selected workspace
configuration again (previously it only refreshed the workspace manifest).
The selected category is preserved by name where possible.

This deliberately does **not** weaken the ETag safety checks for editing,
deleting, or renaming. Workspace-order sorting has its own metadata ETag and
remains a separate transaction.

## Manual verification

1. Change only the service order in Management and save; no 412 should occur.
2. Open two tabs; load Management in A, change a service URL in B, then sort in
   A. The URL update must survive and the new order must be saved.
3. Open two tabs; reorder the same list differently in B and then save the
   draft in A. A must report a conflict and preserve its draft.
4. After a conflict, choose to discard the draft and reload the server state;
   the latest configuration and its ETag must actually be loaded.
5. Reorder Workspaces, Categories, and Services in turn; no list may overwrite
   another workspace's data.

The pure sort-rebase logic is tested with `node --test tests/sort-save.test.js`.
A full browser test with the actual Go backend and proxy remains recommended.
