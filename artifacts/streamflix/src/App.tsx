import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import ItemDetail from "./pages/ItemDetail";
import GenrePage from "./pages/GenrePage";
import Watchlist from "./pages/Watchlist";
import History from "./pages/History";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    },
  },
});

// Attach JWT token to fetch requests
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem("streamflix_token");
  if (token) {
    init = init || {};
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    init.headers = headers;
  }
  return originalFetch(input, init);
};

function ProtectedRoute({
  component: Component,
  adminOnly = false,
  isOnboarding = false,
}: {
  component: React.ComponentType<any>;
  adminOnly?: boolean;
  isOnboarding?: boolean;
}) {
  const { data: user, isLoading, isError } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !user) {
    return <Redirect to="/login" />;
  }

  if (!isOnboarding && !user.hasOnboarded) {
    return <Redirect to="/onboarding" />;
  }

  if (isOnboarding && user.hasOnboarded) {
    return <Redirect to="/" />;
  }

  if (adminOnly && !user.isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <h1 className="text-4xl font-bold">Access Denied</h1>
          <p className="text-zinc-400">You do not have administrator permissions to view this page.</p>
        </div>
      </Layout>
    );
  }

  if (isOnboarding) {
    return <Component />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/onboarding">
        {() => <ProtectedRoute component={Onboarding} isOnboarding={true} />}
      </Route>

      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/search">
        {() => <ProtectedRoute component={Search} />}
      </Route>
      <Route path="/genres/:genre">
        {() => <ProtectedRoute component={GenrePage} />}
      </Route>
      <Route path="/genres">
        {() => <Redirect to="/genres/Action" />}
      </Route>
      <Route path="/item/:id">
        {() => <ProtectedRoute component={ItemDetail} />}
      </Route>
      <Route path="/watchlist">
        {() => <ProtectedRoute component={Watchlist} />}
      </Route>
      <Route path="/history">
        {() => <ProtectedRoute component={History} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} adminOnly={true} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
