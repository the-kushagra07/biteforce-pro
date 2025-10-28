import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const PatientLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patientId: "",
    name: "",
    age: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.name || !formData.age) {
      toast.error("Please fill in all fields");
      return;
    }

    // Store patient data temporarily (in real app, this would verify against backend)
    localStorage.setItem("currentPatient", JSON.stringify(formData));
    toast.success("Login successful!");
    navigate(`/patient/${formData.patientId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Login</h1>
          <p className="text-muted-foreground text-lg">
            Enter your details to log in
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="patientId" className="text-base">
              Patient ID
            </Label>
            <Input
              id="patientId"
              type="text"
              placeholder="100"
              className="h-14 text-base rounded-xl border-2"
              value={formData.patientId}
              onChange={(e) =>
                setFormData({ ...formData, patientId: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-base">
              Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Kush"
              className="h-14 text-base rounded-xl border-2"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age" className="text-base">
              Age
            </Label>
            <Input
              id="age"
              type="number"
              placeholder="21"
              className="h-14 text-base rounded-xl border-2"
              value={formData.age}
              onChange={(e) =>
                setFormData({ ...formData, age: e.target.value })
              }
            />
          </div>

          <Button
            type="submit"
            variant="medical"
            size="lg"
            className="w-full text-lg font-bold"
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PatientLogin;
