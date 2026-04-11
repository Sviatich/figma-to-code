import { WorkspaceShell } from "@/components/workspace/workspace-shell";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <WorkspaceShell projectId={projectId} />;
}
