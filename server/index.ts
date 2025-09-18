import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { bridgeMonitor } from "./services/bridge-monitor";
import { errorHandler, notFoundHandler } from "./middleware/validation";

// Development authentication bypass (commented out after successful testing)
// Enable only when needed for debugging authentication issues
// if (process.env.NODE_ENV === 'development') {
//   process.env.DEV_AUTH_BYPASS = 'true';
//   console.log('Development authentication bypass enabled for admin testing');
// }

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Start bridge monitoring service
  try {
    await bridgeMonitor.startMonitoring();
    log("Bridge monitoring service started successfully");
  } catch (error) {
    log("Failed to start bridge monitoring service:", error instanceof Error ? error.message : String(error));
  }

  // Use comprehensive error handling middleware
  app.use(errorHandler);

  // Handle 404 errors for unmatched API routes before serving static files
  app.use('/api/*', notFoundHandler);
  
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = () => {
    log('Shutting down gracefully...');
    bridgeMonitor.stopMonitoring();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
})();
