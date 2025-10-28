import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings, Plus, Users, Calendar } from "lucide-react";
import { toast } from "sonner";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    if (!user || role !== "doctor") {
      navigate("/");
      return;
    }
    fetchPatients();
  }, [user, role]);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("*, measurements(count)")
      .eq("doctor_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) {
      setPatients(data);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("patients").insert([
      {
        doctor_id: user?.id,
        patient_id: patientId,
        name,
        age: parseInt(age),
      },
    ]);

    if (error) {
      toast.error("Error adding patient");
    } else {
      toast.success("Patient added successfully!");
      setPatientId("");
      setName("");
      setAge("");
      setShowAddPatient(false);
      fetchPatients();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-medical px-6 py-8 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
            <p className="text-lg mt-2">Manage your patients</p>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-white hover:bg-white/10"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total Patients</p>
            </div>
            <p className="text-3xl font-bold">{patients.length}</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Appointments</p>
            </div>
            <p className="text-3xl font-bold">-</p>
          </Card>
        </div>

        {/* Add Patient Button */}
        <Button
          variant="medical"
          size="lg"
          className="w-full text-lg font-bold"
          onClick={() => setShowAddPatient(!showAddPatient)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Patient
        </Button>

        {/* Add Patient Form */}
        {showAddPatient && (
          <Card className="p-6 animate-fade-in">
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <Label htmlFor="patientId">Patient ID</Label>
                <Input
                  id="patientId"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Patient name"
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  placeholder="Age"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="medical" className="flex-1">
                  Add Patient
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddPatient(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Patients List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Patients</h2>
          <div className="space-y-3">
            {patients.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No patients yet</p>
              </Card>
            ) : (
              patients.map((patient) => (
                <Card
                  key={patient.id}
                  className="p-6 cursor-pointer hover:shadow-lg transition-all hover-scale"
                  onClick={() => navigate(`/patient/${patient.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ID: {patient.patient_id} • Age: {patient.age}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {patient.measurements?.[0]?.count || 0} measurements
                      </p>
                    </div>
                  </div>
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
