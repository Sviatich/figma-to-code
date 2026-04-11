import Link from "next/link";
import { SiteLinks } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.backLink}>
          На главную
        </Link>

        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.lead}>
          Сервис использует авторизацию Figma только для чтения структуры файлов, выбранных пользователем по ссылке.
        </p>

        <section className={styles.section}>
          <h2>Какие данные используются</h2>
          <p>
            Приложение получает доступ к Figma-аккаунту через OAuth и запрашивает данные только для загрузки макета,
            выбора frame и генерации кода. Доступ не используется для публикации, редактирования или удаления файлов.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Что сохраняется</h2>
          <p>
            Внутри приложения сохраняются временные данные текущего проекта, необходимые для предпросмотра, генерации
            кода и экспорта результата. Эти данные относятся только к выбранному пользователем макету.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Управление доступом</h2>
          <p>
            Пользователь в любой момент может отвязать Figma-аккаунт через ссылку выхода. После этого новые запросы к
            Figma API выполняться не будут, пока аккаунт не будет подключен повторно.
          </p>
        </section>
      </section>

      <SiteLinks />
    </main>
  );
}
