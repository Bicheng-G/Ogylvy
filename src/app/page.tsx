import { WorkflowDashboard } from "@/components/workflow-dashboard";
import { createSeedWorkspace } from "@/lib/domain/fixtures";

export default function Home() {
  return <WorkflowDashboard initialWorkspace={createSeedWorkspace()} />;
}

