#!/usr/bin/env node
// Post-deploy smoke test for sLocal niche sites.
// Usage: node smoke-test.mjs <baseUrl>
// Verifies: homepage 200, sitemap-index reachable, robots.txt reachable,
// and the contact API returns 400 without required fields.

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error("Usage: node smoke-test.mjs <baseUrl>");
  process.exit(1);
}

const BASE = baseUrl.replace(/\/$/, "");
const failures = [];

async function check(label, fn) {
  try {
    const ok = await fn();
    if (ok) {
      console.log(`✅ ${label}`);
    } else {
      failures.push(label);
      console.log(`❌ ${label}`);
    }
  } catch (err) {
    failures.push(label);
    console.log(`❌ ${label}: ${err.message}`);
  }
}

async function main() {
  console.log(`\n🏥 Smoke test — ${BASE}\n`);

  await check("homepage returns 200", async () => {
    const res = await fetch(`${BASE}/`);
    return res.ok;
  });

  await check("sitemap-index.xml reachable", async () => {
    const res = await fetch(`${BASE}/sitemap-index.xml`);
    return res.ok && (await res.text()).includes("<sitemapindex");
  });

  await check("robots.txt reachable", async () => {
    const res = await fetch(`${BASE}/robots.txt`);
    return res.ok && (await res.text()).includes("sitemap");
  });

  await check("contact API rejects empty payload (400)", async () => {
    const res = await fetch(`${BASE}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", phone: "", email: "" }),
    });
    return res.status === 400;
  });

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} check(s) failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("\n✅ All smoke checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
