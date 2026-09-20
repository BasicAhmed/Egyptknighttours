// Safe JSON-LD for <script type="application/ld+json">: escapes "<" so content can never close the script tag.
export const jsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
