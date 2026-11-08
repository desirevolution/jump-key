/** Determine the frontend version once at build time, without runtime GitHub requests. */
export function resolveDisplayVersion({ releaseTag, commitSha, fallbackVersion } = {}) {
  const tag = String(releaseTag ?? '').trim();
  if (tag) return tag.replace(/^v(?=\d)/i, '');

  const sha = String(commitSha ?? '').trim();
  if (sha) return `dev-${sha.slice(0, 8)}`;

  return String(fallbackVersion ?? '').trim() || 'development';
}
