const RAW_GITHUB_HOST = "raw.githubusercontent.com";

/**
 * raw.githubusercontent.com 上で `/` 始まりのルート相対パスは
 * ドメインルートに解決されてしまい壊れるため、リポジトリルート
 * (owner/repo/branch/) を補って書き換える。
 */
export function fixGithubRawRootRelativeUrls(root: HTMLElement, pageUrl: string): void {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return;
  }
  if (url.hostname !== RAW_GITHUB_HOST) return;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 3) return;
  const [owner, repo, branch] = segments;
  const repoRoot = `https://${RAW_GITHUB_HOST}/${owner}/${repo}/${branch}/`;

  root.querySelectorAll<HTMLImageElement>('img[src^="/"]').forEach((img) => {
    const path = img.getAttribute("src");
    if (!path) return;
    img.src = repoRoot + path.slice(1);
  });

  root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((a) => {
    const path = a.getAttribute("href");
    if (!path) return;
    a.href = repoRoot + path.slice(1);
  });
}
