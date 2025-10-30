import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings, Plus, Users, Calendar, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || role !== "doctor") {
      navigate("/");
      return;
    }
    fetchPatients();
  }, [user, role]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*, measurements(count)")
        .eq("doctor_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setPatients(data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from("patients").insert([
        {
          doctor_id: user?.id,
          patient_id: patientId,
          name,
          age: parseInt(age),
        },
      ]);

      if (error) throw error;
      
      toast.success("Patient added successfully!");
      setPatientId("");
      setName("");
      setAge("");
      setShowAddPatient(false);
      fetchPatients();
    } catch (error: any) {
      toast.error(error.message || "Failed to add patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-medical px-6 py-8 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white animate-fade-in">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
              <p className="text-lg mt-2">Manage your patients</p>
            </div>
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
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" variant="medical" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Patient"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddPatient(false)}
                  className="flex-1"
                  disabled={submitting}
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
            {loading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                </Card>
              ))
            ) : patients.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">No patients yet</p>
                <p className="text-sm text-muted-foreground">Add your first patient to get started</p>
              </Card>
            ) : (
              patients.map((patient) => (
                <Card
                  key={patient.id}
                  className="p-6 cursor-pointer hover-lift"
                  onClick={() => navigate(`/patient/${patient.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-lg">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ID: {patient.patient_id} • Age: {patient.age}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
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
