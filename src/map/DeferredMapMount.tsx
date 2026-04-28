import React from "react";

export function DeferredMapMount({ children }: { children: React.ReactNode }) {
  const placeholderRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = React.useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 620px)").matches;
  });

  React.useEffect(() => {
    if (shouldRender) return;
    const placeholder = placeholderRef.current;
    if (!placeholder) return;
    const mobileQuery = window.matchMedia("(max-width: 620px)");
    if (!mobileQuery.matches) {
      setShouldRender(true);
      return;
    }

    const rect = placeholder.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 220) {
      setShouldRender(true);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
        }
      },
      { rootMargin: "220px 0px" }
    );
    observer.observe(placeholder);

    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setShouldRender(true);
    };
    mobileQuery.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      mobileQuery.removeEventListener("change", handleMediaChange);
    };
  }, [shouldRender]);

  if (shouldRender) return <>{children}</>;

  return <div ref={placeholderRef} className="route-map route-map-deferred" aria-label="Map" />;
}
