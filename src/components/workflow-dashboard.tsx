"use client";

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  FileText,
  ImageIcon,
  ListChecks,
  Play,
  Plus,
  RefreshCcw,
  Sparkles,
  SquarePen,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { DemoMarketingProvider } from "@/lib/providers/demo-provider";
import type {
  Concept,
  ImageBrief,
  ProductProfileInput,
  WorkflowStep,
  WorkflowWorkspace
} from "@/lib/domain/schemas";
import {
  approveConcept,
  approveImageBrief,
  createCampaignRun,
  createProductProfile,
  currentRun,
  findContext,
  generateAssets,
  generateConcepts,
  generateImageBriefs,
  generateIntelligenceBrief
} from "@/lib/workflow/engine";

type WorkflowDashboardProps = {
  initialWorkspace: WorkflowWorkspace;
};

const provider = new DemoMarketingProvider();

export function WorkflowDashboard({ initialWorkspace }: WorkflowDashboardProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedRunId, setSelectedRunId] = useState(initialWorkspace.runs[0]?.id);
  const [selectedStepId, setSelectedStepId] = useState(initialWorkspace.workflowSteps.at(-1)?.id);
  const [error, setError] = useState<string>();
  const [exportPreview, setExportPreview] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const run = useMemo(
    () => workspace.runs.find((candidate) => candidate.id === selectedRunId) ?? currentRun(workspace),
    [selectedRunId, workspace]
  );
  const contextVersion = findContext(workspace, run.productContextVersionId);
  const product = contextVersion.profileSnapshot;
  const brief = workspace.audienceBriefs.find(
    (candidate) => candidate.productContextVersionId === contextVersion.id
  );
  const concepts = workspace.concepts.filter((concept) => concept.runId === run.id);
  const imageBriefs = workspace.imageBriefs.filter((imageBrief) => imageBrief.runId === run.id);
  const assets = workspace.generatedAssets.filter((asset) => asset.runId === run.id);
  const steps = workspace.workflowSteps.filter((step) => step.runId === run.id);
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps.at(-1);

  const [productForm, setProductForm] = useState<ProductProfileInput>({
    name: product.name,
    productDescription: product.productDescription,
    targetAudience: product.targetAudience,
    market: product.market,
    brandVoice: product.brandVoice,
    constraints: product.constraints,
    proofPoints: product.proofPoints,
    prohibitedClaims: product.prohibitedClaims,
    sampleReferences: product.sampleReferences
  });

  function runAction(action: () => Promise<WorkflowWorkspace> | WorkflowWorkspace): void {
    setError(undefined);
    startTransition(async () => {
      try {
        const nextWorkspace = await action();
        setWorkspace(nextWorkspace);
        setSelectedStepId(nextWorkspace.workflowSteps.at(-1)?.id);
        setExportPreview(undefined);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Unexpected workflow failure.");
      }
    });
  }

  function saveProductVersion(): void {
    runAction(() => {
      const withProduct = createProductProfile(workspace, productForm);
      const createdContext = withProduct.contextVersions.at(-1);
      if (!createdContext) {
        throw new Error("Product context creation failed.");
      }
      const withRun = createCampaignRun(withProduct, {
        productContextVersionId: createdContext.id,
        objective: run.objective,
        channel: run.channel,
        assetCount: run.assetCount,
        audienceOverride: run.audienceOverride,
        tone: run.tone,
        aspectRatios: run.aspectRatios,
        maxGenerationSpendCents: run.maxGenerationSpendCents
      });
      const createdRun = withRun.runs.at(-1);
      if (!createdRun) {
        throw new Error("Campaign run creation failed.");
      }
      setSelectedRunId(createdRun.id);
      return withRun;
    });
  }

  async function downloadExport(): Promise<void> {
    const { buildExportManifest, buildExportMarkdown } = await import("@/lib/export/export-pack");
    const manifest = buildExportManifest(workspace, run.id);
    setExportPreview(buildExportMarkdown(manifest));
  }

  return (
    <div className="app-shell">
      <Sidebar workspace={workspace} runId={run.id} onSelectRun={setSelectedRunId} />
      <main className="main">
        <TopBar runStatus={run.status} isPending={isPending} onExport={downloadExport} />
        {error ? <ErrorBanner message={error} /> : null}
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <ProductPanel
            productForm={productForm}
            setProductForm={setProductForm}
            onSave={saveProductVersion}
          />
          <BriefPanel brief={brief} />
        </section>
        <WorkflowTimeline steps={steps} selectedStepId={selectedStep?.id} onSelect={setSelectedStepId} />
        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <ConceptPanel
            concepts={concepts}
            disabled={isPending}
            onGenerate={() => runAction(() => generateConcepts(workspace, run.id, provider))}
            onApprove={(concept) =>
              runAction(() => approveConcept(workspace, run.id, concept.id, "approved"))
            }
            onReject={(concept) =>
              runAction(() => approveConcept(workspace, run.id, concept.id, "rejected"))
            }
          />
          <ImageBriefPanel
            imageBriefs={imageBriefs}
            disabled={isPending}
            onGenerate={() => runAction(() => generateImageBriefs(workspace, run.id, provider))}
            onApprove={(imageBrief) =>
              runAction(() => approveImageBrief(workspace, run.id, imageBrief.id, "approved"))
            }
          />
        </section>
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AssetPanel
            assets={assets}
            disabled={isPending}
            onGenerate={() => runAction(() => generateAssets(workspace, run.id, provider))}
          />
          <RunControlPanel
            onGenerateBrief={() =>
              runAction(() => generateIntelligenceBrief(workspace, run.id, provider))
            }
            onGenerateConcepts={() => runAction(() => generateConcepts(workspace, run.id, provider))}
            onGenerateImageBriefs={() =>
              runAction(() => generateImageBriefs(workspace, run.id, provider))
            }
            onGenerateAssets={() => runAction(() => generateAssets(workspace, run.id, provider))}
            disabled={isPending}
          />
        </section>
        {exportPreview ? <ExportPreview markdown={exportPreview} /> : null}
      </main>
      <TraceInspector
        workspace={workspace}
        runId={run.id}
        selectedStep={selectedStep}
        onSelectStep={setSelectedStepId}
      />
    </div>
  );
}

function Sidebar({
  workspace,
  runId,
  onSelectRun
}: {
  workspace: WorkflowWorkspace;
  runId: string;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#114b43] text-white">
          <Sparkles size={18} />
        </div>
        <div>
          <h1 className="text-[16px] font-[760]">Marketing Asset Agent</h1>
          <p className="text-xs text-[#66736b]">Internal workflow</p>
        </div>
      </div>
      <nav className="mt-8 grid gap-1 text-sm font-semibold text-[#4c5a52]">
        <NavItem icon={<Box size={16} />} label="Products" active />
        <NavItem icon={<Play size={16} />} label="Runs" />
        <NavItem icon={<FileText size={16} />} label="Prompts" />
        <NavItem icon={<ListChecks size={16} />} label="Trace" />
      </nav>
      <div className="mt-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[#718078]">
          Campaign Runs
        </p>
        <div className="grid gap-2">
          {workspace.runs.map((run) => (
            <button
              key={run.id}
              className={`trace-row text-left text-sm ${run.id === runId ? "border-[#114b43]" : ""}`}
              onClick={() => onSelectRun(run.id)}
            >
              <span className="block font-bold">{run.objective}</span>
              <span className="text-xs text-[#66736b]">{run.status}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active = false }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 ${
        active ? "bg-[#dff3e6] text-[#114b43]" : "text-[#55635b]"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function TopBar({
  runStatus,
  isPending,
  onExport
}: {
  runStatus: string;
  isPending: boolean;
  onExport: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-[#536158]">RidePass Commuter Plan</p>
        <h2 className="text-[24px] font-[780] leading-tight">Traceable campaign asset workflow</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-pill status-warning">Concepts awaiting approval</span>
        <span className="status-pill">Provider: OpenAI-ready</span>
        <span className="status-pill">Model: gpt-5.5</span>
        <span className="status-pill">Image model: gpt-image-2</span>
        <button className="button button-coral" disabled={isPending} onClick={onExport}>
          <Download size={16} />
          Export pack
        </button>
      </div>
      <p className="w-full text-xs font-semibold text-[#647169]">Run status: {runStatus}</p>
    </header>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-[#f1b4a9] bg-[#fff0ed] p-3 text-sm text-[#9f3327]">
      <AlertTriangle size={18} />
      <span>{message}</span>
    </div>
  );
}

function ProductPanel({
  productForm,
  setProductForm,
  onSave
}: {
  productForm: ProductProfileInput;
  setProductForm: (value: ProductProfileInput) => void;
  onSave: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-[760]">Product Profile</h3>
          <p className="text-xs text-[#66736b]">Creates immutable product context versions.</p>
        </div>
        <button className="button button-primary" onClick={onSave}>
          <Plus size={16} />
          New Run
        </button>
      </div>
      <div className="panel-body grid gap-3">
        <TextField
          label="Product name"
          value={productForm.name}
          onChange={(name) => setProductForm({ ...productForm, name })}
        />
        <TextArea
          label="Product description (required)"
          value={productForm.productDescription}
          onChange={(productDescription) => setProductForm({ ...productForm, productDescription })}
        />
        <TextArea
          label="Target audience (optional)"
          value={productForm.targetAudience ?? ""}
          onChange={(targetAudience) => setProductForm({ ...productForm, targetAudience })}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            label="Market"
            value={productForm.market}
            onChange={(market) => setProductForm({ ...productForm, market })}
          />
          <TextField
            label="Brand voice"
            value={productForm.brandVoice ?? ""}
            onChange={(brandVoice) => setProductForm({ ...productForm, brandVoice })}
          />
        </div>
        <ListField
          label="Proof points"
          values={productForm.proofPoints}
          onChange={(proofPoints) => setProductForm({ ...productForm, proofPoints })}
        />
        <ListField
          label="Prohibited claims"
          values={productForm.prohibitedClaims}
          onChange={(prohibitedClaims) => setProductForm({ ...productForm, prohibitedClaims })}
        />
      </div>
    </section>
  );
}

function BriefPanel({ brief }: { brief: WorkflowWorkspace["audienceBriefs"][number] | undefined }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-[760]">Intelligence Brief</h3>
          <p className="text-xs text-[#66736b]">
            Claim source: provided / inferred / needs proof
          </p>
        </div>
        <span className={`status-pill ${brief ? "status-approved" : "status-warning"}`}>
          {brief ? "Persisted" : "Not generated"}
        </span>
      </div>
      <div className="panel-body">
        {brief ? (
          <div className="grid gap-3 text-sm">
            <p className="font-semibold">{brief.targetAudienceSummary}</p>
            <SourceList title="Pain points" items={brief.painPoints} />
            <SourceList title="Core promises" items={brief.corePromises} />
            <SourceList title="Claim risks" items={brief.claimRisks} />
          </div>
        ) : (
          <p className="text-sm text-[#66736b]">Generate the brief before concepts.</p>
        )}
      </div>
    </section>
  );
}

function WorkflowTimeline({
  steps,
  selectedStepId,
  onSelect
}: {
  steps: WorkflowStep[];
  selectedStepId?: string;
  onSelect: (stepId: string) => void;
}) {
  const stageLabels = [
    "Product Profile",
    "Intelligence Brief",
    "Concepts",
    "Approval",
    "Image Briefs",
    "Assets",
    "Export"
  ];
  return (
    <section className="panel mt-4">
      <div className="panel-header">
        <h3 className="text-sm font-[760]">Workflow Timeline</h3>
        <span className="status-pill">{steps.length} trace events</span>
      </div>
      <div className="panel-body">
        <div className="grid gap-2 md:grid-cols-7">
          {stageLabels.map((label) => {
            const matched = steps.find((step) =>
              label.toLowerCase().replaceAll(" ", "_").includes(step.stage.split("_")[0])
            );
            const state = matched?.status ?? "pending";
            return (
              <button
                key={label}
                className={`trace-row min-h-[92px] text-left ${
                  matched?.id === selectedStepId ? "border-[#114b43]" : ""
                }`}
                onClick={() => matched?.id && onSelect(matched.id)}
              >
                <StatusIcon status={state} />
                <span className="mt-2 block text-sm font-bold">{label}</span>
                <span className="text-xs text-[#66736b]">{state}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ConceptPanel({
  concepts,
  disabled,
  onGenerate,
  onApprove,
  onReject
}: {
  concepts: Concept[];
  disabled: boolean;
  onGenerate: () => void;
  onApprove: (concept: Concept) => void;
  onReject: (concept: Concept) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-[760]">Concepts</h3>
          <p className="text-xs text-[#66736b]">Human gate before image prompts.</p>
        </div>
        <button className="button" disabled={disabled} onClick={onGenerate}>
          <RefreshCcw size={16} />
          Generate
        </button>
      </div>
      <div className="panel-body">
        {concepts.map((concept) => (
          <article className="artifact" key={concept.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-[780]">{concept.title}</h4>
                <p className="mt-1 text-sm text-[#4e5b53]">{concept.angle}</p>
              </div>
              <StatusBadge status={concept.approvalStatus} />
            </div>
            <p className="mt-3 text-sm">{concept.caption}</p>
            <p className="mt-3 text-xs font-bold text-[#526057]">Proof element</p>
            <p className="text-sm text-[#4e5b53]">{concept.proofElement}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="button button-primary"
                disabled={disabled || concept.approvalStatus === "approved"}
                onClick={() => onApprove(concept)}
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
              <button
                className="button"
                disabled={disabled || concept.approvalStatus === "rejected"}
                onClick={() => onReject(concept)}
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ImageBriefPanel({
  imageBriefs,
  disabled,
  onGenerate,
  onApprove
}: {
  imageBriefs: ImageBrief[];
  disabled: boolean;
  onGenerate: () => void;
  onApprove: (imageBrief: ImageBrief) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-[760]">Image Briefs</h3>
          <p className="text-xs text-[#66736b]">Image briefs blocked until approval.</p>
        </div>
        <button className="button" disabled={disabled} onClick={onGenerate}>
          <SquarePen size={16} />
          Generate
        </button>
      </div>
      <div className="panel-body">
        {imageBriefs.length === 0 ? (
          <p className="text-sm text-[#66736b]">Approve a concept before prompt generation.</p>
        ) : null}
        {imageBriefs.map((brief) => (
          <article className="artifact" key={brief.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-[780]">{brief.overlayText.headline}</h4>
                <p className="text-xs text-[#66736b]">{brief.aspectRatio}</p>
              </div>
              <StatusBadge status={brief.approvalStatus} />
            </div>
            <p className="mt-3 text-sm text-[#4e5b53]">{brief.prompt}</p>
            <p className="mt-2 text-xs text-[#8a5d15]">{brief.negativePrompt}</p>
            <button
              className="button button-primary mt-3"
              disabled={disabled || brief.approvalStatus === "approved"}
              onClick={() => onApprove(brief)}
            >
              <CheckCircle2 size={16} />
              Approve prompt
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AssetPanel({
  assets,
  disabled,
  onGenerate
}: {
  assets: WorkflowWorkspace["generatedAssets"];
  disabled: boolean;
  onGenerate: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-[760]">Generated assets</h3>
          <p className="text-xs text-[#66736b]">Demo assets use SVG previews; production uses image API output.</p>
        </div>
        <button className="button button-coral" disabled={disabled} onClick={onGenerate}>
          <ImageIcon size={16} />
          Generate assets
        </button>
      </div>
      <div className="panel-body">
        {assets.length === 0 ? (
          <p className="text-sm text-[#66736b]">Approve image briefs before paid generation.</p>
        ) : (
          <div className="asset-grid">
            {assets.map((asset) => (
              <figure className="artifact" key={asset.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.imageUrl}
                  alt={`Generated marketing asset ${asset.id}`}
                  className="aspect-[4/5] w-full rounded-md border border-[#d8e0d6] object-cover"
                />
                <figcaption className="mt-2 text-xs text-[#536158]">
                  {asset.model} · {asset.metadata.promptHash}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RunControlPanel({
  disabled,
  onGenerateBrief,
  onGenerateConcepts,
  onGenerateImageBriefs,
  onGenerateAssets
}: {
  disabled: boolean;
  onGenerateBrief: () => void;
  onGenerateConcepts: () => void;
  onGenerateImageBriefs: () => void;
  onGenerateAssets: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-[760]">Run Controls</h3>
        <span className="status-pill status-warning">Human Gates</span>
      </div>
      <div className="panel-body grid gap-2">
        <button className="button justify-start" disabled={disabled} onClick={onGenerateBrief}>
          <FileText size={16} />
          Generate intelligence brief
        </button>
        <button className="button justify-start" disabled={disabled} onClick={onGenerateConcepts}>
          <Sparkles size={16} />
          Generate concepts
        </button>
        <button className="button justify-start" disabled={disabled} onClick={onGenerateImageBriefs}>
          <SquarePen size={16} />
          Generate image briefs
        </button>
        <button className="button button-coral justify-start" disabled={disabled} onClick={onGenerateAssets}>
          <ImageIcon size={16} />
          Generate final assets
        </button>
      </div>
    </section>
  );
}

function TraceInspector({
  workspace,
  runId,
  selectedStep,
  onSelectStep
}: {
  workspace: WorkflowWorkspace;
  runId: string;
  selectedStep?: WorkflowStep;
  onSelectStep: (stepId: string) => void;
}) {
  const steps = workspace.workflowSteps.filter((step) => step.runId === runId);
  const providerCalls = workspace.providerCalls.filter((call) => call.runId === runId);
  const selectedCall = providerCalls.find((call) => call.id === selectedStep?.providerCallId);

  return (
    <aside className="inspector">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-[780]">Trace</h3>
          <p className="text-xs text-[#66736b]">Intermediate outputs and provider metadata.</p>
        </div>
        <span className="status-pill">{providerCalls.length} calls</span>
      </div>
      <div className="mt-4 grid gap-2">
        {steps.map((step) => (
          <button
            className={`trace-row text-left ${step.id === selectedStep?.id ? "border-[#114b43]" : ""}`}
            key={step.id}
            onClick={() => onSelectStep(step.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">{step.stepKey}</span>
              <StatusIcon status={step.status} />
            </div>
            <p className="mt-1 text-xs text-[#66736b]">{step.status}</p>
          </button>
        ))}
      </div>
      <div className="panel mt-4">
        <div className="panel-header">
          <h4 className="text-sm font-bold">Selected Step</h4>
        </div>
        <div className="panel-body">
          {selectedStep ? (
            <pre className="text-[11px] leading-relaxed text-[#344239]">
              {JSON.stringify(
                {
                  step: selectedStep,
                  providerCall: selectedCall
                },
                null,
                2
              )}
            </pre>
          ) : (
            <p className="text-sm text-[#66736b]">Select a trace event.</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function ExportPreview({ markdown }: { markdown: string }) {
  return (
    <section className="panel mt-4">
      <div className="panel-header">
        <h3 className="text-sm font-[760]">Export Preview</h3>
        <span className="status-pill status-approved">Ready</span>
      </div>
      <div className="panel-body">
        <pre className="max-h-[360px] overflow-auto text-xs leading-relaxed">{markdown}</pre>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <textarea className="textarea" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ListField({
  label,
  values,
  onChange
}: {
  label: string;
  values: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <TextArea
      label={`${label} (one per line)`}
      value={values.join("\n")}
      onChange={(value) =>
        onChange(
          value
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        )
      }
    />
  );
}

function SourceList({ title, items }: { title: string; items: Array<{ text: string; source: string }> }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#526057]">{title}</p>
      <ul className="mt-1 grid gap-1">
        {items.map((item) => (
          <li className="flex gap-2 text-sm text-[#4e5b53]" key={`${title}-${item.text}`}>
            <span className="status-pill">{item.source}</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "approved"
      ? "status-approved"
      : status === "rejected" || status === "failed"
        ? "status-failed"
        : "status-warning";
  return <span className={`status-pill ${className}`}>{status}</span>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "succeeded" || status === "approved") {
    return <CheckCircle2 aria-label="succeeded" className="text-[#2f8f5b]" size={17} />;
  }

  if (status === "failed" || status === "rejected") {
    return <XCircle aria-label="failed" className="text-[#c64332]" size={17} />;
  }

  return <AlertTriangle aria-label="pending" className="text-[#b7791f]" size={17} />;
}
