import { useEffect, useRef, useState, type CSSProperties } from "react";
import { assetUrl } from "./assets";

export function Tilapia({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 210"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M100 79 106 53l10 10 6-23 13 17 11-22 12 24 14-17 8 28 15-9 1 23"
        fill="#a7c2ac"
        stroke="#507966"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m111 135 8 28 12-10 15 22 12-22 17 9 4-26"
        fill="#c5cbbb"
        stroke="#507966"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M206 105c18-7 33-21 47-25l-3 54c-18-2-27-12-43-14"
        fill="#b5c9b3"
        stroke="#507966"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M211 108 246 88m-34 23 33-10m-32 14 33 1m-35 4 34 11"
        stroke="#6c9076"
        strokeWidth="1.2"
      />
      <path
        d="M44 104c24-27 44-38 76-38 38 0 65 14 95 45-28 32-61 44-95 41-31-2-55-15-76-33l-9-5 9-5Z"
        fill="#d5debb"
        stroke="#426f5f"
        strokeWidth="1.8"
      />
      <path
        d="M76 78c20-12 43-17 68-10 20 5 41 19 62 36-46-17-92-20-130-9Z"
        fill="#a6bea5"
      />
      <path d="M85 126c32 10 67 12 101-1-28 24-69 30-101 1Z" fill="#eee7c6" />
      <path
        d="M114 69c-7 26-7 54 3 81m21-80c-7 24-5 51 2 79m20-71c-5 23-1 46 4 61m16-50c-1 13 2 28 4 41"
        stroke="#739984"
        strokeWidth="8"
        opacity=".55"
      />
      <path
        d="M102 83c6 9 7 33-1 45M93 88c4 10 3 23-3 33"
        stroke="#426f5f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M101 109c14-2 26 0 37 7-10 6-24 9-34 7"
        fill="#c5cbbb"
        stroke="#507966"
        strokeWidth="1.3"
      />
      <path d="m107 113 20 4m-18 3 17-2" stroke="#7f9c82" />
      <circle
        cx="66"
        cy="99"
        r="5.5"
        fill="#f3edd8"
        stroke="#507966"
        strokeWidth="1.2"
      />
      <circle cx="65" cy="99" r="2.5" fill="#234c40" />
      <circle cx="64" cy="98" r=".8" fill="white" />
      <path
        d="m45 110 11 1"
        stroke="#426f5f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m118 67-7-9m17 8-3-14m15 14 3-19m12 22 1-19m10 24 8-20m2 25 13-10"
        stroke="#72977e"
        strokeWidth="1.2"
      />
      <path
        d="m193 105 2 3m-39-8 2 3m-32-13 2 3m25 20 2 3m-33 15 2 3m50-13 2 3"
        stroke="#547c69"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Pond() {
  const pond = useRef<HTMLDivElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        pond.current?.style.setProperty(
          "--px",
          `${(event.clientX / window.innerWidth - 0.5) * -14}px`,
        );
        pond.current?.style.setProperty(
          "--py",
          `${(event.clientY / window.innerHeight - 0.5) * -10}px`,
        );
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="pond" ref={pond} aria-hidden="true">
      <div className="pond-ripple ripple-1" />
      <div className="pond-ripple ripple-2" />
      <div className="pond-ripple ripple-3" />
      <div className="pond-fish-layer">
        <img
          className="pond-companion companion-one"
          src={assetUrl("art/tilapia-blue.webp")}
          alt=""
        />
        <img
          className="pond-companion companion-two"
          src={assetUrl("art/tilapia-rose.webp")}
          alt=""
        />
        {imageFailed ? (
          <Tilapia className="hero-tilapia" />
        ) : (
          <img
            className="hero-tilapia hero-tilapia-image"
            src={assetUrl("art/tilapia.webp")}
            alt=""
            width="768"
            height="512"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <span className="bubble bubble-1" />
      <span className="bubble bubble-2" />
      <span className="bubble bubble-3" />
      <svg className="pond-reeds" viewBox="0 0 90 90" fill="none">
        <path
          d="M48 88C30 57 31 30 18 14M48 88c-1-33 10-53 5-78M48 88c12-28 24-39 25-64M48 88C24 72 17 55 12 45"
          stroke="#7c9c84"
          strokeWidth="2"
        />
        <path
          d="M27 38C8 29 8 15 9 8c13 8 20 18 18 30ZM54 40c14-14 16-26 13-34-11 10-13 21-13 34ZM65 56c17-3 22-11 23-20-13 2-22 7-23 20Z"
          fill="#b1c4a4"
        />
      </svg>
      <span className="pond-caption">OREOCHROMIS · CURIOUS BY NATURE</span>
    </div>
  );
}

export function Aquarium({ miniature = false }: { miniature?: boolean }) {
  const [ripple, setRipple] = useState(0);
  const fish = miniature
    ? [
        [7, 26, 86, -1],
        [50, 5, 65, 1],
        [43, 61, 83, -1],
        [8, 78, 40, 1],
      ]
    : [
        [31, 16, 96, 1],
        [44, 47, 148, -1],
        [58, 10, 100, -1],
        [73, 42, 165, -1],
        [88, 9, 68, 1],
        [94, 68, 100, -1],
        [59, 80, 78, 1],
        [34, 87, 62, -1],
        [83, 93, 92, 1],
        [68, 0, 55, -1],
        [42, 0, 43, -1],
        [21, 74, 58, 1],
      ];
  return (
    <section
      className={`aquarium ${miniature ? "mini-aquarium" : "pond-break"}`}
      aria-label={
        miniature
          ? "A small shoal of tilapias"
          : "A quiet moment at the thinking pond"
      }
    >
      <div className="water-caustics" aria-hidden="true" />
      <div className="aquarium-fish" aria-hidden="true">
        {fish.map(([left, top, size, direction], i) => (
          <div
            key={i}
            className="shoal-fish"
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                "--delay": `${-i * 1.7}s`,
                "--duration": `${8 + (i % 4) * 2}s`,
                "--direction": direction,
              } as CSSProperties
            }
          >
            <img
              src={assetUrl(
                [
                  "art/tilapia.webp",
                  "art/tilapia-blue.webp",
                  "art/tilapia-rose.webp",
                  "art/tilapia-gold.webp",
                ][i % 4],
              )}
              alt=""
              width="900"
              height="600"
              loading="lazy"
            />
          </div>
        ))}
        {Array.from({ length: miniature ? 4 : 13 }, (_, i) => (
          <span
            className="aquarium-bubble"
            key={i}
            style={
              {
                left: `${10 + ((i * 17) % 89)}%`,
                top: `${(i * 23) % 80}%`,
                "--delay": `${-i * 1.3}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {miniature ? (
        <span className="aquarium-caption">THE THINKING POND</span>
      ) : (
        <>
          <div className="pond-break-copy">
            <span className="eyebrow">A MOMENT IN THE SHALLOWS</span>
            <h2>Let that sink in.</h2>
            <p>Good ideas need a little room to swim.</p>
            <button onClick={() => setRipple((r) => r + 1)}>
              ◌ Make a ripple
            </button>
          </div>
          <div className="ripple-origin" aria-hidden="true">
            {ripple > 0 && <div key={ripple} className="user-ripple" />}
          </div>
          <span className="pond-species-note">
            A SHOAL OF POSSIBILITIES · ALL FINITE, OF COURSE
          </span>
        </>
      )}
    </section>
  );
}
