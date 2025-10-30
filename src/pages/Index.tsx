import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user && role) {
        navigate(role === "doctor" ? "/doctor" : "/patient-dashboard");
      } else if (user && !role) {
        navigate("/role-selection");
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin">
          <Activity className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-medical flex items-center justify-center p-4">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="max-w-4xl w-full text-center space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            BiteForce
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            Professional Dental Bite Force Monitoring System
          </p>
        </div>

        <div className="space-y-4">
          <Button
            variant="secondary"
            size="lg"
            className="text-lg px-8 h-14"
            onClick={() => navigate("/auth")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
