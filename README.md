[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

_NeedToKnow is an AI assistant for your most private documents that reads only what you release, one question at a time, because nobody (not our server, its admins, nor the AI) holds the key._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked). Live: https://ntk.dangpham.id.vn · Demo video: [`demo.mp4`](demo.mp4)

### 1. Vision & originality

AI on a need-to-know basis: it sees titles, asks for specific documents with reasons, and you release them for one answer. Names and IDs are masked in your browser; every disclosure becomes a receipt. Prompt-injection resistance comes from architecture, not from hoping the model behaves.

### 2. Trust constraint insight

To read your documents, an AI service must hold the key, so operators, insiders, attackers or a hijacked agent can reach everything. So people keep their most important paperwork away from AI. Without a master key, that becomes safe.

### 3. Value & impact

A patient with an ACL surgery quote asks "what will I pay, and can I afford it?" instead of spending an evening with a 30-page policy, releases three documents (never their passport) and gets a cited calculation. It serves patients, tenants and small businesses.

### 4. Why TideCloak matters

- **Tide self-encryption:** documents are encrypted in the browser. Decryption is a threshold operation on Tide's ORK network that only the owner's session can authorise; our server holds no key.
- Verified live: when an operator tries to decrypt another user's file, 20 of 20 Tide nodes refuse.
- **IGA governance:** even the server's root credential can only file a role change, applied only after Tide admins sign it in their enclaves.

### 5. Prototype & storytelling

Guided demo: seal a synthetic vault, ask about the surgery and approve, then run a hijacked AI: a hidden French injection makes it demand every document and call `export_all_documents()`. Deny: nothing leaks. In the operator console, decryption is refused.

| | |
|---|---|
| ![Guided demo, trust strip: 7 sealed documents, 0 keys on our server](docs/screenshots/home.png) | ![The AI asks for 3 of 7 documents and answers with citations](docs/screenshots/answer.png) |
| ![Names and ID numbers masked in the browser: exactly what the AI received](docs/screenshots/masked.png) | ![Hijacked AI: export blocked, link stripped, extra requests flagged](docs/screenshots/hijacked-ai.png) |
| ![Operator's decrypt attempt refused by 20 of 20 Tide nodes](docs/screenshots/operator-refused.png) | ![Root-credential role grant parked as a pending change request](docs/screenshots/governance.png) |

## Setup

**Try the live demo:** open https://ntk.dangpham.id.vn → **Sign in with Tide** and use the shared demo account (synthetic data only, operator access for step 4):

| Username | Password |
|---|---|
| `linh-ntk-ziyxp` | `Ga0gC7FNHdFnIrlxShj2` |

Then follow the four-step **Guided demo** at the top of the page. You can also choose **Create an account** to use your own Tide identity (new-account creation depends on Tide's network being reachable).

Run it yourself: see [docs/SETUP.md](docs/SETUP.md).
