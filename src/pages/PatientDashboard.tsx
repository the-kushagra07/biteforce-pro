import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings, FileText, Calendar, Activity, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface PatientData {
  id: string;
  patient_id: string;
  name: string;
  age: number;
  measurements: any[];
  appointments: any[];
}

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "patient") {
      navigate("/");
      return;
    }
    fetchPatientData();
  }, [user, role]);

  const fetchPatientData = async () => {
    try {
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("*, measurements(*), appointments(*)")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (patientError) throw patientError;

      if (patient) {
        setPatientData(patient as any);
      }
    } catch (error: any) {
      toast.error("Error loading patient data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">No Patient Record Found</h2>
          <p className="text-muted-foreground">
            Your doctor needs to create a patient record for you.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-medical px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white">
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
              <h1 className="text-3xl font-bold">Patient Dashboard</h1>
              <p className="text-lg mt-2">Welcome, {patientData.name}</p>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Measurements</p>
            </div>
            <p className="text-3xl font-bold">{patientData.measurements?.length || 0}</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Appointments</p>
            </div>
            <p className="text-3xl font-bold">{patientData.appointments?.length || 0}</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Patient ID</p>
            </div>
            <p className="text-2xl font-bold">{patientData.patient_id}</p>
          </Card>
        </div>

        {/* Recent Measurements */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Measurements</h2>
          {patientData.measurements && patientData.measurements.length > 0 ? (
            <div className="space-y-3">
              {patientData.measurements.slice(0, 5).map((m: any) => (
                <div key={m.id} className="p-4 border rounded-lg hover-lift">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="font-medium">Measurement</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()} at {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No measurements recorded yet</p>
              <p className="text-sm text-muted-foreground">Your doctor will add measurements during appointments</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;
