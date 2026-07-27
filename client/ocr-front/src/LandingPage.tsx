"use client";

import { useEffect, useRef } from "react";

interface LandingPageProps {
  onLogin: () => void;
}

/**
 * The full cinematic marketing page lives as a static asset at /landing.html
 * (vanilla HTML/CSS/JS — scroll-driven phone mockup, halftone parallax, review
 * flow, etc.). It's loaded in an iframe rather than ported into JSX because it
 * relies on heavy DOM/script wiring that isn't worth re-implementing in React,
 * and keeping it static avoids shipping its embedded artwork through the JS bundle.
 *
 * The static page's CTAs ("Get started", "Login / Register", "Start scanning")
 * postMessage('lifewood:login') to the parent window on click instead of
 * navigating anywhere themselves — this component listens for that and calls
 * onLogin().
 *
 * Make sure /public/landing.html (or your framework's equivalent static dir)
 * contains the page — see landing.html alongside this file.
 */
export default function LandingPage({ onLogin }: LandingPageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "lifewood:login") {
        onLogin();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onLogin]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#050f0a" }}>
      <iframe
        ref={iframeRef}
        src="/landing.html"
        title="Lifewood — Every receipt, perfectly exposed."
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
