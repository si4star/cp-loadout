// functions/api/config.js — public: lets the front-end fetch the publishable
// key from the server instead of hardcoding it. Optional.
// To use it, set STRIPE_PUBLISHABLE_KEY as an env var and have index.html
// fetch("/api/config") on load instead of the hardcoded CONFIG value.
import { json } from "./_lib.js";

export async function onRequestGet({ env }) {
  return json({ publishableKey: env.STRIPE_PUBLISHABLE_KEY || "" });
}
