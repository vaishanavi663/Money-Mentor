import { useState } from "react";
import { useTopMutualFunds, type MutualFund } from "@/hooks/useSchemes";
import { GOV_SCHEMES, type GovScheme } from "@/data/govSchemes";

const CATEGORY_COLORS: Record<GovScheme["category"], string> = {
  savings: "bg-blue-50 text-blue-700 border-blue-200",
  investment: "bg-purple-50 text-purple-700 border-purple-200",
  insurance: "bg-green-50 text-green-700 border-green-200",
  tax: "bg-amber-50 text-amber-700 border-amber-200",
  social: "bg-pink-50 text-pink-700 border-pink-200",
};

const FUND_TYPE_COLORS: Record<string, string> = {
  Equity: "bg-purple-50 text-purple-700",
  Debt: "bg-blue-50 text-blue-700",
  Gold: "bg-amber-50 text-amber-700",
};

function GovSchemeCard({ scheme }: { scheme: GovScheme }) {
  return (
    <a
      href={scheme.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-gray-100 bg-white p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {scheme.highlight && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                Popular
              </span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[scheme.category]}`}
            >
              {scheme.category.charAt(0).toUpperCase() + scheme.category.slice(1)}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight mb-1">
            {scheme.name}
          </h3>
          <p className="text-xs text-gray-500 mb-2">{scheme.ministry}</p>
          <p className="text-xs text-gray-600 leading-relaxed">{scheme.benefit}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 whitespace-nowrap">
            {scheme.tag}
          </div>
          <div className="mt-2 text-xs text-blue-500 group-hover:text-blue-700">View details →</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400 border-t border-gray-50 pt-2">Eligibility: {scheme.eligibility}</p>
    </a>
  );
}

function MutualFundCard({ fund }: { fund: MutualFund }) {
  const isPositive = parseFloat(fund.change) >= 0;
  return (
    <a
      href={fund.investUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-gray-100 bg-white p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                FUND_TYPE_COLORS[fund.type] || "bg-gray-50 text-gray-600"
              }`}
            >
              {fund.type}
            </span>
            <span className="text-xs text-gray-400">{fund.category}</span>
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight">
            {fund.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1">NAV as of {fund.navDate}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-lg font-bold text-gray-900">₹{fund.nav}</div>
          <div className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
            {isPositive ? "▲" : "▼"} {Math.abs(parseFloat(fund.change))}%
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-blue-500 group-hover:text-blue-700 text-right">Invest on Groww →</div>
    </a>
  );
}

export function SchemesOpportunities() {
  const [activeTab, setActiveTab] = useState<"schemes" | "funds">("schemes");
  const [schemeFilter, setSchemeFilter] = useState<string>("all");
  const { data: funds, isLoading: fundsLoading } = useTopMutualFunds();

  const filteredSchemes =
    schemeFilter === "all" ? GOV_SCHEMES : GOV_SCHEMES.filter((s) => s.category === schemeFilter);

  const categories = ["all", "savings", "investment", "insurance", "tax", "social"] as const;

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Schemes & Opportunities</h2>
          <p className="text-xs text-gray-500 mt-0.5">Official government schemes & live mutual fund NAV</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
          {(["schemes", "funds"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "schemes" ? "Govt Schemes" : "Mutual Funds"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "schemes" && (
        <>
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSchemeFilter(cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  schemeFilter === cat
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSchemes.map((scheme) => (
              <GovSchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-gray-400">
            All schemes link to official{" "}
            <a
              href="https://www.myscheme.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              myscheme.gov.in
            </a>{" "}
            — Government of India
          </p>
        </>
      )}

      {activeTab === "funds" && (
        <>
          {fundsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(funds || []).map((fund) => (
                <MutualFundCard key={fund.schemeCode} fund={fund} />
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-gray-400">
            Live NAV data from{" "}
            <a
              href="https://www.mfapi.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              mfapi.in
            </a>{" "}
            via AMFI India. Updated daily.
          </p>
        </>
      )}
    </div>
  );
}
