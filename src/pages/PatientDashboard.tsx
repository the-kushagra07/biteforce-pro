import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings, FileText, Calendar, Activity, User } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PatientData {
  id: string;
  patient_id: string;
  name: string;
  age: number;
  email?: string;
  date_of_birth?: string;
  phone?: string;
  measurements: any[];
  appointments: any[];
}

interface MeasurementData {
  id: string;
  incisors: string | null;
  unilateral_left: string | null;
  unilateral_right: string | null;
  bilateral_left: string | null;
  bilateral_right: string | null;
  notes: string | null;
  created_at: string;
}

interface TherapyPlan {
  id: string;
  goal_force: string;
  reps_per_session: number;
  sessions_per_day: number;
  instructions: string;
  updated_at: string;
}

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [therapyPlan, setTherapyPlan] = useState<TherapyPlan | null>(null);
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

        // Fetch therapy plan
        const { data: planData } = await supabase
          .from("therapy_plans")
          .select("*")
          .eq("patient_id", patient.id)
          .maybeSingle();

        if (planData) {
          setTherapyPlan(planData);
        }
      } else {
        toast.error("No patient record found. Please contact your doctor to set up your account.");
      }
    } catch (error: any) {
      toast.error(`Error loading patient data (Code: ${error.code || 'UNKNOWN'})`);
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


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-medical px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white">
          <div>
            <h1 className="text-3xl font-bold">Patient Dashboard</h1>
            <p className="text-lg mt-2">
              Welcome, {patientData?.name?.split(' ')[0] || patientData?.name}!
            </p>
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
        {/* Patient Profile Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">My Profile</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Full Name</p>
              <p className="font-medium">{patientData?.name || "Not available"}</p>
            </div>
            {patientData?.email && (
              <div className="space-y-1">
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{patientData.email}</p>
              </div>
            )}
            {patientData?.date_of_birth && (
              <div className="space-y-1">
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {new Date(patientData.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-muted-foreground">Age</p>
              <p className="font-medium">
                {patientData?.date_of_birth 
                  ? Math.floor((new Date().getTime() - new Date(patientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                  : patientData?.age || "Not available"}
              </p>
            </div>
            {patientData?.phone && (
              <div className="space-y-1">
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{patientData.phone}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-muted-foreground">Patient ID</p>
              <p className="font-medium">{patientData?.patient_id}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            This information is managed by your doctor. Contact your doctor to update any details.
          </p>
        </Card>

        {/* Today's Plan */}
        {therapyPlan && (
          <Card className="p-6 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Today's Plan</h2>
              <span className="text-sm text-muted-foreground">
                Updated: {new Date(therapyPlan.updated_at).toLocaleDateString()}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Goal Force</p>
                <p className="text-2xl font-bold">{therapyPlan.goal_force || "Not set"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reps per Session</p>
                <p className="text-2xl font-bold">{therapyPlan.reps_per_session || "Not set"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sessions per Day</p>
                <p className="text-2xl font-bold">{therapyPlan.sessions_per_day || "Not set"}</p>
              </div>
            </div>
            {therapyPlan.instructions && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Instructions from your doctor:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{therapyPlan.instructions}</p>
              </div>
            )}
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Measurements</p>
            </div>
            <p className="text-3xl font-bold">{patientData?.measurements?.length || 0}</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Appointments</p>
            </div>
            <p className="text-3xl font-bold">{patientData?.appointments?.length || 0}</p>
          </Card>
        </div>

        {/* Measurements */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Measurements</h2>
          {patientData?.measurements && patientData.measurements.length > 0 ? (
            <div className="space-y-4">
              {patientData.measurements.map((m: MeasurementData) => (
                <div key={m.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <p className="font-semibold text-lg">Measurement Record</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()} at {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {m.incisors && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Incisors</p>
                        <p className="text-lg font-semibold">{m.incisors}</p>
                      </div>
                    )}
                    {m.unilateral_left && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Unilateral Left</p>
                        <p className="text-lg font-semibold">{m.unilateral_left}</p>
                      </div>
                    )}
                    {m.unilateral_right && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Unilateral Right</p>
                        <p className="text-lg font-semibold">{m.unilateral_right}</p>
                      </div>
                    )}
                    {m.bilateral_left && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Bilateral Left</p>
                        <p className="text-lg font-semibold">{m.bilateral_left}</p>
                      </div>
                    )}
                    {m.bilateral_right && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Bilateral Right</p>
                        <p className="text-lg font-semibold">{m.bilateral_right}</p>
                      </div>
                    )}
                  </div>
                  
                  {m.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{m.notes}</p>
                    </div>
                  )}
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
