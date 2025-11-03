import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings, FileText, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PatientData {
  id: string;
  patient_id: string;
  name: string;
  age: number;
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

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkFormData, setLinkFormData] = useState({ patientId: "", name: "" });
  const [linking, setLinking] = useState(false);

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
      } else {
        // No patient record linked to this user account
        setShowLinkForm(true);
      }
    } catch (error: any) {
      toast.error(`Error loading patient data (Code: ${error.code || 'UNKNOWN'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);

    try {
      // Find patient record by patient_id and name
      const { data: patient, error: findError } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_id", linkFormData.patientId)
        .eq("name", linkFormData.name)
        .maybeSingle();

      if (findError) throw findError;

      if (!patient) {
        toast.error("No patient record found with this ID and name. Please check your details.");
        return;
      }

      if (patient.user_id) {
        toast.error("This patient record is already linked to another account.");
        return;
      }

      // Link the patient record to current user
      const { error: updateError } = await supabase
        .from("patients")
        .update({ user_id: user?.id })
        .eq("id", patient.id);

      if (updateError) throw updateError;

      toast.success("Account linked successfully!");
      setShowLinkForm(false);
      fetchPatientData();
    } catch (error: any) {
      toast.error(`Error linking account: ${error.message}`);
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (showLinkForm) {
    return (
      <div className="min-h-screen bg-gradient-medical flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8">
          <h2 className="text-2xl font-bold mb-4">Link Your Patient Account</h2>
          <p className="text-muted-foreground mb-6">
            Enter your Patient ID and name provided by your doctor to access your dashboard.
          </p>
          <form onSubmit={handleLinkAccount} className="space-y-4">
            <div>
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                type="text"
                value={linkFormData.patientId}
                onChange={(e) => setLinkFormData({ ...linkFormData, patientId: e.target.value })}
                required
                placeholder="Enter your patient ID"
              />
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={linkFormData.name}
                onChange={(e) => setLinkFormData({ ...linkFormData, name: e.target.value })}
                required
                placeholder="Enter your full name"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={linking}>
                {linking ? "Linking..." : "Link Account"}
              </Button>
              <Button type="button" variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </form>
        </Card>
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
            <p className="text-lg mt-2">Welcome, {patientData.name}</p>
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

        {/* Measurements */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Measurements</h2>
          {patientData.measurements && patientData.measurements.length > 0 ? (
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
