# grobiann tools

Buildless, mobile-friendly calculators for GitHub Pages. Open `/kelly/`.

## Run & verify

Serve this directory over HTTP. Run `node --test kelly/kelly.test.mjs` for calculation tests.
Publish the `main` branch root through GitHub Pages (Settings → Pages → Deploy from a branch).

## Financial assistant integration

Import `calculateKelly` from `kelly/kelly.mjs`. Pass decimal ratios `(p,a,b)`, e.g. `(0.6,1,1)`.
The returned object contains `rawKelly`, long-only `kelly` (leverage allowed, Infinity when p=1), `maxFraction` (1/b chart boundary), `edge`, and functions `arithmetic(f)`, `logGrowth(f)`, `geometric(f)`.
No dependencies or network requests. The UI can also be embedded using an iframe pointing to `/kelly/`.
Inputs persist locally; share URLs accept `?p=60&a=20&b=20` (percent units).

The arithmetic curve is linear. Kelly maximizes expected log wealth, not arithmetic return. The geometric view plots exp(g)−1. Costs, taxes, borrowing interest and cash returns are excluded.

`requiredWinProbability(f,a,b)` inverts Kelly sizing into the required win probability. The target allocation slider changes the probability input. Defaults: 60%, 20%, 20%; geometric view. Inputs use sliders plus precise number entry. Chart domain is 0 to 1/b. For p=1 there is no finite optimum in the zero borrowing-cost model.

Source: J. L. Kelly Jr., 1956, https://doi.org/10.1002/j.1538-7305.1956.tb03809.x
