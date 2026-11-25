/** Pure calculation API. All arguments are decimal ratios, not percentages. */
export function calculateKelly(p, a, b) {
  if (![p,a,b].every(Number.isFinite) || p < 0 || p > 1 || a <= 0 || b <= 0 || b > 1) throw new RangeError('승률 0~100%, 수익률 > 0%, 손실률 > 0~100%를 입력해라.');
  const q = 1-p;
  const rawKelly = p/b-q/a;
  const kelly = Math.min(1, Math.max(0, rawKelly));
  const arithmetic = f => f*(p*a-q*b);
  const logGrowth = f => {
    if (!Number.isFinite(f) || f < 0 || f > 1) throw new RangeError('투자비중은 0~1이다.');
    if (p === 1) return Math.log1p(f*a);
    if (f*b === 1) return -Infinity;
    return p*Math.log1p(f*a)+q*Math.log1p(-f*b);
  };
  const geometric = f => Math.expm1(logGrowth(f));
  return {p,q,a,b,rawKelly,kelly,edge:p*a-q*b,arithmetic,logGrowth,geometric};
}
