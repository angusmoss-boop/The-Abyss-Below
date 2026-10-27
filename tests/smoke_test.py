"""Optional browser smoke tests for The Abyss Below.

Install: pip install playwright && python -m playwright install chromium
Run from project root: python tests/smoke_test.py

Uses in-memory HTML loading to test without a web server.
"""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def open_game(browser, width, height):
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content((ROOT / "index.html").read_text(encoding="utf-8"))
    page.add_style_tag(content=(ROOT / "styles.css").read_text(encoding="utf-8"))
    page.add_script_tag(content=(ROOT / "game.js").read_text(encoding="utf-8"))
    return page, errors


def run():
    with sync_playwright() as playwright:
        system_chromium = shutil.which("chromium") or shutil.which("google-chrome")
        browser = playwright.chromium.launch(headless=True, executable_path=system_chromium)
        desktop, errors = open_game(browser, 1440, 900)
        assert desktop.title().startswith("The Abyss Below")
        assert desktop.locator("#menuOverlay").is_visible()
        desktop.locator("#startBtn").click()
        initial = desktop.evaluate("AbyssDiagnostics.state()")
        assert initial["running"] is True and initial["secured"] == 0
        assert initial["predators"] >= 8 and initial["items"] > 30

        # Verify banking/upgrade station can be entered and exited.
        desktop.keyboard.press("e")
        assert desktop.locator("#modalTitle").inner_text() == "SUBMARINE UPGRADES"
        assert desktop.locator("[data-upgrade]").count() == 6
        desktop.locator("#launchAgain").click()
        assert desktop.locator("#modalOverlay").is_hidden()

        desktop.keyboard.down("s")
        desktop.wait_for_timeout(450)
        desktop.keyboard.up("s")
        moved = desktop.evaluate("AbyssDiagnostics.state()")
        assert moved["depth"] > initial["depth"], (initial, moved)
        desktop.keyboard.press("q")
        scanned = desktop.evaluate("AbyssDiagnostics.state()")
        assert scanned["battery"] <= moved["battery"] - 10
        desktop.locator("#helpBtn").click()
        assert desktop.locator("#modalTitle").inner_text() == "PILOT BRIEFING"
        desktop.locator("#modalClose").click()
        assert not errors, f"Desktop JS errors: {errors}"
        desktop.close()

        mobile, errors = open_game(browser, 390, 844)
        mobile.locator("#startBtn").click()
        assert mobile.locator(".mobile-controls").is_visible()
        mobile.locator("#mobileSilent").click()
        assert "active" in (mobile.locator("#mobileSilent").get_attribute("class") or "")
        mobile.locator("#mobileLights").click()
        assert mobile.locator("#mobileLights").inner_text() == "LIGHTS OFF"
        mobile.locator("#mobileSonar").click()
        assert mobile.evaluate("AbyssDiagnostics.state().battery") < 100
        assert not errors, f"Mobile JS errors: {errors}"
        mobile.close()
        browser.close()
    print("PASS: desktop controls, station, sonar, movement, help, and mobile touch controls")


if __name__ == "__main__":
    run()
