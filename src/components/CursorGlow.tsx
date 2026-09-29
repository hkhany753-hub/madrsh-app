import { useEffect, useRef } from 'react';

/**
 * A soft radial glow that follows the cursor on the background.
 * - Uses requestAnimationFrame + lerp for smooth, slightly lagged movement
 * - Reads --color-primary so it adapts to every MADRSH theme
 * - Pointer-events: none so it never blocks UI
 * - Sits at z-0 (above body bg, below content which is z-10+)
 * - Disabled on touch devices
 * - Fades out when the mouse leaves the window
 */
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip on touch / small-screen devices
    if (window.matchMedia('(hover: none)').matches || window.innerWidth < 1024) return;

    const el = glowRef.current;
    if (!el) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let rafId = 0;
    let visible = false;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        el.style.opacity = '1';
      }
    };

    const onLeave = () => {
      visible = false;
      el.style.opacity = '0';
    };

    const onEnter = () => {
      visible = true;
      el.style.opacity = '1';
    };

    const animate = () => {
      // Lerp factor — lower = more lag, smoother
      currentX += (mouseX - currentX) * 0.10;
      currentY += (mouseY - currentY) * 0.10;
      el.style.transform = `translate3d(${currentX - 400}px, ${currentY - 400}px, 0)`;
      rafId = requestAnimationFrame(animate);
    };

    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s ease';
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-0 h-[800px] w-[800px] rounded-full"
      style={{
        background:
          'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, color-mix(in srgb, var(--color-primary) 6%, transparent) 35%, transparent 65%)',
        willChange: 'transform, opacity',
        mixBlendMode: 'screen',
      }}
    />
  );
}
