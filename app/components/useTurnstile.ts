"use client";

import { useCallback, useEffect, useRef } from "react";

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

// El widget se montaba SOLO si su contenedor ya existía en el primer render del
// componente. En el alta de propietario el <div> vive dentro del paso "cuenta",
// que aparece después de elegir el local; y en la página de ciudad, dentro de un
// bloque que espera a que carguen los datos. En ambos casos el contenedor no
// existía al montar, el widget no se creaba nunca, getToken() devolvía "" y el
// backend respondía 403 "Verificación fallida, inténtalo de nuevo".
// Por eso NADIE pudo completar un registro salvo los claims (donde el backend se
// salta la verificación).
//
// Solución: `containerRef` es una ref de callback, así que React la invoca en el
// momento exacto en que el <div> entra en el DOM. Se intenta renderizar tanto al
// cargar el script como al aparecer el contenedor, en cualquier orden.
export function useTurnstile() {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef("");
  const tokenRef = useRef("");

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !nodeRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(nodeRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      size: "invisible",
      callback: (token: string) => { tokenRef.current = token; },
      "expired-callback": () => { tokenRef.current = ""; },
      "error-callback": () => { tokenRef.current = ""; },
    });
  }, []);

  // Ref de callback: React la llama con el nodo cuando se monta (y con null al
  // desmontarse). Ese es el momento en que sí podemos renderizar.
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
    if (node) renderWidget();
  }, [renderWidget]);

  useEffect(() => {
    if (window.turnstile) { renderWidget(); return; }

    if (!document.getElementById("cf-turnstile-script")) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
      script.async = true;
      document.head.appendChild(script);
    } else {
      // Otro componente ya insertó el script: esperar a que esté listo.
      const iv = setInterval(() => {
        if (window.turnstile) { clearInterval(iv); renderWidget(); }
      }, 100);
      return () => clearInterval(iv);
    }
  }, [renderWidget]);

  // Espera máxima 2,5 s. Si Turnstile falla se devuelve "" y el backend decidirá;
  // lo que no puede pasar es dejar el botón bloqueado indefinidamente.
  async function getToken(): Promise<string> {
    if (tokenRef.current) return tokenRef.current;
    return new Promise(resolve => {
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (tokenRef.current || tries > 25) { clearInterval(iv); resolve(tokenRef.current); }
      }, 100);
    });
  }

  return { containerRef, getToken };
}
