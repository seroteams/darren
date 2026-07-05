// Ambient declaration so TypeScript accepts side-effect CSS imports from stage modules
// (e.g. `import "../styles/error-log.css"`). Vite handles the actual bundling.
declare module "*.css";
