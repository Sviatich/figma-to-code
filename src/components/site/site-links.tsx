"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./site-links.module.css";

type AuthSession = {
  connected: boolean;
  expiresAt: number | null;
  userId: string | null;
};

type SiteLinksProps = {
  className?: string;
};

export function SiteLinks({ className = "" }: SiteLinksProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery<AuthSession>({
    queryKey: ["figma-session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/figma/session", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось проверить сессию Figma.");
      }

      return json as AuthSession;
    },
    staleTime: 30_000,
  });

  async function handleLogout(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    await fetch("/api/auth/figma/logout", {
      method: "POST",
    });

    await queryClient.invalidateQueries({ queryKey: ["figma-session"] });

    if (pathname === "/") {
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <nav className={`${styles.links} ${className}`.trim()} aria-label="Служебная навигация">
      <Link href="/privacy-policy">Privacy Policy</Link>
      <Link href="/about">About</Link>
      <Link href="/doc">Doc</Link>
      <a href="https://github.com/Sviatich/figma-to-code" target="_blank" rel="noreferrer">
        GitHub
      </a>
      {sessionQuery.data?.connected ? (
        <a href="/api/auth/figma/logout" onClick={handleLogout}>
          <ReturnIcon />
          &nbsp;Сменить аккаунт
        </a>
      ) : null}
    </nav>
  );
}


function ReturnIcon() {
  return (
    <svg width="12px" viewBox="0 0 16 16" fill="none">
      <path d="M5 1H4L0 5L4 9H5V6H11C12.6569 6 14 7.34315 14 9C14 10.6569 12.6569 12 11 12H4V14H11C13.7614 14 16 11.7614 16 9C16 6.23858 13.7614 4 11 4H5V1Z" fill="var(--ink-soft)"></path>
    </svg>
  );
}
