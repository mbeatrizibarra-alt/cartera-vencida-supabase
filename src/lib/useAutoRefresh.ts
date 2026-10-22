import { useEffect, useRef } from "react";

/**
 * Ejecuta `callback` al montar, cada `intervalMs` mientras la pestaña está visible, y cada vez
 * que el usuario vuelve a la pestaña/ventana. Así un tablero abierto se pone al día solo
 * cuando alguien más registra pagos, sin tener que recargar la página.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 60000) {
  const saved = useRef(callback);
  const lastRun = useRef(0);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    const run = (force = false) => {
      const now = Date.now();
      // Evita doble consulta cuando "focus" y "visibilitychange" se disparan juntos.
      if (!force && now - lastRun.current < 5000) return;
      lastRun.current = now;
      saved.current();
    };
    const onReturn = () => {
      if (document.visibilityState === "visible") run();
    };

    run(true);
    const id = window.setInterval(onReturn, intervalMs);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [intervalMs]);
}
