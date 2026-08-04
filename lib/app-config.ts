export const appConfig = {
    /**
     * The public-facing name of the application.
     * Used in metadata, headers, homepage and unauthorized pages.
     */
    appName: "Template App",
  
    /**
     * The email address for the team responsible for this specific app.
     * Used in error boundaries and unauthorized access pages.
     */
    supportEmail: "placeholder@papernest.com",
  
    /**
     * The specific department or team owning this tool.
     */
    ownerTeam: "Placeholder",
    /**
     * The URL for the company logo. 
     * Centralizes the CDN link currently hardcoded in top-nav.tsx.
     */
    logoUrl: "/logo.svg",
  } as const;