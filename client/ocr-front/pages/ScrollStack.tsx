import { useLayoutEffect, useRef } from 'react';
import Lenis from 'lenis';


export const ScrollStackItem = ({ children }: any) => (
  <div className="scroll-stack-card">{children}</div>
);

export const ScrollStack = ({ children }: any) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!scrollerRef.current) return;

    const lenis = new Lenis({
      wrapper: scrollerRef.current,
      content: scrollerRef.current.querySelector('.scroll-stack-inner') as HTMLElement,
      duration: 1.2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="scroll-stack-scroller" ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
      </div>
    </div>
  );
};