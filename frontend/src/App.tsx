import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { ReportForm } from "./pages/report/ReportForm";
import { ReportProcessing } from "./pages/report/ReportProcessing";
import { ReportSuccess } from "./pages/report/ReportSuccess";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { IssueDetail } from "./pages/dashboard/IssueDetail";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/report" element={<ReportForm />} />
      <Route path="/report/processing" element={<ReportProcessing />} />
      <Route path="/report/success/:id" element={<ReportSuccess />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/issues/:id" element={<IssueDetail />} />
    </Routes>
  );
}

export default App;
