import { SchemesOpportunities } from '@/components/SchemesOpportunities';

export function SchemesOpportunitiesPage() {
  return (
    <div className="relative z-10 h-full overflow-y-auto bg-white/45 backdrop-blur-[2px] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <SchemesOpportunities />
      </div>
    </div>
  );
}
