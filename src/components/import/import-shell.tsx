"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ZodError } from "zod";
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

const STORAGE_KEY = "transfig:last-import";

export function ImportShell({ figmaState, figmaReason }: ImportShellProps) {
  const router = useRouter();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);

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
      const raw = sessionStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        figmaUrl: string;
        loadResult: LoadResult | null;
      };

      setFigmaUrl(parsed.figmaUrl ?? "");
      setLoadResult(parsed.loadResult ?? null);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
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
      setStatus("");
      setProgress(0);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [sessionQuery.data]);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        figmaUrl,
        loadResult,
      }),
    );
  }, [figmaUrl, loadResult]);

  async function handleLoad() {
    try {
      setError("");
      setIsLoadingFrames(true);
      setStatus("Загружаем структуру файла из Figma");
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
      setStatus("");
      setProgress(0);
    } catch (caughtError) {
      setLoadResult(null);
      setProgress(0);
      setStatus("");
      setError(formatError(caughtError));
    } finally {
      setIsLoadingFrames(false);
    }
  }

  async function handleFrameSelect(frameId: string) {
    try {
      setError("");
      setActiveFrameId(frameId);
      setStatus("Генерируем проект по выбранному frame");
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
      setStatus("");
      setError(formatError(caughtError));
      setActiveFrameId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/figma/logout", {
      method: "POST",
    });

    await sessionQuery.refetch();
    setLoadResult(null);
    setError("");
    setStatus("");
    setProgress(0);
    sessionStorage.removeItem(STORAGE_KEY);
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
                <p className={styles.hint}>
                  Авторизуйтесь с помощью вашего аккаунта Figma, чтобы загрузить макет.
                </p>
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
              <button className={styles.ghostButton} type="button" onClick={handleLogout} disabled={isLoadingFrames || activeFrameId !== null}>
                Сменить аккаунт
              </button>
            </div>

            {showStatus ? (
              <div className={styles.inlineStatus}>
                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.statusText}>{status}</span>
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
                <p className={styles.hint}>Выберите frame для рендера. После клика рабочая область откроется сразу.</p>
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
                  <span className={styles.frameMeta}>
                    {frame.type} · node {frame.id}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
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
