import { PlannedCapabilities } from '../components/PlannedCapabilities.tsx';
import { AppLayout } from '../layouts/AppLayout.tsx';

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Analytics features are coming later. This screen is the Insight
            application shell. It does not show product metrics.
          </p>
        </div>
        <PlannedCapabilities />
      </div>
    </AppLayout>
  );
}
