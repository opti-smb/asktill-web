import { Link } from 'react-router-dom';

import { PLANS, type PlanDefinition } from '../../lib/plans';
import { isPaidTier } from '../../lib/subscription';
import landing from '../landing/landingV2.module.css';
import compact from './PlanGrid.module.css';

type PlanGridProps = {
  variant: 'landing' | 'upgrade';
  userTier?: string | null;
  onSubscribe?: (plan: PlanDefinition) => void;
};

function planIsCurrent(plan: PlanDefinition, userTier: string | null | undefined): boolean {
  return plan.id === 'free' && !isPaidTier(userTier);
}

function PlanCta({
  plan,
  variant,
  userTier,
  compactMode,
  onSubscribe,
}: {
  plan: PlanDefinition;
  variant: PlanGridProps['variant'];
  userTier?: string | null;
  compactMode: boolean;
  onSubscribe?: (plan: PlanDefinition) => void;
}) {
  const btnPrimary = compactMode ? compact.btnPrimary : `${landing.btnP} ${landing.planBtn}`;
  const btnOutline = compactMode ? compact.btnOutline : `${landing.btnO} ${landing.planBtn}`;
  const btnClass = plan.primary ? btnPrimary : btnOutline;

  if (variant === 'landing') {
    return (
      <Link to="/register" className={btnClass}>
        {plan.cta}
      </Link>
    );
  }

  if (plan.id === 'free' && !isPaidTier(userTier)) {
    return (
      <button type="button" className={btnClass} disabled>
        Current plan
      </button>
    );
  }

  if (plan.id === 'free' && isPaidTier(userTier)) {
    return (
      <button type="button" className={btnClass} disabled>
        Included
      </button>
    );
  }

  return (
    <button type="button" className={btnClass} onClick={() => onSubscribe?.(plan)}>
      Subscribe
    </button>
  );
}

export default function PlanGrid({
  variant,
  userTier,
  onSubscribe,
}: PlanGridProps) {
  const compactMode = variant === 'upgrade';
  const c = compactMode ? compact : landing;

  if (compactMode) {
    return (
      <div className={compact.grid}>
        {PLANS.map((plan) => {
          const current = planIsCurrent(plan, userTier);
          return (
            <div
              key={plan.id}
              className={`${compact.plan} ${plan.featured ? compact.featured : ''} ${
                current ? compact.current : ''
              }`}
            >
              {plan.featured ? <div className={compact.badge}>Most popular</div> : null}
              {current ? <div className={compact.currentBadge}>Your plan</div> : null}
              <div className={compact.name}>{plan.name}</div>
              <div className={compact.price}>{plan.price}</div>
              <div className={compact.period}>{plan.period}</div>
              <div className={compact.items}>
                {plan.items.map((item) => (
                  <div key={item} className={item === plan.highlight ? compact.highlight : undefined}>
                    {item}
                  </div>
                ))}
              </div>
              <PlanCta
                plan={plan}
                variant={variant}
                userTier={userTier}
                compactMode
                onSubscribe={onSubscribe}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={landing.pricingGrid}>
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`${landing.plan} ${plan.featured ? landing.planFeatured : ''}`}
        >
          {plan.featured ? <div className={landing.planBadge}>Most popular</div> : null}
          <div className={landing.planName}>{plan.name}</div>
          <div className={landing.planPrice}>{plan.price}</div>
          <div className={landing.planPeriod}>{plan.period}</div>
          <div className={landing.planItems}>
            {plan.items.map((item) => (
              <div key={item} className={item === plan.highlight ? landing.planHi : undefined}>
                {item}
              </div>
            ))}
          </div>
          <PlanCta plan={plan} variant={variant} userTier={userTier} compactMode={false} />
        </div>
      ))}
    </div>
  );
}
