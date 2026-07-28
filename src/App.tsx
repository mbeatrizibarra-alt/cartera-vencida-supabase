import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClientsList from "./pages/ClientsList";
import ClientNew from "./pages/ClientNew";
import ClientDetail from "./pages/ClientDetail";
import TeamPerformance from "./pages/TeamPerformance";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<ClientsList />} />
            <Route path="/clients/new" element={<ClientNew />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/team" element={<TeamPerformance />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
