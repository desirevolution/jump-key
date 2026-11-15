# Create actions and stale ETags

New categories and services are **single operations**, not replacements of an
editor's entire previously loaded workspace JSON. The creation path now fetches
the latest workspace config and its strong ETag immediately before writing.
It applies only the intended creation to the fresh config and then sends one
conditional `PUT` with `If-Match`. No `If-Match: *`, force write, or blind retry
is used.

- New service: resolve the selected category by its **name** in the latest
  configuration rather than relying on its potentially outdated index.
  Preserve other categories, services, and concurrently edited fields.
- New category: apply the same `addCategory` validation to the current config,
  preserving unrelated changes and rejecting duplicate names or shortcuts.
- Existing category metadata edits: find the original category on the latest
  config, keep unrelated service changes, and refuse overwriting concurrently
  changed category name/shortcut/icon settings.
- The general JSON editor and other full-document writes still use the ETag
  that was loaded with their draft. They are not automatically rebased.
- A write between the fresh `GET` and the conditional `PUT` still produces
  HTTP 412 and preserves the user's draft. Reload/reconciliation is required.

## Verification

1. Load Workspace A in two browser tabs. In tab 1, edit a Service URL and save.
   Without reloading tab 2, create a new category. Verify both changes persist.
2. While a service-create editor is open, reorder categories in another tab.
   Create the service in its original target category and verify the target
   remains correct.
3. Try to create the same category or URL twice; verify validation prevents
   duplicates without overwriting changes.
4. Test a genuine concurrent overwrite: save another change between the
   creation request's GET and PUT. The server must return 412.
5. Create services/categories directly from the Dashboard and from Settings.
   Confirm sorting, favorites, and existing shortcuts still behave correctly.

JavaScript regression tests live in `tests/create-etag-rebase.test.js`.
