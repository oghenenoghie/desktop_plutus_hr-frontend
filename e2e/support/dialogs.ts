import { expect, test, type Locator, type Page } from "@playwright/test";

// What every <Modal> must do, wherever it's opened from: open centred as a
// labelled dialog with the cursor in its first field, survive clicks inside
// and text selections dragged out onto the backdrop, keep Tab inside, and
// close on Escape — closing only itself when it sits on top of a drawer.
// Checks after "opens" are soft, so one run reports every broken behaviour.
export async function expectModalContract(
  page: Page,
  {
    open,
    name,
    parent,
  }: {
    open: () => Promise<void>;
    name: string;
    // The drawer the modal was opened from, which must outlive it.
    parent?: Locator;
  },
): Promise<Locator> {
  const modal = page.getByRole("dialog", { name, exact: true });
  const ensureOpen = async () => {
    if (!(await modal.isVisible())) await open();
    await expect(modal).toBeVisible();
  };

  await test.step("opens as a centred, labelled modal dialog", async () => {
    await open();
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("aria-modal", "true");
    const box = (await modal.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(4);
    if (box.height < viewport.height * 0.85) {
      expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(4);
    }
  });

  await test.step("puts the cursor in the first field, not on the close button", async () => {
    await expect.soft(modal.locator("input").first()).toBeFocused();
  });

  await test.step("a click inside does not close it", async () => {
    await modal.getByRole("heading", { name }).click();
    await expect.soft(modal).toBeVisible();
    if (parent) await expect.soft(parent).toBeVisible();
  });

  await test.step("a press in a field released on the backdrop does not close it", async () => {
    const field = modal.locator("input").first();
    await field.fill("Drag test");
    const box = (await field.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(5, 5, { steps: 5 });
    await page.mouse.up();
    await expect.soft(modal).toBeVisible();
  });

  await test.step("Tab and Shift+Tab stay inside it", async () => {
    await ensureOpen();
    await modal.getByRole("button").last().focus();
    await page.keyboard.press("Tab");
    expect.soft(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await modal.locator("input").first().focus();
    await page.keyboard.press("Shift+Tab");
    expect.soft(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  });

  await test.step(parent ? "Escape closes it and leaves the drawer open" : "Escape closes it", async () => {
    await modal.locator("input").first().focus();
    await page.keyboard.press("Escape");
    await expect.soft(modal).toBeHidden();
    if (parent) await expect.soft(parent).toBeVisible();
  });

  return modal;
}

// Fails the test on any uncaught error or console error from the app — a
// React warning, a hydration mismatch, a crash in an effect.
export function trackPageErrors(page: Page): { expectNone: () => void } {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/Failed to load resource|favicon/.test(text)) return;
    errors.push(`console: ${text.slice(0, 300)}`);
  });
  return { expectNone: () => expect(errors).toEqual([]) };
}

// Whether the element at the centre of `locator` is really on top there, or
// covered by something (an overlay's backdrop).
export async function isOnTop(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  if (!box) return false;
  return locator.evaluate(
    (element, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return !!hit && (hit === element || element.contains(hit));
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
}
