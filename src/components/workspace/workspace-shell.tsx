"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { projectRecordSchema } from "@/lib/projects/schema";
import styles from "./workspace-shell.module.css";

type WorkspaceShellProps = {
  projectId: string;
};

export function WorkspaceShell({ projectId }: WorkspaceShellProps) {
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [selectedFilePath, setSelectedFilePath] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось загрузить проект.");
      }

      return projectRecordSchema.parse(json);
    },
  });

  if (projectQuery.isLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <p>Загружаем рабочую область проекта.</p>
        </section>
      </main>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <p>{projectQuery.error instanceof Error ? projectQuery.error.message : "Проект не найден."}</p>
        </section>
      </main>
    );
  }

  const project = projectQuery.data;
  const selectedFile =
    project.files.find((file) => file.path === selectedFilePath) ??
    project.files.find((file) => file.path === project.entryFilePath) ??
    project.files[0];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerActions}>
          <Link className={styles.ghostButton} href="/">
            Назад
          </Link>
          <button
            className={`${styles.tab} ${activeView === "preview" ? styles.tabActive : ""}`}
            type="button"
            onClick={() => setActiveView("preview")}
          >
            Preview
          </button>
          <button
            className={`${styles.tab} ${activeView === "code" ? styles.tabActive : ""}`}
            type="button"
            onClick={() => setActiveView("code")}
          >
            Code
          </button>
        </div>

        <div className={styles.headerActions}>
          <a className={styles.primaryButton} href={`/api/export/${project.id}`}>
            Скачать код
          </a>
        </div>
      </header>

      <section className={styles.surface}>
        {activeView === "preview" ? (
          <iframe
            className={styles.previewFrame}
            src={`/api/projects/${project.id}/preview`}
            title={`Preview for ${project.name}`}
          />
        ) : (
          <div className={styles.codeView}>
            <div className={styles.codeToolbar}>
              <select
                className={styles.select}
                value={selectedFile?.path ?? ""}
                onChange={(event) => setSelectedFilePath(event.target.value)}
              >
                {project.files.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.path}
                  </option>
                ))}
              </select>
            </div>

            <pre className={styles.codeBlock}>
              <code>{selectedFile?.content ?? "Файл не выбран."}</code>
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}
