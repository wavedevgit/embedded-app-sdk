import type {IDiscordSDK} from '../interface';

/**
 * Monkey-patches anchor clicks so `<a target="_blank" href="...">`
 * opens via the SDK's `openExternalLink` command instead of the
 * (sandboxed) iframe default.
 *
 * Uses document-level capture, so it covers current + future anchors
 * without touching each `a.onclick`. Returns an unpatch function.
 */
export function patchExternalLinks(sdk: IDiscordSDK): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    const anchor = (event.target as Element | null)?.closest?.('a') as HTMLAnchorElement | null;
    if (anchor == null || anchor.getAttribute('target')?.toLowerCase() !== '_blank') return;
    const href = anchor.getAttribute('href')?.trim();
    if (href == null || href === '' || href.startsWith('#')) return;
    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    event.preventDefault();
    event.stopPropagation();
    sdk.commands.openExternalLink({url: url.toString()}).catch(() => {
      window.open(url.toString(), '_blank', 'noopener');
    });
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
