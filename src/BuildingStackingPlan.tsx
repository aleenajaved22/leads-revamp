import { useMemo } from "react";
import { buildStackingPlan, type BuildingOptions } from "./BuildingModel";
import type { Company } from "./data";

type Props = BuildingOptions & { companies: Company[] };

export function BuildingStackingPlan({ companies, floorCount, rba }: Props) {
  const rows = useMemo(() => buildStackingPlan(companies, { floorCount, rba }), [companies, floorCount, rba]);

  return (
    <div className="building-stacking-plan" aria-label="Stack">
      <header className="building-stacking-plan-header">
        <h3 className="building-stacking-plan-title">Stack</h3>
      </header>
      <div className="building-stacking-plan-scroll">
        <ol className="building-stacking-plan-floors">
          {rows.map((row) => (
            <li key={row.floor} className="building-stacking-plan-row">
              <div className="building-stacking-plan-floor">
                <span className="building-stacking-plan-floor-label">{row.label}</span>
                <span className="building-stacking-plan-floor-sf">{row.totalSf.toLocaleString("en-US")} SF</span>
              </div>
              <div className="building-stacking-plan-bar" role="img" aria-label={`Floor ${row.floor} occupancy`}>
                {row.segments.map((segment, index) => (
                  <div
                    key={`${row.floor}-${index}`}
                    className={`building-stacking-plan-segment${segment.vacant ? " is-vacant" : ""}`}
                    style={{
                      flex: `${Math.max(segment.share, 0.08)} 1 0`,
                      backgroundColor: segment.vacant ? segment.color : segment.color,
                    }}
                  >
                    <span className="building-stacking-plan-segment-name">{segment.name}</span>
                    {segment.detail.length > 0 && (
                      <span className="building-stacking-plan-segment-detail">{segment.detail.join(" · ")}</span>
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <footer className="building-stacking-plan-legend">
        <span className="building-stacking-plan-legend-item">
          <i className="is-occupied" aria-hidden="true" />
          Occupied
        </span>
      </footer>
    </div>
  );
}
