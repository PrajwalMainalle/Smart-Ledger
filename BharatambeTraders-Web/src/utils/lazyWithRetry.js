import { lazy } from "react";

/**
 * Enhanced React.lazy wrapper that handles dynamic import failures.
 * When a new deployment on Vercel changes bundle chunk hashes,
 * cached clients fetching old JS chunk files get a "Failed to fetch dynamically imported module" error.
 * This helper catches that error and automatically reloads the page to fetch the latest Vercel bundle manifest.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem("page_chunk_reloaded");

    try {
      const component = await componentImport();
      sessionStorage.removeItem("page_chunk_reloaded");
      return component;
    } catch (error) {
      console.warn("Dynamic import failed (likely new deployment bundle update). Retrying page load...", error);
      if (!pageHasBeenReloaded) {
        sessionStorage.setItem("page_chunk_reloaded", "true");
        window.location.reload();
        return new Promise(() => {}); // Pause until page reloads
      }
      throw error;
    }
  });

export default lazyWithRetry;
