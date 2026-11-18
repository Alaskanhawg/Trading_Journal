# Trading Journal

A static journal for sharing WealthCharts screenshots and trade reflections. The first entry and its chart use fictional data.

## Add a trade

1. Save a WealthCharts screenshot under `screenshots/`. Crop out account numbers and other details you want to keep private.
2. In `index.html`, copy the `<article class="trade">` section and paste it above the latest trade. Replace the sample entry when you add your first real trade.
3. Update the date in both places, the contract, the setup, and the notes. Point both the image and its link to the new screenshot. Update the image description and dimensions to match the screenshot.
4. Save and commit the changes along with the new screenshot.

## Run locally

From the repository, run `python3 -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/`.

## Publish to GitHub Pages

After pushing the site to `main`, open the repository on GitHub and go to **Settings → Pages**. Select **Deploy from a branch**, then select **main** and **/ (root)** and save. Once the deployment finishes, copy the site URL from that page. GitHub Pages access depends on your repository and plan. Treat the published site and everything committed to a public repository as publicly accessible.
