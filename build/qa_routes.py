import sys, json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8765"
ROUTES = [
    "home", "posts", "carousels", "articles", "news", "comments", "comment-tool",
    "calendar", "campaigns", "live", "ideas", "production", "reviews", "search", "guide", "governance"
]

def main():
    errors_by_route = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        console_errors = []
        def on_console(msg):
            if msg.type != "error":
                return
            # Sandbox egress proxy blocks Google Fonts (org policy in this dev
            # container only) -- not a real app bug, filter it out of QA.
            if "fonts.g" in msg.text or "ERR_TUNNEL_CONNECTION_FAILED" in msg.text:
                return
            console_errors.append((msg.type, msg.text))
        page.on("console", on_console)
        page.on("pageerror", lambda exc: console_errors.append(("pageerror", str(exc))))

        for route in ROUTES:
            console_errors.clear()
            resp = page.goto(f"{BASE}/index.html#/{route}", wait_until="networkidle")
            page.wait_for_timeout(300)
            status = resp.status if resp else None
            body_text_len = len(page.inner_text("#view-root"))
            errors_by_route[route] = {
                "http_status": status,
                "console_errors": list(console_errors),
                "view_root_chars": body_text_len
            }
        browser.close()
    print(json.dumps(errors_by_route, indent=2, ensure_ascii=False))
    any_err = any(v["console_errors"] for v in errors_by_route.values())
    any_empty = any(v["view_root_chars"] < 20 for v in errors_by_route.values())
    if any_err or any_empty:
        sys.exit(1)

if __name__ == "__main__":
    main()
