import sys, json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8765"

def collect_console(page, errs):
    def on_console(msg):
        if msg.type != "error":
            return
        if "fonts.g" in msg.text or "ERR_TUNNEL_CONNECTION_FAILED" in msg.text:
            return
        errs.append((msg.type, msg.text))
    page.on("console", on_console)
    page.on("pageerror", lambda exc: errs.append(("pageerror", str(exc))))

def main():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errs = []
        collect_console(page, errs)

        # 1) Posts drawer: open a Post record, exercise copy / tone-check / cover actions
        page.goto(f"{BASE}/index.html#/posts", wait_until="networkidle")
        page.wait_for_timeout(300)
        page.click(".card[data-open-record]")
        page.wait_for_selector("#drawer.open", timeout=3000)
        page.wait_for_timeout(200)
        has_copy_btn = page.locator('[data-act="copy"]').count() > 0
        has_tone_btn = page.locator('[data-act="tone"]').count() > 0
        has_cover_btn = page.locator('[data-act="cover"]').count() > 0
        if has_tone_btn:
            page.click('[data-act="tone"]')
            page.wait_for_timeout(200)
        tone_out_html = page.locator("#toneOut").inner_html() if page.locator("#toneOut").count() else ""
        results["posts_drawer"] = {
            "copy_btn": has_copy_btn, "tone_btn": has_tone_btn, "cover_btn": has_cover_btn,
            "tone_out_nonempty": len(tone_out_html.strip()) > 0
        }
        # Escape should close drawer
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
        results["posts_drawer"]["closed_on_escape"] = "open" not in (page.get_attribute("#drawer", "class") or "")

        # 2) Navigate away -- drawer/scrim must not persist across routes
        page.click(".card[data-open-record]")
        page.wait_for_selector("#drawer.open", timeout=3000)
        page.goto(f"{BASE}/index.html#/calendar", wait_until="networkidle")
        page.wait_for_timeout(300)
        results["drawer_closes_on_nav"] = "open" not in (page.get_attribute("#drawer", "class") or "")

        # 3) Comment tool interactive flow
        page.goto(f"{BASE}/index.html#/comment-tool", wait_until="networkidle")
        page.wait_for_timeout(300)
        # find a select or textarea to pick a record / theme, then click "Analisar"
        analyze_btn = page.locator("button:has-text('Analisar')")
        results["comment_tool_has_analyze_btn"] = analyze_btn.count() > 0
        if analyze_btn.count() > 0:
            # try selecting first option in any select present
            selects = page.locator("select")
            if selects.count() > 0:
                try:
                    selects.first.select_option(index=1)
                except Exception:
                    pass
            textareas = page.locator("textarea")
            if textareas.count() > 0:
                textareas.first.fill("Concordo totalmente, ótimo ponto sobre governança e accountability.")
            analyze_btn.first.click()
            page.wait_for_timeout(300)
            body_len = len(page.inner_text("#view-root"))
            results["comment_tool_after_analyze_chars"] = body_len

        # 4) Search flow
        page.goto(f"{BASE}/index.html#/search", wait_until="networkidle")
        page.wait_for_timeout(300)
        search_input = page.locator("input[type='text'], input[type='search']")
        if search_input.count() > 0:
            search_input.first.fill("Superando Obstáculos")
            page.wait_for_timeout(300)
            results["search_results_chars"] = len(page.inner_text("#view-root"))

        # 5) Library filter flow (Posts page toolbar)
        page.goto(f"{BASE}/index.html#/posts", wait_until="networkidle")
        page.wait_for_timeout(300)
        q = page.locator("#libSearch")
        if q.count() > 0:
            q.fill("backlog")
            page.wait_for_timeout(200)
            results["library_filter_grid_chars"] = len(page.inner_text("#libGrid"))

        results["console_errors"] = list(errs)
        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))
    if results["console_errors"]:
        sys.exit(1)

if __name__ == "__main__":
    main()
