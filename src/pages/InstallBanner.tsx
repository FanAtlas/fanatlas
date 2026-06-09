import { useEffect, useState } from "react";

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (!show || isStandalone) return null;

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();

      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setShow(false);
      }

      setDeferredPrompt(null);
    }
  };

  return (
    <div className="install-banner">
      <div>
        <strong>Install FanAtlas</strong>

        {isIOS ? (
          <p>
            Tap Share → Add to Home Screen
          </p>
        ) : (
          <p>
            Add FanAtlas to your phone for quick World Cup access.
          </p>
        )}
      </div>

      {isIOS ? (
        <button onClick={() => alert("On iPhone: tap Share, then Add to Home Screen.")}>
          How?
        </button>
      ) : (
        <button onClick={installApp}>
          Install
        </button>
      )}

      <span onClick={() => setShow(false)}>
        ×
      </span>
    </div>
  );
}
