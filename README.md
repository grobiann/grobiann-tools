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

The finance desktop app embeds `/kelly/?mode=finance`. Additional price inputs and the saved-calculation sidebar activate after a version-1 message handshake with the local app parent at port 8765. Ordinary site visits keep the standard calculator. The parent validates message source/origin and stores named snapshots in its own localStorage, not on GitHub. Clearing the app browser's data removes those snapshots. The price mode requires profit price > current price > loss price >= 0. Savings use button events rather than form submission, so the iframe needs no `allow-forms` permission. Run `node --test kelly/*.test.mjs` for both rate and price cases.

The formula and derivation follow the author's published article: https://blog.naver.com/grobiann/224492192287 . The finite-sample interpretation of the np/nq exponents and the stationary-point condition are clarified in the explanation.

The arithmetic curve is linear. Kelly maximizes expected log wealth, not arithmetic return. The geometric view plots exp(g)−1. Costs, taxes, borrowing interest and cash returns are excluded.

`requiredWinProbability(f,a,b)` inverts Kelly sizing into the required win probability. The target allocation slider changes the probability input. Defaults: 60%, 20%, 20%; geometric view. Inputs use sliders plus precise number entry. Chart domain is 0 to 1/b. For p=1 there is no finite optimum in the zero borrowing-cost model.

Source: J. L. Kelly Jr., 1956, https://doi.org/10.1002/j.1538-7305.1956.tb03809.x
