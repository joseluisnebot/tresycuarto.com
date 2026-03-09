"use client";

import { useEffect, useRef } from "react";

export const TURNSTILE_SITE_KEY = "0x4AAAAAACnvLtZ2C0VqNYjG";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: object) => string;
      reset: (id: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef("");
  const widgetIdRef = useRef("");

  useEffect(() => {
    function renderWidget() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: "invisible",
        callback: (token: string) => { tokenRef.current = token; },
        "expired-callback": () => { tokenRef.current = ""; },
      });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (!document.getElementById("cf-turnstile-script")) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
      script.async = true;
      document.head.appendChild(script);
    } else {
      // Script already added by another instance, poll until ready
      const iv = setInterval(() => {
        if (window.turnstile) { clearInterval(iv); renderWidget(); }
      }, 100);
      return () => clearInterval(iv);
    }
  }, []);

  async function getToken(): Promise<string> {
    if (tokenRef.current) return tokenRef.current;
    return new Promise(resolve => {
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (tokenRef.current || tries > 60) { clearInterval(iv); resolve(tokenRef.current); }
      }, 100);
    });
  }

  return { containerRef, getToken };
}
