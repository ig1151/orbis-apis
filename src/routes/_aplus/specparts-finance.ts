// Finance-tail spec fragment for the Group D quant APIs: the standard A+ _Tail
// plus a required financial_disclaimer (these APIs compute finance/quant results,
// so every response carries the disclaimer). Register as `_Tail` in a finance spec
// and the shared response allOf composites resolve to it within that spec.

import { Tail } from './specparts';

export const TailFinance = {
  type: 'object',
  required: [...(Tail as any).required, 'financial_disclaimer'],
  properties: {
    ...(Tail as any).properties,
    financial_disclaimer: { type: 'string', description: 'Informational-only disclaimer; not financial advice.' },
  },
};
