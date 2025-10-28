import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-medical flex flex-col items-center justify-center p-6">
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
            onClick={() => navigate("/doctor")}
          >
            I am a Doctor
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            className="w-full text-lg h-16 font-bold shadow-lg"
            onClick={() => navigate("/patient-login")}
          >
            I am a Patient
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
