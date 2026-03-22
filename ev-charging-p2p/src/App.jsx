import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useStore } from "./store/useStore";
import ConnectPage from "./pages/ConnectPage";
import RoleSelectPage from "./pages/RoleSelectPage";
import ReceiverDashboard from "./pages/ReceiverDashboard";
import DonorDashboard from "./pages/DonorDashboard";
import Navbar from "./components/Navbar";

function Protected({ children }) {
  const isConnected = useStore((s) => s.isConnected);
  if (!isConnected) return <Navigate to="/" replace />;
  return children;
}

function RequireReceiver({ children }) {
  const role = useStore((s) => s.role);
  if (role !== "receiver") return <Navigate to="/role" replace />;
  return children;
}

function RequireDonor({ children }) {
  const role = useStore((s) => s.role);
  if (role !== "donor") return <Navigate to="/role" replace />;
  return children;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConnectPage />} />
        <Route
          path="/role"
          element={
            <Protected>
              <RoleSelectPage />
            </Protected>
          }
        />
        <Route
          path="/receiver"
          element={
            <Protected>
              <RequireReceiver>
                <Shell>
                  <ReceiverDashboard />
                </Shell>
              </RequireReceiver>
            </Protected>
          }
        />
        <Route
          path="/donor"
          element={
            <Protected>
              <RequireDonor>
                <Shell>
                  <DonorDashboard />
                </Shell>
              </RequireDonor>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
