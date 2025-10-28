import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: string;
}

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>(() => {
    const stored = localStorage.getItem("patients");
    return stored ? JSON.parse(stored) : [];
  });
  
  const [formData, setFormData] = useState({
    patientId: "",
    name: "",
    age: "",
  });

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.name || !formData.age) {
      toast.error("Please fill in all fields");
      return;
    }

    const newPatient: Patient = {
      id: Date.now().toString(),
      ...formData,
    };

    const updatedPatients = [...patients, newPatient];
    setPatients(updatedPatients);
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    
    setFormData({ patientId: "", name: "", age: "" });
    toast.success("Patient added successfully!");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Add a New Patient</h1>
          
          <form onSubmit={handleAddPatient} className="space-y-4">
            <Input
              type="text"
              placeholder="Patient ID"
              className="h-14 text-base rounded-xl border-2"
              value={formData.patientId}
              onChange={(e) =>
                setFormData({ ...formData, patientId: e.target.value })
              }
            />
            
            <Input
              type="text"
              placeholder="Name"
              className="h-14 text-base rounded-xl border-2"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            
            <Input
              type="number"
              placeholder="Age"
              className="h-14 text-base rounded-xl border-2"
              value={formData.age}
              onChange={(e) =>
                setFormData({ ...formData, age: e.target.value })
              }
            />
            
            <Button
              type="submit"
              variant="success"
              size="lg"
              className="w-full text-lg font-bold"
            >
              Add Patient
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Past Patients</h2>
          
          <div className="space-y-3">
            {patients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No patients added yet
              </p>
            ) : (
              patients.map((patient) => (
                <Card
                  key={patient.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/patient/${patient.patientId}`)}
                >
                  <p className="font-semibold text-lg">
                    Patient Id: {patient.patientId}
                  </p>
                  <p className="text-muted-foreground text-base uppercase">
                    {patient.name}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
