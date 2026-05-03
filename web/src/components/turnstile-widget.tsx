"use client";

import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function ensureTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Turnstile 脚本加载失败。")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile 脚本加载失败。"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  {
    siteKey?: string;
    onTokenChange: (token: string) => void;
  }
>(function TurnstileWidget({ siteKey, onTokenChange }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const handleTokenChange = useEffectEvent(onTokenChange);

  useImperativeHandle(ref, () => ({
    reset() {
      if (!window.turnstile || !widgetIdRef.current) {
        handleTokenChange("");
        return;
      }

      window.turnstile.reset(widgetIdRef.current);
      handleTokenChange("");
    },
  }));

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let disposed = false;

    const mountWidget = async () => {
      try {
        setLoadError(null);
        await ensureTurnstileScript();

        if (disposed || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => handleTokenChange(token),
          "expired-callback": () => handleTokenChange(""),
          "timeout-callback": () => handleTokenChange(""),
          "error-callback": () => {
            handleTokenChange("");
            setLoadError("人机验证加载失败，请稍后重试。");
          },
        });
      } catch (error) {
        if (!disposed) {
          handleTokenChange("");
          setLoadError(
            error instanceof Error ? error.message : "人机验证加载失败，请稍后重试。",
          );
        }
      }
    };

    void mountWidget();

    return () => {
      disposed = true;

      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return (
      <div className="rounded-[16px] border border-dashed border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--muted)]">
        当前环境还没有配置 Turnstile 站点 Key，部署前请先补齐公开配置。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-[16px] border border-[color:var(--line)] bg-[color:var(--surface-solid)] p-2"
      />
      {loadError ? <p className="text-sm text-[#b24f2f]">{loadError}</p> : null}
    </div>
  );
});
