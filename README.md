[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

_NeedToKnow is an AI assistant for your most private documents that reads only what you release, one question at a time, because nobody (not our server, its admins, nor the AI) holds the key._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked). Live: https://ntk.dangpham.id.vn · Demo video: [`demo.mp4`](demo.mp4)

### 1. Vision & originality

AI on a need-to-know basis: it sees titles, asks for specific documents with reasons, and you release them for one answer. Every disclosure becomes a receipt. Prompt-injection resistance comes from architecture, not from hoping the model behaves.

### 2. Trust constraint insight

For an AI service to read your documents, someone must hold the key, so the operator, insiders, attackers or a hijacked agent can reach everything. So people keep their most important paperwork away from AI. Without a master key, that becomes safe.

### 3. Value & impact

Linh has an ACL surgery quote. Instead of an evening with a 30-page policy, she asks "what will I pay, and can I afford it?", releases three documents (never her passport) and gets a cited calculation. It serves patients, tenants and small businesses.

### 4. Why TideCloak matters

- **Tide self-encryption:** documents are encrypted in the browser. Decryption is a threshold operation on Tide's ORK network that only the owner's live session can authorise. Our server holds no key.
- An operator with the whole database and their own Tide session still cannot decrypt users' documents.
- **IGA governance:** even the server's root admin credential can only file a role change; it applies only after Tide admins sign it in their enclaves (70% quorum).

### 5. Prototype & storytelling

Load Linh's synthetic vault, ask about surgery, approve. Turn on "Simulate hijacked AI" and ask about the physio invoice: a hidden French injection makes the AI demand every document and call `export_all_documents()`. Deny: nothing leaks. In the operator console, decryption is refused.

## Setup

**Try the live demo:** open https://ntk.dangpham.id.vn, choose **Sign in with Tide → Create an account**, then **Load demo documents** and use the suggested questions (all data is synthetic). Toggle **Simulate hijacked AI** to see the red-team run.

Run it yourself: see [docs/SETUP.md](docs/SETUP.md).
