import { useRef, useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { LineNumbers } from './LineNumbers';
import { getCaretCoordinates } from '../utils/caretPosition';

export function Editor() {
  const activeTabId = useAppStore((s) => s.activeTabId);
  const tab = useAppStore((s) => (s.activeTabId ? s.tabs[s.activeTabId] : null));
  const updateTabContent = useAppStore((s) => s.updateTabContent);
  const updateTabScroll = useAppStore((s) => s.updateTabScroll);
  const updateTabCursor = useAppStore((s) => s.updateTabCursor);
  const editorZoom = useAppStore((s) => s.editorZoom);
  const setEditorZoom = useAppStore((s) => s.setEditorZoom);
  const caretWidth = useAppStore((s) => s.caretWidth);
  const caretHeightPercent = useAppStore((s) => s.caretHeightPercent);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [lineHeights, setLineHeights] = useState<number[]>([]);
  const [scrollTop, setScrollTop] = useState(0);

  const useCustomCaret = caretWidth > 1 || caretHeightPercent !== 100;

  // Measure wrapped line heights using a mirror div
  const measureLineHeights = useCallback(() => {
    const mirror = mirrorRef.current;
    const textarea = textareaRef.current;
    if (!mirror || !textarea) return;

    // Match mirror width to textarea width
    const textareaWidth = textarea.clientWidth;
    mirror.style.width = `${textareaWidth}px`;
    mirror.style.fontSize = `${editorZoom}px`;

    const content = textarea.value || '';
    const lines = content.split('\n');
    const heights: number[] = [];

    // Clear mirror
    mirror.innerHTML = '';

    for (const line of lines) {
      const lineDiv = document.createElement('div');
      lineDiv.style.whiteSpace = 'pre-wrap';
      lineDiv.style.wordWrap = 'break-word';
      lineDiv.style.overflowWrap = 'break-word';
      // Use a zero-width space for empty lines so they have height
      lineDiv.textContent = line || '\u200B';
      mirror.appendChild(lineDiv);
      heights.push(lineDiv.offsetHeight);
      mirror.removeChild(lineDiv);
    }

    setLineHeights(heights);
  }, [editorZoom]);

  // Update custom caret position
  const updateCaret = useCallback(() => {
    const textarea = textareaRef.current;
    const caret = caretRef.current;
    if (!textarea || !caret || !useCustomCaret) return;

    // Hide caret if there's a selection range
    if (textarea.selectionStart !== textarea.selectionEnd) {
      caret.style.display = 'none';
      return;
    }

    // Hide if textarea doesn't have focus
    if (document.activeElement !== textarea) {
      caret.style.display = 'none';
      return;
    }

    const coords = getCaretCoordinates(textarea, textarea.selectionStart);
    const computed = getComputedStyle(textarea);
    const padTop = parseFloat(computed.paddingTop) || 0;
    const padLeft = parseFloat(computed.paddingLeft) || 0;

    const height = coords.height * caretHeightPercent / 100;
    const verticalOffset = (coords.height - height) / 2;
    const displayTop = padTop + coords.top - textarea.scrollTop + verticalOffset;
    const displayLeft = padLeft + coords.left;

    // Clip to textarea visible area
    if (displayTop + height < 0 || displayTop > textarea.clientHeight) {
      caret.style.display = 'none';
      return;
    }

    caret.style.display = '';
    caret.style.top = (textarea.offsetTop + displayTop) + 'px';
    caret.style.left = (textarea.offsetLeft + displayLeft) + 'px';
    caret.style.height = height + 'px';
    caret.style.width = caretWidth + 'px';

    // Reset blink: show solid, then start blinking after delay
    caret.classList.remove('caret-blink');
    caret.style.opacity = '1';
    clearTimeout(blinkTimerRef.current);
    blinkTimerRef.current = setTimeout(() => {
      if (caretRef.current) {
        caretRef.current.style.opacity = '';
        caretRef.current.classList.add('caret-blink');
      }
    }, 530);
  }, [useCustomCaret, caretWidth, caretHeightPercent]);

  // Restore scroll and cursor position when switching tabs
  useEffect(() => {
    if (tab && textareaRef.current) {
      textareaRef.current.value = tab.content;
      textareaRef.current.scrollTop = tab.scrollTop;
      textareaRef.current.setSelectionRange(tab.cursorPosition, tab.cursorPosition);
      setScrollTop(tab.scrollTop);
      textareaRef.current.focus();
      // Measure after a frame so the textarea has its proper width
      requestAnimationFrame(() => {
        measureLineHeights();
        updateCaret();
      });
    }
  }, [activeTabId]);

  // Re-measure on zoom change
  useEffect(() => {
    requestAnimationFrame(() => {
      measureLineHeights();
      updateCaret();
    });
  }, [editorZoom, measureLineHeights, updateCaret]);

  // Re-measure on window resize
  useEffect(() => {
    const handleResize = () => requestAnimationFrame(() => {
      measureLineHeights();
      updateCaret();
    });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureLineHeights, updateCaret]);

  // Update caret when settings change
  useEffect(() => {
    requestAnimationFrame(updateCaret);
  }, [caretWidth, caretHeightPercent, updateCaret]);

  // Handle focus/blur for custom caret visibility
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !useCustomCaret) return;

    const handleFocus = () => requestAnimationFrame(updateCaret);
    const handleBlur = () => {
      if (caretRef.current) {
        caretRef.current.style.display = 'none';
      }
    };

    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('blur', handleBlur);
    return () => {
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('blur', handleBlur);
    };
  }, [useCustomCaret, updateCaret]);

  // Cleanup blink timer
  useEffect(() => {
    return () => clearTimeout(blinkTimerRef.current);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!activeTabId) return;
      const content = e.target.value;
      updateTabContent(activeTabId, content);
      requestAnimationFrame(() => {
        measureLineHeights();
        updateCaret();
      });
    },
    [activeTabId, updateTabContent, measureLineHeights, updateCaret]
  );

  const handleScroll = useCallback(() => {
    if (!textareaRef.current) return;
    const newScrollTop = textareaRef.current.scrollTop;
    setScrollTop(newScrollTop);
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = newScrollTop;
    }
    if (activeTabId) {
      updateTabScroll(activeTabId, newScrollTop);
    }
    requestAnimationFrame(updateCaret);
  }, [activeTabId, updateTabScroll, updateCaret]);

  const handleSelect = useCallback(() => {
    if (!textareaRef.current || !activeTabId) return;
    updateTabCursor(activeTabId, textareaRef.current.selectionStart);
    requestAnimationFrame(updateCaret);
  }, [activeTabId, updateTabCursor, updateCaret]);

  // Ctrl+Scroll zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        setEditorZoom(editorZoom + delta);
      }
    },
    [editorZoom, setEditorZoom]
  );

  if (!tab) {
    return (
      <div className="editor-empty">
        <p>Press <strong>+</strong> to create a new note,</p>
        <p>or open a file from the <strong>File</strong> menu.</p>
      </div>
    );
  }

  const zoomStyle = { fontSize: `${editorZoom}px` };

  return (
    <div className="editor" onWheel={handleWheel}>
      <LineNumbers
        ref={lineNumbersRef}
        lineHeights={lineHeights}
        scrollTop={scrollTop}
        fontSize={editorZoom}
      />
      <textarea
        ref={textareaRef}
        className={`editor-textarea ${useCustomCaret ? 'editor-textarea-custom-caret' : ''}`}
        style={zoomStyle}
        defaultValue={tab.content}
        onChange={handleChange}
        onScroll={handleScroll}
        onSelect={handleSelect}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {useCustomCaret && (
        <div
          ref={caretRef}
          className="custom-caret caret-blink"
        />
      )}
      <div
        ref={mirrorRef}
        className="editor-mirror"
        style={zoomStyle}
        aria-hidden="true"
      />
    </div>
  );
}
