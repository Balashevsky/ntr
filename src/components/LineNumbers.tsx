import type { Ref } from 'react';

interface LineNumbersProps {
  ref?: Ref<HTMLDivElement>;
  lineHeights: number[];
  scrollTop: number;
  fontSize: number;
}

export function LineNumbers({ ref, lineHeights, fontSize }: LineNumbersProps) {
  return (
    <div className="line-numbers" ref={ref} style={{ fontSize: `${fontSize}px` }}>
      {lineHeights.map((height, i) => (
        <div
          key={i}
          className="line-number"
          style={{ height: `${height}px` }}
        >
          {i + 1}
        </div>
      ))}
      {lineHeights.length === 0 && (
        <div className="line-number">1</div>
      )}
    </div>
  );
}
