// Product tagging: keyword inference first, interlocutor default-product as fallback.
// Framework-agnostic — no DB/Next.js imports — so it's unit-testable on its own
// (see scripts/test-tagging-local.mjs).

export type ProductId = "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh";

export interface InterlocutorRef {
  id: string;
  name: string;
  defaultProductId?: ProductId;
}

// Keyword lists per product, EN/FR/ES. Kept intentionally simple and editable —
// tune these as real CRs reveal better signal words.
const PRODUCT_KEYWORDS: Record<ProductId, string[]> = {
  "carbon-comp-fr": [
    "carbon comp fr",
    "carbon compensation fr",
    "compensation carbone fr",
    "carbone france",
  ],
  "carbon-comp-sp": [
    "carbon comp sp",
    "carbon compensation spain",
    "compensacion de carbono",
    "compensación de carbono",
    "carbono españa",
  ],
  "carbon-comp-it": [
    "carbon comp it",
    "carbon compensation italy",
    "compensazione carbonio",
    "carbonio italia",
  ],
  mrh: [
    "mrh",
    "assurance habitation",
    "résiliation",
    "resiliation",
    "quittance",
    "impayé",
    "impaye",
    "sinistre",
    "home insurance",
    "seguro de hogar",
  ],
};

// Generic product mentions with no country signal — used only to detect "this is
// a Carbon Comp conversation" before falling back to the interlocutor's default
// country variant.
const CARBON_COMP_GENERIC = ["carbon comp", "carbon compensation", "compensation carbone", "compensación de carbono", "compensazione del carbonio"];

export interface TagProductInput {
  crText: string;
  interlocutor?: InterlocutorRef;
}

export interface TagProductResult {
  productId: ProductId | null;
  method: "keyword" | "interlocutor-default" | "unresolved";
  matchedKeyword?: string;
}

export function tagProduct({ crText, interlocutor }: TagProductInput): TagProductResult {
  const haystack = crText.toLowerCase();

  // 1. Direct, country-specific keyword match wins outright.
  for (const [productId, keywords] of Object.entries(PRODUCT_KEYWORDS) as [ProductId, string[]][]) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        return { productId, method: "keyword", matchedKeyword: kw };
      }
    }
  }

  // 2. Generic "carbon comp" mention with no country → use interlocutor's default
  //    if it's one of the three Carbon Comp variants; otherwise fall through.
  const genericHit = CARBON_COMP_GENERIC.find((kw) => haystack.includes(kw));
  if (genericHit && interlocutor?.defaultProductId?.startsWith("carbon-comp")) {
    return { productId: interlocutor.defaultProductId, method: "interlocutor-default", matchedKeyword: genericHit };
  }

  // 3. No text signal at all → fall back fully to the interlocutor's configured default.
  if (interlocutor?.defaultProductId) {
    return { productId: interlocutor.defaultProductId, method: "interlocutor-default" };
  }

  // 4. Nothing to go on — caller should prompt the user to tag manually.
  return { productId: null, method: "unresolved" };
}
