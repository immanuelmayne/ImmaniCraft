# Mini Block Sandbox (CodePen-friendly)

A tiny Minecraft-like prototype you can run in CodePen with no build tools.

## Use in CodePen

1. Create a new Pen.
2. Copy `index.html` into the HTML panel.
3. Copy `style.css` into the CSS panel.
4. Copy `script.js` into the JS panel.
5. Run and play.

## Controls

- `A` / `D` or `←` / `→`: Move left / right
- `W`, `Space`, or `↑`: Jump
- `Shift`: Run
- Left click: Break block
- Right click: Place selected block
- `1`-`4`: Change block type

## Can I deploy directly from Git to CodePen?

Short answer: **not as a standard "auto-deploy this repo to this Pen" workflow**.

### What works instead

1. **Manual sync (most common)**
   - Keep source in GitHub.
   - Paste/update HTML/CSS/JS in CodePen when you want to demo.

2. **Reference Git-hosted assets from CodePen**
   - Put your JS/CSS in GitHub.
   - In CodePen, add external URLs that point to your files via a CDN such as jsDelivr, for example:
     - `https://cdn.jsdelivr.net/gh/<user>/<repo>@main/style.css`
     - `https://cdn.jsdelivr.net/gh/<user>/<repo>@main/script.js`
   - Then CodePen acts mostly as a preview shell while Git remains your source of truth.

3. **Use a real deploy target for continuous delivery**
   - If you want push-to-deploy, use GitHub Pages, Netlify, or Vercel.
   - Keep CodePen for experiments/prototypes rather than production deployment.

## Notes

This is intentionally simple: one biome, no crafting, no inventory, and no chunk streaming.
