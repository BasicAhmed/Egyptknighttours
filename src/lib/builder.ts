// The credit for whoever built and maintains this platform. It is set here, in code, and is deliberately not an admin setting,
// so it cannot be edited or hidden from the staff panel. Only the optional link can be changed, through a server environment variable.
export const BUILDER_NAME = "Nino Techy";
export const builderUrl = () => { const u = (process.env.BUILDER_URL ?? "").trim(); return /^https:\/\//i.test(u) ? u : ""; };
