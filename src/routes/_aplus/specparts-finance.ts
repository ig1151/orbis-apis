// Finance-tail spec fragment for the Group D quant APIs: the standard A+ _Tail
// plus a required financial_disclaimer (these APIs compute finance/quant results,
// so every response carries the disclaimer). Register as `_Tail` in a finance spec
// and the shared response allOf composites resolve to it within that spec.

import { Tail } from './specparts';

export const TailFinance = {
  type: 'object',
  required: [...(Tail as any).required, 'calculation_certainty', 'financial_disclaimer'],
  properties: {
    ...(Tail as any).properties,
    // Deterministic math: the computation itself is exact given valid inputs. Exposed
    // alongside confidence_score so agents don't read confidence as *predictive* confidence.
    calculation_certainty: { type: 'number', minimum: 0, maximum: 1, description: 'Computational certainty of the result given valid inputs (1 = exact, deterministic math — not a prediction).' },
    financial_disclaimer: { type: 'string', description: 'Informational-only disclaimer; not financial advice.' },
  },
};
