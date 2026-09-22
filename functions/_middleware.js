// Admin is meant to live behind Cloudflare Access on the production domain
// only — the .pages.dev preview/dev URL isn't covered by that Access policy,
// so bounce any non-production host straight to the real thing.
const PROD_HOSTS = ["cploadout.com", "localhost", "127.0.0.1"];

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const isAdmin = url.pathname === "/admin" || url.pathname === "/admin.html" || url.pathname.startsWith("/admin/");
  if (isAdmin && !PROD_HOSTS.includes(url.hostname)) {
    return Response.redirect("https://cploadout.com" + url.pathname + url.search, 302);
  }
  return next();
}
