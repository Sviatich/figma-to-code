"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ZodError } from "zod";
import { SiteLinks } from "@/components/site/site-links";
import {
  loadFigmaRequestSchema,
  loadFigmaResponseSchema,
  transformProjectRequestSchema,
  type FigmaSourceDto,
} from "@/lib/projects/schema";
import styles from "./import-shell.module.css";

type FrameOption = {
  id: string;
  name: string;
  type: string;
  depth: number;
  hasAutoLayout: boolean;
};

type LoadResult = {
  fileKey: string;
  fileName: string;
  mode: "live";
  suggestedNodeId?: string;
  frames: FrameOption[];
};

type AuthSession = {
  connected: boolean;
  expiresAt: number | null;
  userId: string | null;
};

type ImportShellProps = {
  figmaState?: string;
  figmaReason?: string;
};

type PersistedImportState = {
  figmaUrl: string;
  loadResult: LoadResult | null;
};

const STORAGE_KEY = "transfig:last-import";

export function ImportShell({ figmaState, figmaReason }: ImportShellProps) {
  const router = useRouter();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  const sessionQuery = useQuery<AuthSession>({
    queryKey: ["figma-session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/figma/session", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось проверить OAuth-сессию Figma.");
      }

      return json as AuthSession;
    },
  });

  useEffect(() => {
    try {
      const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

      if (navigationEntry?.type === "reload") {
        sessionStorage.removeItem(STORAGE_KEY);
        setStorageReady(true);
        return;
      }

      const raw = sessionStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as PersistedImportState;
        setFigmaUrl(parsed.figmaUrl ?? "");
        setLoadResult(parsed.loadResult ?? null);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (figmaState === "connected") {
      setError("");
      sessionQuery.refetch();
    }

    if (figmaState === "error") {
      setError(
        figmaReason
          ? `Не удалось завершить подключение Figma: ${figmaReason}`
          : "Не удалось завершить подключение Figma.",
      );
    }
  }, [figmaReason, figmaState, sessionQuery]);

  useEffect(() => {
    if (sessionQuery.data && !sessionQuery.data.connected) {
      setLoadResult(null);
      setProgress(0);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [sessionQuery.data]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    const payload: PersistedImportState = {
      figmaUrl,
      loadResult,
    };

    if (figmaUrl.trim() || loadResult) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  }, [figmaUrl, loadResult, storageReady]);

  async function handleLoad() {
    try {
      setError("");
      setLoadResult(null);
      setActiveFrameId(null);
      setIsLoadingFrames(true);
      setProgress(24);

      const source = buildSourcePayload();
      const payload = loadFigmaRequestSchema.parse({ source });
      const response = await fetch("/api/figma/load", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setProgress(72);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось загрузить файл Figma.");
      }

      const parsed = loadFigmaResponseSchema.parse(json);
      setLoadResult(parsed);
      setProgress(0);
    } catch (caughtError) {
      setLoadResult(null);
      setProgress(0);
      setError(formatError(caughtError));
    } finally {
      setIsLoadingFrames(false);
    }
  }

  async function handleFrameSelect(frameId: string) {
    try {
      setError("");
      setActiveFrameId(frameId);
      setProgress(74);

      const source = buildSourcePayload();
      const payload = transformProjectRequestSchema.parse({
        selectedNodeId: frameId,
        source,
      });

      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setProgress(92);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось завершить трансформацию.");
      }

      setProgress(100);
      router.push(`/projects/${json.id}`);
    } catch (caughtError) {
      setProgress(0);
      setError(formatError(caughtError));
      setActiveFrameId(null);
    }
  }

  function buildSourcePayload(): FigmaSourceDto {
    return {
      kind: "figma-link",
      url: figmaUrl,
      accessToken: "",
    };
  }

  const isConnected = Boolean(sessionQuery.data?.connected);
  const showStatus = isLoadingFrames || activeFrameId !== null;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.intro}>
          <h1 className={styles.title}>Figma to code</h1>
          <p className={styles.description}>
            Выпускная квалификационная работа Петрина Святослава Андреевича
          </p>
        </header>

        {!isConnected ? (
          <section className={`${styles.panel} ${styles.authCard}`}>
            <div className={styles.authHeader}>
              <div>
                <strong>Подключение Figma</strong>
                <p className={styles.hint}>Авторизуйтесь с помощью вашего аккаунта</p>
              </div>

              <div className={styles.toolbarRight}>
                <a className={styles.primaryButton} href="/api/auth/figma/start">
                  <FigmaIcon />
                  <span>Подключить</span>
                </a>
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.panel}>
            <div className={styles.linkRow}>
              <input
                className={styles.linkInput}
                placeholder="Вставьте ссылку на Figma-макет"
                value={figmaUrl}
                onChange={(event) => setFigmaUrl(event.target.value)}
                disabled={isLoadingFrames || activeFrameId !== null}
              />
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handleLoad}
                disabled={!figmaUrl.trim() || isLoadingFrames || activeFrameId !== null}
              >
                Загрузить макет
              </button>
            </div>

            {showStatus ? (
              <div className={styles.inlineStatus}>
                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}
          </section>
        )}

        {loadResult ? (
          <section className={`${styles.panel} ${styles.framesCard}`}>
            <div className={styles.framesHeader}>
              <div>
                <strong>{loadResult.fileName}</strong>
                <p className={styles.hint}>Выберите frame для рендера</p>
              </div>
            </div>

            <div className={styles.framesGrid}>
              {loadResult.frames.map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  className={`${styles.frameCard} ${activeFrameId === frame.id ? styles.frameCardActive : ""}`}
                  onClick={() => handleFrameSelect(frame.id)}
                  disabled={activeFrameId !== null}
                >
                  <strong>{frame.name}</strong>
                  <span
                    className={`${styles.frameMeta} ${styles.frameStatus} ${
                      frame.hasAutoLayout ? styles.frameStatusReady : styles.frameStatusWarning
                    }`}
                  >
                    {frame.hasAutoLayout ? <ReadyIcon /> : <WarningIcon />}
                    <span>{frame.hasAutoLayout ? "Auto Layout используется" : "AutoLayout не используется"}</span>
                  </span>
                  {false ? (
                    <span className={`${styles.frameMeta} ${styles.frameWarning}`}>
                      <WarningIcon />
                      <span>Рекомендуем использовать Auto Layout</span>
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <SiteLinks />
      </section>
    </main>
  );
}

function formatError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Ошибка валидации запроса.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Неизвестная ошибка.";
}

function FigmaIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.figmaIcon}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 16C16 13.7909 17.7909 12 20 12C22.2091 12 24 13.7909 24 16C24 18.2091 22.2091 20 20 20C17.7909 20 16 18.2091 16 16Z"
        fill="#1ABCFE"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 24C8 21.7909 9.79086 20 12 20H16V24C16 26.2091 14.2091 28 12 28C9.79086 28 8 26.2091 8 24Z"
        fill="#0ACF83"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 4V12H20C22.2091 12 24 10.2091 24 8C24 5.79086 22.2091 4 20 4H16Z"
        fill="#FF7262"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 8C8 10.2091 9.79086 12 12 12H16V4H12C9.79086 4 8 5.79086 8 8Z"
        fill="#F24E1E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 16C8 18.2091 9.79086 20 12 20H16V12H12C9.79086 12 8 13.7909 8 16Z"
        fill="#A259FF"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.warningIcon}>
      <path
        d="M12 15H12.01M12 12V9M4.98207 19H19.0179C20.5615 19 21.5233 17.3256 20.7455 15.9923L13.7276 3.96153C12.9558 2.63852 11.0442 2.63852 10.2724 3.96153L3.25452 15.9923C2.47675 17.3256 3.43849 19 4.98207 19Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReadyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.warningIcon}>
      <path d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M12,20c-4.5,0-8-3.5-8-8s3.5-8,8-8s8,3.5,8,8 S16.5,20,12,20z" fill="currentColor" />
      <polygon points="9.8,16.8 6.1,13.2 7.5,11.7 9.8,14 15.5,7.9 17,9.3" fill="currentColor" />
    </svg>
  );
}
