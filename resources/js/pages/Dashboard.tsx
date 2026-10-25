import { Badge } from '../components/Badge.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { PlannedCapabilities } from '../components/PlannedCapabilities.tsx';
import { AppLayout } from '../layouts/AppLayout.tsx';

const steps = [
  {
    status: 'Now',
    tone: 'accent',
    title: 'Sign in',
    detail: 'Your account is the signed-in home. This screen is ready to use.',
  },
  {
    status: 'Later',
    tone: 'neutral',
    title: 'Organize products',
    detail: 'Workspaces and projects will group analytics by team and product.',
  },
  {
    status: 'Later',
    tone: 'neutral',
    title: 'Read behavior',
    detail:
      'Funnels, retention, and journeys will appear after events are collected.',
  },
] as const;

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Analytics features are coming later. This dashboard does not show product metrics, and Insight is not collecting events yet."
      />
      <EmptyState
        eyebrow="No analytics yet"
        title="Your product data will live here"
        description="When event collection exists, this is where you will read how people use your software. Nothing is measured yet, so there are no charts, users, or conversion rates to display."
      >
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-lg bg-canvas px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {index + 1}
                </span>
                <Badge tone={step.tone}>{step.status}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-5 text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-lg border border-dashed border-line bg-canvas px-4 py-10 text-center">
          <p className="text-sm font-semibold text-ink">No chart</p>
          <p className="mt-1 text-sm text-muted">
            A chart will appear here after events are collected.
          </p>
        </div>
      </EmptyState>
      <PlannedCapabilities />
    </AppLayout>
  );
}
