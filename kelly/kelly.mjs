/** Pure calculation API. All arguments are decimal ratios, not percentages. */
export function calculateKelly(p, a, b) {
  if (![p,a,b].every(Number.isFinite) || p < 0 || p > 1 || a <= 0 || b <= 0) throw new RangeError('승률 0~100%, 수익률과 손실률은 0%보다 큰 값을 입력해라.');
  const q = 1-p;
  const rawKelly = p/b-q/a;
  const maxFraction = 1/b;
  const kelly = p === 1 ? Infinity : Math.max(0, rawKelly);
  const arithmetic = f => f*(p*a-q*b);
  const logGrowth = f => {
    if (!Number.isFinite(f) || f < 0 || f > maxFraction) throw new RangeError('투자비중은 0~1/b 범위다.');
    if (p === 1) return Math.log1p(f*a);
    if (f >= maxFraction) return -Infinity;
    return p*Math.log1p(f*a)+q*Math.log1p(-f*b);
  };
  const geometric = f => Math.expm1(logGrowth(f));
  return {p,q,a,b,rawKelly,kelly,maxFraction,edge:p*a-q*b,arithmetic,logGrowth,geometric};
}

/** Win probability making f the interior Kelly optimum; f=0 is the break-even threshold. */
export function requiredWinProbability(f, a, b) {
  const {maxFraction} = calculateKelly(.5,a,b);
  if (!Number.isFinite(f) || f < 0 || f > maxFraction) throw new RangeError('투자비중은 0~1/b 범위다.');
  return Math.min(1, b*(1+a*f)/(a+b));
}
