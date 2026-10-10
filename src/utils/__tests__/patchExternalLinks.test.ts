/**
 * @jest-environment jsdom
 */
import type {IDiscordSDK} from '../../interface';
import {patchExternalLinks} from '../patchExternalLinks';

function mockSdk() {
  return {
    commands: {openExternalLink: jest.fn(async () => ({opened: true}))},
  } as unknown as IDiscordSDK;
}

function clickAnchor({target, href}: {target?: string | null; href?: string | null}) {
  const anchor = document.createElement('a');
  if (target != null) anchor.setAttribute('target', target);
  if (href != null) anchor.setAttribute('href', href);
  anchor.textContent = 'link';
  document.body.appendChild(anchor);
  const event = new MouseEvent('click', {bubbles: true, cancelable: true});
  anchor.dispatchEvent(event);
  const prevented = event.defaultPrevented;
  anchor.remove();
  return prevented;
}

describe('patchExternalLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('routes target=_blank https links through openExternalLink', async () => {
    const sdk = mockSdk();
    const unpatch = patchExternalLinks(sdk);
    const prevented = clickAnchor({target: '_blank', href: 'https://discord.com/'});
    expect(prevented).toBe(true);
    await Promise.resolve();
    expect(sdk.commands.openExternalLink).toHaveBeenCalledWith({url: 'https://discord.com/'});
    unpatch();
  });

  it('ignores non-_blank targets and invalid hrefs', async () => {
    const sdk = mockSdk();
    const unpatch = patchExternalLinks(sdk);
    expect(clickAnchor({target: '_self', href: 'https://discord.com/'})).toBe(false);
    expect(clickAnchor({target: '_blank', href: ''})).toBe(false);
    expect(clickAnchor({target: '_blank', href: '#frag'})).toBe(false);
    expect(clickAnchor({target: '_blank', href: 'javascript:alert(1)'})).toBe(false);
    await Promise.resolve();
    expect(sdk.commands.openExternalLink).not.toHaveBeenCalled();
    unpatch();
  });

  it('unpatch removes the listener', () => {
    const sdk = mockSdk();
    const unpatch = patchExternalLinks(sdk);
    unpatch();
    const prevented = clickAnchor({target: '_blank', href: 'https://discord.com/'});
    expect(prevented).toBe(false);
    expect(sdk.commands.openExternalLink).not.toHaveBeenCalled();
  });
});
