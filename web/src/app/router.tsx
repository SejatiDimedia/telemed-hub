import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { AuthUser } from "../context/auth-context";

export interface RouterContext {
  auth: {
    user: AuthUser | null;
    isAuthenticated: boolean;
  };
}

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // will be injected in React component
  },
  defaultPreload: "intent",
});

// Register router types for type-safe navigation
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
