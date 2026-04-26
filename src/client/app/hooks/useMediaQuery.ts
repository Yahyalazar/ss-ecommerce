import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia(query);
    const updateMatches = () => setMatches(media.matches);

    updateMatches();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateMatches);
      return () => media.removeEventListener("change", updateMatches);
    }

    media.addListener(updateMatches);
    return () => media.removeListener(updateMatches);
  }, [query]);

  return matches;
}
