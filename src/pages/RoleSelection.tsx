import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

const RoleSelection = () => {
  const navigate = useNavigate();
  const { user, role, setUserRole } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleRoleSelect = async (selectedRole: string) => {
    await setUserRole(selectedRole);
  };

  return (
    <div className="min-h-screen bg-gradient-medical flex flex-col items-center justify-center p-6">
      <div className="absolute top-6 left-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-8 text-center animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Who are you today?
          </h1>
          <p className="text-xl text-white/90">
            Your journey starts here.
          </p>
        </div>

        <div className="space-y-4 pt-8">
          <Button
            variant="secondary"
            size="lg"
            className="w-full text-lg h-16 font-bold shadow-lg"
            onClick={() => handleRoleSelect("doctor")}
          >
            I am a Doctor
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            className="w-full text-lg h-16 font-bold shadow-lg"
            onClick={() => handleRoleSelect("patient")}
          >
            I am a Patient
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
