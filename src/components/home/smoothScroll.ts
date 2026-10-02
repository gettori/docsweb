import Lenis from "lenis";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export const lenis = reduced ? null : new Lenis({ autoRaf: true, allowNestedScroll: true });
