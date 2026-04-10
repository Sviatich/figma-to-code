import styles from "./page.module.css";
import { Workspace } from "@/features/workspace/components/workspace";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Figma to Code Workbench</p>
        <h1 className={styles.title}>Базовый стек для сервиса, который превращает макет Figma в живой код.</h1>
        <p className={styles.description}>
          Этот стартовый каркас уже умеет принимать `fileKey` и `nodeId`, ходить в Figma API при наличии
          токена, генерировать демо-результат, показывать preview и отдавать архив с исходниками.
        </p>
      </section>

      <Workspace />
    </main>
  );
}
