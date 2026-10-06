# Verification record

- Tested with Node 22.23.3 and npm 10.9.9.
- Training Python 3.10 with dependencies pinned in training/requirements.txt.
- Production build passed.
- Unit tests passed, including numerical sklearn-to-JavaScript golden-fixture parity (tolerance 1e-10).
- Chromium desktop and phone interaction checks passed: sample flow, empty/invalid input where applicable, JSON download, no horizontal phone overflow and no uncaught page errors.
- Actual desktop and mobile screenshots inspected for typography, spacing and clipped content.

These checks verify implementation, not medical validity, fraud-detection accuracy in the wild, real traffic forecasting performance or hiring outcomes.

Dark UI revision: four distinct app-specific compositions, locally bundled OFL fonts, desktop and mobile screenshots re-inspected, browser workflows and all unit tests passed again. Model weights and numerical outputs unchanged.

## Real live integration revision
7 additional function tests pass: missing key, allowlisted anchors, optional password, fixture parsing/key non-disclosure, sanitized upstream errors, invalid numeric response and rate-limit config. Browser missing-static-endpoint and fixture success screens tested; desktop and mobile pixels inspected. Fixture screenshot explicitly marked mocked. NO authenticated TomTom call or Netlify deployed endpoint tested.
