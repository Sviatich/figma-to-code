"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ZodError } from "zod";
import { createProjectSchema, type CreateProjectInput } from "@/shared/schemas/project";
import { createProjectRequest, getProjectsRequest } from "../api";
import styles from "./workspace.module.css";

type FormState = {
  name: string;
  figmaFileKey: string;
  nodeId: string;
  accessToken: string;
};

const defaultForm: FormState = {
  name: "Landing Import",
  figmaFileKey: "",
  nodeId: "",
  accessToken: "",
};

export function Workspace() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: getProjectsRequest,
  });

  const createMutation = useMutation({
    mutationFn: createProjectRequest,
    onSuccess: async (project) => {
      setFieldErrors({});
      setSelectedProjectId(project.id);
      setSelectedFilePath(project.files[0]?.path ?? "");
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const selectedProject = useMemo(() => {
    if (projects.length === 0) {
      return undefined;
    }

    return projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  }, [projects, selectedProjectId]);

  const selectedFile = useMemo(() => {
    if (!selectedProject) {
      return undefined;
    }

    return selectedProject.files.find((file) => file.path === selectedFilePath) ?? selectedProject.files[0];
  }, [selectedFilePath, selectedProject]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = createProjectSchema.parse(form) as CreateProjectInput;
      setFieldErrors({});
      await createMutation.mutateAsync(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        setFieldErrors(error.flatten().fieldErrors);
        return;
      }

      throw error;
    }
  }

  return (
    <section className={styles.workspace}>
      <aside className={`${styles.panel} ${styles.formPanel}`}>
        <h2 className={styles.sectionTitle}>Импорт из Figma</h2>
        <p className={styles.sectionText}>
          Базовая схема уже готова для `React`, `TypeScript`, `Next.js`, `CSS Modules`, `TanStack Query` и `Zod`.
        </p>

        <form className={styles.stack} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name">Название проекта</label>
            <input id="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            {fieldErrors.name?.[0] ? <p className={styles.error}>{fieldErrors.name[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="fileKey">Figma file key</label>
            <input
              id="fileKey"
              placeholder="AbCdEf123456"
              value={form.figmaFileKey}
              onChange={(event) => updateField("figmaFileKey", event.target.value)}
            />
            <p className={styles.hint}>Ключ файла из URL вида `https://www.figma.com/design/&lt;fileKey&gt;/...`.</p>
            {fieldErrors.figmaFileKey?.[0] ? <p className={styles.error}>{fieldErrors.figmaFileKey[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="nodeId">Node ID</label>
            <input
              id="nodeId"
              placeholder="1:2"
              value={form.nodeId}
              onChange={(event) => updateField("nodeId", event.target.value)}
            />
            <p className={styles.hint}>Например, `1:2` из `?node-id=1-2` в ссылке на конкретный фрейм.</p>
            {fieldErrors.nodeId?.[0] ? <p className={styles.error}>{fieldErrors.nodeId[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="accessToken">Figma access token</label>
            <input
              id="accessToken"
              type="password"
              placeholder="Опционально, иначе будет mock-режим"
              value={form.accessToken}
              onChange={(event) => updateField("accessToken", event.target.value)}
            />
            <p className={styles.hint}>Можно не указывать в форме и положить в `FIGMA_ACCESS_TOKEN` через `.env.local`.</p>
          </div>

          <button className={styles.button} type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Генерирую проект..." : "Импортировать и сгенерировать"}
          </button>

          {createMutation.isError ? (
            <p className={styles.error}>{createMutation.error instanceof Error ? createMutation.error.message : "Ошибка запроса"}</p>
          ) : null}

          <div className={styles.notice}>
            Без БД проекты живут только в памяти процесса `Next.js`. Для старта этого достаточно, а позже store можно
            заменить на файловое хранилище или базу без ломки внешнего API.
          </div>
        </form>
      </aside>

      <div className={styles.mainPanel}>
        {selectedProject ? (
          <>
            <section className={`${styles.panel} ${styles.summaryCard}`}>
              <div className={styles.projectHeader}>
                <div>
                  <p className={styles.pill}>{selectedProject.source.mode === "live" ? "live figma api" : "mock pipeline"}</p>
                  <h2 className={styles.projectTitle}>{selectedProject.name}</h2>
                </div>
                <div className={styles.projectMeta}>
                  <span>{new Date(selectedProject.createdAt).toLocaleString("ru-RU")}</span>
                  <span>{selectedProject.files.length} files</span>
                </div>
              </div>

              <p className={styles.sectionText}>{selectedProject.summary}</p>

              <div className={styles.metaGrid}>
                <article className={styles.metaCard}>
                  <strong>file key</strong>
                  <span>{selectedProject.figmaFileKey}</span>
                </article>
                <article className={styles.metaCard}>
                  <strong>node id</strong>
                  <span>{selectedProject.nodeId}</span>
                </article>
                <article className={styles.metaCard}>
                  <strong>source node</strong>
                  <span>{selectedProject.source.nodeName}</span>
                </article>
                <article className={styles.metaCard}>
                  <strong>node type</strong>
                  <span>{selectedProject.source.nodeType}</span>
                </article>
              </div>
            </section>

            <section className={styles.layout}>
              <article className={`${styles.panel} ${styles.previewCard}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Preview</h3>
                  <div className={styles.toolbar}>
                    <a className={styles.secondaryButton} href={`/api/projects/${selectedProject.id}/preview`} target="_blank" rel="noreferrer">
                      Открыть отдельно
                    </a>
                    <a className={styles.secondaryButton} href={`/api/projects/${selectedProject.id}/download`}>
                      Скачать ZIP
                    </a>
                  </div>
                </div>
                <iframe className={styles.iframe} src={`/api/projects/${selectedProject.id}/preview`} title={`Preview for ${selectedProject.name}`} />
              </article>

              <article className={`${styles.panel} ${styles.codeCard}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Generated code</h3>
                  <select className={styles.select} value={selectedFile?.path ?? ""} onChange={(event) => setSelectedFilePath(event.target.value)}>
                    {selectedProject.files.map((file) => (
                      <option key={file.path} value={file.path}>
                        {file.path}
                      </option>
                    ))}
                  </select>
                </div>

                <pre className={styles.code}>
                  <code>{selectedFile?.content ?? "Файл не выбран"}</code>
                </pre>
              </article>
            </section>
          </>
        ) : (
          <section className={styles.emptyState}>
            <p>После первого импорта здесь появятся preview, список файлов и архив для скачивания.</p>
          </section>
        )}

        <section className={`${styles.panel} ${styles.listCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Недавние генерации</h3>
            <span className={styles.hint}>{projectsQuery.isLoading ? "Загрузка..." : `${projects.length} проектов`}</span>
          </div>

          <div className={styles.list}>
            {projects.length > 0 ? (
              projects.map((project) => (
                <button
                  key={project.id}
                  className={`${styles.listItem} ${project.id === selectedProject?.id ? styles.listItemActive : ""}`}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <strong>{project.name}</strong>
                  <p className={styles.hint}>
                    {project.source.nodeName} • {project.files.length} files
                  </p>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>Список пока пуст. Создай первый импорт из Figma слева.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
