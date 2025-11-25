import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AboutModalProvider, useAboutModal } from "@/context/AboutModalContext";
import { ScanProvider } from "@/context/ScanContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import VerifyOTP from "@/pages/VerifyOTP";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Calibration from "@/pages/Calibration";
import Dashboard from "@/pages/Dashboard";
import FoodLog from "@/pages/FoodLog";
import Community from "@/pages/Community";
import Appointments from "@/pages/Appointments";
import Friends from "@/pages/Friends";
import Reports from "@/pages/Reports";
import AboutModal from "@/components/AboutModal";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isAboutModalOpen, closeAboutModal } = useAboutModal();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nutricare-green/10 via-white to-nutricare-light/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/register" component={Register} />
            <Route path="/login" component={Login} />
            <Route path="/verify-otp" component={VerifyOTP} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            <Route path="/calibration" component={Calibration} />
          </>
        ) : (
          <>
            <Route path="/" component={Dashboard} />
            <Route path="/food-log" component={FoodLog} />
            <Route path="/community" component={Community} />
            <Route path="/appointments" component={Appointments} />
            <Route path="/friends" component={Friends} />
            <Route path="/reports" component={Reports} />
            <Route path="/calibration" component={Calibration} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      
      {/* Global About Modal */}
      <AboutModal 
        isOpen={isAboutModalOpen} 
        onClose={closeAboutModal} 
      />
    </>
  );
}

function Router() {
  return (
    <AboutModalProvider>
      <AppContent />
    </AboutModalProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ScanProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ScanProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
