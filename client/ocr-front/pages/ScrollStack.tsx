import { useRef } from 'react';

export const ScrollStackItem = ({ children }: any) => (
  <div className="scroll-stack-card">{children}</div>
);

export const ScrollStack = ({ children }: any) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="scroll-stack-scroller" ref={scrollerRef} style={{ scrollBehavior: 'smooth' }}>
      <div className="scroll-stack-inner">
        {children}
      </div>
    </div>
  );
};
