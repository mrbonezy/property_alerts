# Property Alerts Manager

A simple web interface to manage property search alerts for Airbnb listings.

## Features

- Connects directly to Upstash Redis to manage property search alerts
- Save Redis credentials in localStorage for easy access
- View, add, and remove search alerts
- GitHub Pages compatible

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/property_alerts.git
cd property_alerts/website
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Start the development server
```bash
npm run dev
# or
yarn dev
```

4. Open `http://localhost:5173` in your browser

## Deployment to GitHub Pages

1. Update the `vite.config.ts` file to use your repository name:

```ts
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/', // Change to your GitHub repository name
})
```

2. Build the production version:

```bash
npm run build
# or
yarn build
```

3. Deploy to GitHub Pages:

You can use the GitHub Actions workflow included in this repository or manually deploy the `dist` folder to GitHub Pages.

## Configuration

When you first open the application, you'll be prompted to enter your Upstash Redis credentials:

1. Upstash Redis REST URL
2. Upstash Redis REST Token

These credentials will be stored in your browser's localStorage for convenience.

## License

[ISC License](../LICENSE)
