import { useEffect, useState } from "react";
import { readConnectivityStatus, type ConnectivityStatus } from "../lib/connectivity";

export function useConnectivity() {
  const [status, setStatus] = useState<ConnectivityStatus>(() => readConnectivityStatus());

  useEffect(() => {
    function updateStatus() {
      setStatus(readConnectivityStatus());
    }

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    updateStatus();

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return {
    status,
    isOnline: status === "online",
    isOffline: status === "offline",
    isUnknown: status === "unknown"
  };
}

