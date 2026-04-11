import Link from "next/link";
import { SiteLinks } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.backLink}>
          На главную
        </Link>

        <h1 className={styles.title}>About</h1>
        <p className={styles.lead}>
          Transfig — это веб-приложение для преобразования Figma-макетов в код с рабочим пайплайном: загрузка,
          разбор, интерпретация, генерация и экспорт.
        </p>

        <section className={styles.section}>
          <h2>Идея проекта</h2>
          <p>
            Основа проекта строится вокруг движка трансляции. Он получает структуру Figma-файла, нормализует узлы,
            определяет семантику элементов интерфейса и формирует итоговый код проекта.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Архитектура</h2>
          <ul>
            <li>UI-слой отвечает за ввод ссылки, выбор frame, предпросмотр и показ кода.</li>
            <li>API-слой внутри Next.js обрабатывает запросы и связывает интерфейс с движком.</li>
            <li>Core Engine включает parser, transformer, generator и exporter.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Для чего это нужно</h2>
          <p>
            Проект помогает сократить путь от дизайн-макета до рабочего прототипа, а также служит практической базой
            для ВКР по теме автоматизированной генерации интерфейсного кода.
          </p>
        </section>
      </section>

      <SiteLinks />
    </main>
  );
}
