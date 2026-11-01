"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AppVersion = "current" | "oss";

type AppVersionContextValue = {
  version: AppVersion;
  setVersion: (version: AppVersion) => void;
};

const DEFAULT_VERSION: AppVersion = "current";
const STORAGE_KEY = "th_lifeengine_app_version";

const AppVersionContext = createContext<AppVersionContextValue>({
  version: DEFAULT_VERSION,
  setVersion: () => {},
});

export function AppVersionProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState<AppVersion>(DEFAULT_VERSION);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "current" || stored === "oss") setVersion(stored);
    } catch {
      // Storage blocked (private mode): stay on the default.
    }
  }, []);

  // Every reader takes the value from this context, so no reload is needed.
  const handleVersionChange = (nextVersion: AppVersion) => {
    setVersion(nextVersion);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextVersion);
    } catch {
      // Not persisted, but still applies for this visit.
    }
  };

  const value = useMemo(
    () => ({
      version,
      setVersion: handleVersionChange,
    }),
    [version]
  );

  return (
    <AppVersionContext.Provider value={value}>
      <div data-app-version={version}>{children}</div>
    </AppVersionContext.Provider>
  );
}

export function useAppVersion() {
  return useContext(AppVersionContext);
}
