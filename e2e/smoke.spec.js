import { test, expect } from "@playwright/test";

// Smoke: cada tela PÚBLICA deve carregar sem o ErrorBoundary ("Algo deu errado").
// Não exige login nem dados — valida que a render não quebra (classe do crash #310).
const ERROR_BOUNDARY = "Algo deu errado";

async function assertNoCrash(page) {
  await expect(page.getByText(ERROR_BOUNDARY)).toHaveCount(0);
}

test("landing (/) carrega", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("VELOX").first()).toBeVisible();
  await assertNoCrash(page);
});

test("login (/login) carrega", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();
  await assertNoCrash(page);
});

test("rastreamento (/rastrear) carrega", async ({ page }) => {
  await page.goto("/rastrear");
  await expect(page.getByRole("button").first()).toBeVisible();
  await assertNoCrash(page);
});

test("agendar (/agendar) carrega", async ({ page }) => {
  await page.goto("/agendar");
  await assertNoCrash(page);
  await expect(page.locator("body")).toBeVisible();
});

test("cadastro de cliente (/portal/cadastro) carrega", async ({ page }) => {
  await page.goto("/portal/cadastro");
  await expect(page.getByText(/Portal do Cliente/i).first()).toBeVisible();
  await assertNoCrash(page);
});
