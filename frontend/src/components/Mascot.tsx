/**
 * Mascot.tsx
 *
 * An interactive animated mascot fixed to the bottom-right corner of the page.
 * Features:
 *  - Idle float animation so the mascot feels alive at all times.
 *  - Page-load bounce so the mascot makes a cheerful entrance.
 *  - Wave / excited animation when the cursor moves near it.
 *  - Click opens a small chat bubble with helpful tips and links.
 *  - The bubble auto-closes after 12 s or via the ✕ button.
 *  - Fully keyboard-accessible with ARIA labels.
 *  - Lazy-rendered (only mounts after first paint via useEffect).
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Tips shown in the chat bubble (cycle through them on each open)
// ---------------------------------------------------------------------------
const TIPS: { text: string; link?: string; linkLabel?: string }[] = [
  {
    text: 'Send requests to any AI model through a single unified endpoint.',
    link: 'https://github.com/tushargr0ver/fastrouter#readme',
    linkLabel: 'Read the docs →',
  },
  {
    text: 'Use the API Tester to try out models without leaving the dashboard.',
    link: undefined,
  },
  {
    text: 'Manage your API keys from the Keys page and rotate them at any time.',
    link: undefined,
  },
  {
    text: 'Track your token consumption in real time on the Usage page.',
    link: undefined,
  },
  {
    text: 'Credits can be topped up at any time from the Credits page.',
    link: undefined,
  },
];

// Distance (px) from the mascot centre at which the wave animation triggers.
const WAVE_TRIGGER_DISTANCE = 120;

// How long (ms) the chat bubble stays open before auto-closing.
const BUBBLE_AUTO_CLOSE_MS = 12_000;

// How long (ms) the page-load bounce plays before settling to idle.
const BOUNCE_TO_IDLE_DELAY_MS = 1_000;

// Duration (ms) of the brief excited state during random idle movements.
const IDLE_MOVEMENT_DURATION_MS = 800;

// Range (ms) for the random delay between idle movements.
const MIN_IDLE_DELAY_MS = 6_000;
const MAX_IDLE_DELAY_MS = 12_000;

// ---------------------------------------------------------------------------
// SVG mascot – a tiny terminal-themed robot that matches the dark-cyan palette
// ---------------------------------------------------------------------------
function MascotSVG({ state }: { state: 'idle' | 'wave' | 'bounce' | 'excited' }) {
  /*
   * The robot is built from pure SVG shapes.
   * Arm groups are separate so CSS can rotate them for the wave.
   * The antenna tip pulses via the mascot-antenna-pulse animation.
   */
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 80"
      width="64"
      height="80"
      aria-hidden="true"
      focusable="false"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* ── Antenna ─────────────────────────────────────────── */}
      <line
        x1="32" y1="8"
        x2="32" y2="18"
        stroke="#58a6ff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="32" cy="6" r="3.5"
        fill="#58a6ff"
        className={state === 'excited' || state === 'wave' ? 'mascot-antenna-excited' : 'mascot-antenna-pulse'}
      />

      {/* ── Head ────────────────────────────────────────────── */}
      <rect
        x="14" y="18"
        width="36" height="26"
        rx="5"
        fill="#0d1117"
        stroke="#30363d"
        strokeWidth="1.5"
      />

      {/* Screen / face plate */}
      <rect
        x="18" y="22"
        width="28" height="16"
        rx="3"
        fill="#080c10"
        stroke="#21262d"
        strokeWidth="1"
      />

      {/* Eyes */}
      <circle
        cx="25" cy="30" r="3.5"
        fill={state === 'excited' ? '#3fb950' : '#58a6ff'}
        className="mascot-eye-blink"
      />
      <circle
        cx="39" cy="30" r="3.5"
        fill={state === 'excited' ? '#3fb950' : '#58a6ff'}
        className="mascot-eye-blink"
      />
      {/* Eye shine */}
      <circle cx="26.2" cy="28.8" r="1" fill="rgba(255,255,255,0.55)" />
      <circle cx="40.2" cy="28.8" r="1" fill="rgba(255,255,255,0.55)" />

      {/* Mouth – a small friendly curve */}
      <path
        d="M26 39 Q32 43 38 39"
        fill="none"
        stroke={state === 'excited' ? '#3fb950' : '#58a6ff'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* ── Body ────────────────────────────────────────────── */}
      <rect
        x="17" y="46"
        width="30" height="22"
        rx="4"
        fill="#0d1117"
        stroke="#30363d"
        strokeWidth="1.5"
      />

      {/* Chest panel */}
      <rect
        x="22" y="50"
        width="20" height="12"
        rx="2"
        fill="#080c10"
        stroke="#21262d"
        strokeWidth="1"
      />
      {/* Chest LED dots */}
      <circle cx="27" cy="56" r="2" fill="#3fb950" className="mascot-led" />
      <circle cx="32" cy="56" r="2" fill="#58a6ff" className="mascot-led mascot-led-delay" />
      <circle cx="37" cy="56" r="2" fill="#bc8cff" className="mascot-led mascot-led-delay2" />

      {/* ── Left arm (static) ───────────────────────────────── */}
      <g>
        <rect
          x="7" y="47"
          width="8" height="18"
          rx="3"
          fill="#0d1117"
          stroke="#30363d"
          strokeWidth="1.5"
        />
      </g>

      {/* ── Right arm (waves) ───────────────────────────────── */}
      {/*
       * transformOrigin is set to the top-centre of the arm rect
       * (x=49+8/2=53, y=47+3=50) so it pivots at the shoulder joint.
       * transformBox:'fill-box' makes the origin relative to the element's
       * own bounding box, which is required for SVG elements in most browsers.
       */}
      <g
        style={{
          transformOrigin: '53px 50px',
          transformBox: 'fill-box',
        }}
        className={state === 'wave' || state === 'excited' ? 'mascot-arm-wave' : ''}
      >
        <rect
          x="49" y="47"
          width="8" height="18"
          rx="3"
          fill="#0d1117"
          stroke="#30363d"
          strokeWidth="1.5"
        />
      </g>

      {/* ── Legs ────────────────────────────────────────────── */}
      <rect
        x="19" y="69"
        width="10" height="8"
        rx="3"
        fill="#0d1117"
        stroke="#30363d"
        strokeWidth="1.5"
      />
      <rect
        x="35" y="69"
        width="10" height="8"
        rx="3"
        fill="#0d1117"
        stroke="#30363d"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Close (×) button used inside the chat bubble
// ---------------------------------------------------------------------------
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close tip"
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        lineHeight: 1,
        padding: '2px 4px',
        borderRadius: '3px',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--text-primary)')}
      onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-secondary)')}
    >
      ✕
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------
export function Mascot() {
  // Mount lazily after first paint so we don't block LCP
  const [mounted, setMounted] = useState(false);
  // Animation state for the mascot SVG
  const [animState, setAnimState] = useState<'idle' | 'wave' | 'bounce' | 'excited'>('bounce');
  // Whether the chat bubble is open
  const [bubbleOpen, setBubbleOpen] = useState(false);
  // Which tip to display (cycles through TIPS)
  const [tipIndex, setTipIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazy mount after paint
  useEffect(() => {
    setMounted(true);
  }, []);

  // Page-load bounce → then settle to idle
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setAnimState('idle'), BOUNCE_TO_IDLE_DELAY_MS);
    return () => clearTimeout(t);
  }, [mounted]);

  // Occasional random idle movement
  const scheduleIdleMovement = useCallback(() => {
    const delay = MIN_IDLE_DELAY_MS + Math.random() * (MAX_IDLE_DELAY_MS - MIN_IDLE_DELAY_MS);
    idleTimer.current = setTimeout(() => {
      // Only trigger idle movement if mascot is currently idle
      setAnimState(prev => {
        if (prev === 'idle') {
          // Briefly switch to excited then back
          setTimeout(() => setAnimState('idle'), IDLE_MOVEMENT_DURATION_MS);
          return 'excited';
        }
        return prev;
      });
      scheduleIdleMovement();
    }, delay);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    scheduleIdleMovement();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [mounted, scheduleIdleMovement]);

  // Cursor proximity detection → wave
  useEffect(() => {
    if (!mounted) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

      setAnimState(prev => {
        if (dist < WAVE_TRIGGER_DISTANCE && prev === 'idle') return 'wave';
        if (dist >= WAVE_TRIGGER_DISTANCE && prev === 'wave') return 'idle';
        return prev;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mounted]);

  // Open / close bubble
  const openBubble = useCallback(() => {
    setBubbleOpen(true);
    setAnimState('excited');
    // Rotate through tips on each open
    setTipIndex(i => (i + 1) % TIPS.length);
    // Auto-close
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(() => {
      setBubbleOpen(false);
      setAnimState('idle');
    }, BUBBLE_AUTO_CLOSE_MS);
  }, []);

  const closeBubble = useCallback(() => {
    setBubbleOpen(false);
    setAnimState('idle');
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
  }, []);

  // Keyboard: Enter / Space opens bubble; Escape closes
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        bubbleOpen ? closeBubble() : openBubble();
      }
      if (e.key === 'Escape' && bubbleOpen) {
        closeBubble();
      }
    },
    [bubbleOpen, openBubble, closeBubble],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  if (!mounted) return null;

  const tip = TIPS[tipIndex];

  return (
    /* Fixed container – bottom-right, above scrollbars */
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
      }}
      className="mascot-root"
    >
      {/* ── Chat bubble ────────────────────────────────────── */}
      {bubbleOpen && (
        <div
          role="dialog"
          aria-label="FastRouter mascot tip"
          aria-live="polite"
          className="mascot-bubble"
          style={{
            position: 'relative',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            borderRadius: '10px',
            padding: '14px 36px 14px 14px',
            maxWidth: '240px',
            minWidth: '180px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(88,166,255,0.08)',
            /* Bubble tail pointing down-right */
          }}
        >
          <CloseButton onClick={closeBubble} />

          {/* Mascot label */}
          <p
            style={{
              margin: '0 0 6px 0',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: 'var(--accent-cyan)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            ROUTER-BOT
          </p>

          {/* Tip text */}
          <p
            style={{
              margin: tip.link ? '0 0 10px 0' : '0',
              fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
              fontSize: '13px',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          >
            {tip.text}
          </p>

          {/* Optional doc link */}
          {tip.link && (
            <a
              href={tip.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: 'var(--accent-cyan)',
                textDecoration: 'none',
                borderBottom: '1px dashed var(--accent-cyan)',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '0.7')}
              onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '1')}
            >
              {tip.linkLabel}
            </a>
          )}

          {/* Bubble tail (CSS triangle pointing down-right) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '-8px',
              right: '24px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid var(--border-bright)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '-7px',
              right: '25px',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid var(--bg-elevated)',
            }}
          />
        </div>
      )}

      {/* ── Mascot button ──────────────────────────────────── */}
      <button
        onClick={bubbleOpen ? closeBubble : openBubble}
        onKeyDown={handleKeyDown}
        aria-label={bubbleOpen ? 'Close ROUTER-BOT tip' : 'Open ROUTER-BOT tip'}
        aria-expanded={bubbleOpen}
        aria-haspopup="dialog"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          /* Apply the current animation class via the wrapper */
          display: 'block',
          outline: 'none',
        }}
        className={`mascot-button mascot-anim-${animState}`}
      >
        {/* Focus ring */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '8px',
            pointerEvents: 'none',
          }}
          className="mascot-focus-ring"
        />
        <MascotSVG state={animState} />
      </button>
    </div>
  );
}
