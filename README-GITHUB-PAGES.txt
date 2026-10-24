CSI XENIA — GitHub Pages deployment

Repository: https://github.com/harshvardhanraut2912/CSI-dragon
Expected site: https://harshvardhanraut2912.github.io/CSI-dragon/

This project is configured for Vite + GitHub Actions deployment.
- vite.config.js sets the project base path to /CSI-dragon/
- .github/workflows/deploy.yml builds the project and deploys dist/ to GitHub Pages
- .gitignore excludes node_modules, .git, environment files, and build outputs

After extracting this project, open a terminal in the project root and run:
  npm ci
  npm run build

Then initialize Git and push using the steps supplied separately.
