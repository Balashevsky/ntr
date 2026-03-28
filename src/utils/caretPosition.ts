const STYLE_PROPS: string[] = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
  'letterSpacing', 'wordSpacing', 'lineHeight', 'tabSize',
  'textTransform', 'textIndent',
];

export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
  const computed = getComputedStyle(textarea);

  const div = document.createElement('div');
  const s = div.style;

  s.position = 'absolute';
  s.top = '-9999px';
  s.left = '-9999px';
  s.visibility = 'hidden';
  s.whiteSpace = 'pre-wrap';
  s.wordWrap = 'break-word';
  s.overflowWrap = 'break-word';
  s.overflow = 'hidden';
  s.padding = '0';
  s.border = 'none';
  s.boxSizing = 'content-box';

  for (const prop of STYLE_PROPS) {
    (s as any)[prop] = (computed as any)[prop];
  }

  // Match the textarea's text content width (excluding padding and scrollbar)
  const padL = parseFloat(computed.paddingLeft) || 0;
  const padR = parseFloat(computed.paddingRight) || 0;
  s.width = (textarea.clientWidth - padL - padR) + 'px';

  // Build content: text before cursor as a text node, then a marker span
  div.appendChild(document.createTextNode(textarea.value.substring(0, position)));

  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  div.appendChild(marker);

  document.body.appendChild(div);

  const lineHeight = parseFloat(computed.lineHeight) ||
    parseFloat(computed.fontSize) * 1.6;

  const coords = {
    top: marker.offsetTop,
    left: marker.offsetLeft,
    height: lineHeight,
  };

  document.body.removeChild(div);

  return coords;
}
