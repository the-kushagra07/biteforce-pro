import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, BarChart3, Calendar, ArrowLeft, Settings, Loader2, Activity, Trash2, Save } from "lucide-react";
import BiteForceMonitor from "@/components/BiteForceMonitor";
import BluetoothBiteForceMonitor from "@/components/BluetoothBiteForceMonitor";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Measurement {
  id: string;
  unilateral_left: string;
  unilateral_right: string;
  bilateral_left: string;
  bilateral_right: string;
  incisors: string;
  created_at: string;
}

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  age: number;
}

const PatientDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showBluetoothMonitor, setShowBluetoothMonitor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [therapyPlan, setTherapyPlan] = useState<any>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    goal_force: "",
    reps_per_day: "",
    hold_time: "",
    instructions: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchPatientData();
  }, [patientId, user]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: measurementsData, error: measurementsError } = await supabase
        .from("measurements")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (measurementsError) throw measurementsError;
      setMeasurements(measurementsData || []);

      // Fetch therapy plan
      const { data: planData } = await supabase
        .from("therapy_plans")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (planData) {
        setTherapyPlan(planData);
        setPlanForm({
          goal_force: planData.goal_force || "",
          reps_per_day: planData.reps_per_day?.toString() || "",
          hold_time: planData.hold_time?.toString() || "",
          instructions: planData.instructions || "",
        });
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to load patient data"} (Code: ${error.code || 'UNKNOWN'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeasurement = async (data: any) => {
    try {
      setSaving(true);
      const { error } = await supabase.from("measurements").insert([
        {
          patient_id: patientId,
          unilateral_left: data.unilateralLeft,
          unilateral_right: data.unilateralRight,
          bilateral_left: data.bilateralLeft,
          bilateral_right: data.bilateralRight,
          incisors: data.incisors,
        },
      ]);
      
      if (error) throw error;
      toast.success("Measurement saved successfully!");
      setShowMonitor(false);
      fetchPatientData();
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to save measurement"} (Code: ${error.code || 'UNKNOWN'})`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeasurement = async (measurementId: string) => {
    try {
      const { error } = await supabase
        .from("measurements")
        .delete()
        .eq("id", measurementId);

      if (error) throw error;
      toast.success("Measurement deleted successfully!");
      fetchPatientData();
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to delete measurement"} (Code: ${error.code || 'UNKNOWN'})`);
    }
  };

  const handleSaveTherapyPlan = async () => {
    if (!patient || !user) return;

    setSavingPlan(true);
    try {
      const planData = {
        patient_id: patient.id,
        doctor_id: user.id,
        goal_force: planForm.goal_force,
        reps_per_day: parseInt(planForm.reps_per_day) || null,
        hold_time: parseInt(planForm.hold_time) || null,
        instructions: planForm.instructions,
      };

      if (therapyPlan) {
        // Update existing plan
        const { error } = await supabase
          .from("therapy_plans")
          .update(planData)
          .eq("id", therapyPlan.id);

        if (error) throw error;
      } else {
        // Create new plan
        const { error } = await supabase
          .from("therapy_plans")
          .insert([planData]);

        if (error) throw error;
      }

      toast.success("Therapy plan saved successfully!");
      await fetchPatientData();
    } catch (error: any) {
      console.error("Error saving therapy plan:", error);
      toast.error("Failed to save therapy plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const prepareChartData = () => {
    return measurements.slice(0, 10).reverse().map((m, i) => ({
      name: `#${i + 1}`,
      "UL": parseFloat(m.unilateral_left || "0"),
      "UR": parseFloat(m.unilateral_right || "0"),
      "BL": parseFloat(m.bilateral_left || "0"),
      "BR": parseFloat(m.bilateral_right || "0"),
      "Inc": parseFloat(m.incisors || "0"),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Patient Not Found</h2>
          <p className="text-muted-foreground">The requested patient record could not be found.</p>
          <Button onClick={() => navigate("/doctor")} variant="medical">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-lightblue px-6 py-8 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="theme" onClick={() => navigate(-1)} className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
              <h1 className="text-3xl font-bold">Patient Details</h1>
            </div>
            <div className="flex gap-2"><ThemeToggle /><Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="hover:bg-background/10"><Settings className="h-5 w-5" /></Button></div>
          </div>
          <div className="space-y-1 text-lg"><p>ID: {patient.patient_id}</p><p>Name: {patient.name}</p><p>Age: {patient.age}</p></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {!showMonitor && !showBluetoothMonitor && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() => setShowBluetoothMonitor(true)}
              size="lg"
              variant="default"
              className="text-lg"
            >
              <Activity className="mr-2 h-5 w-5" />
              ESP32 Monitor
            </Button>
            <Button
              onClick={() => setShowMonitor(true)}
              size="lg"
              variant="theme"
              className="text-lg"
            >
              <FileText className="mr-2 h-5 w-5" />
              Manual Entry
            </Button>
          </div>
        )}

        {showBluetoothMonitor && (
          <div className="mb-8">
            <BluetoothBiteForceMonitor
              patientId={patientId!}
              onMeasurementSaved={() => {
                setShowBluetoothMonitor(false);
                fetchPatientData();
              }}
            />
          </div>
        )}

        <Tabs defaultValue="readings">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="readings"><FileText className="w-4 h-4 mr-2" />Readings</TabsTrigger>
            <TabsTrigger value="graphs"><BarChart3 className="w-4 h-4 mr-2" />Graphs</TabsTrigger>
            <TabsTrigger value="therapy"><Save className="w-4 h-4 mr-2" />Therapy Plan</TabsTrigger>
            <TabsTrigger value="appointments"><Calendar className="w-4 h-4 mr-2" />Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="readings" className="space-y-4 mt-6">
            {measurements.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">No measurements yet</p>
                <p className="text-sm text-muted-foreground">Add the first measurement to get started</p>
              </Card>
            ) : (
              measurements.map((m, i) => (
                <Card key={m.id} className="p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="font-semibold text-lg">Measurement #{measurements.length - i}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()} at {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMeasurement(m.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Unilateral Left</p>
                      <p className="font-medium">{m.unilateral_left || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Unilateral Right</p>
                      <p className="font-medium">{m.unilateral_right || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Bilateral Left</p>
                      <p className="font-medium">{m.bilateral_left || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Bilateral Right</p>
                      <p className="font-medium">{m.bilateral_right || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Incisors</p>
                      <p className="font-medium">{m.incisors || 'N/A'}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="graphs" className="mt-6">
            {measurements.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">No data to display</p>
                <p className="text-sm text-muted-foreground">Measurements will appear here as graphs</p>
              </Card>
            ) : (
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">Bite Force Over Time</h3>
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={400} minWidth={300}>
                    <LineChart data={prepareChartData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="UL" stroke="hsl(var(--primary))" strokeWidth={2} name="Unilateral Left" />
                      <Line type="monotone" dataKey="UR" stroke="hsl(var(--success))" strokeWidth={2} name="Unilateral Right" />
                      <Line type="monotone" dataKey="BL" stroke="hsl(var(--accent))" strokeWidth={2} name="Bilateral Left" />
                      <Line type="monotone" dataKey="BR" stroke="hsl(var(--destructive))" strokeWidth={2} name="Bilateral Right" />
                      <Line type="monotone" dataKey="Inc" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Incisors" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="therapy" className="mt-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-semibold">Therapy Plan Editor</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure the patient's therapy plan. This will be visible on their dashboard.
                  </p>
                </div>
                <Button onClick={handleSaveTherapyPlan} disabled={savingPlan}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingPlan ? "Saving..." : "Save Plan"}
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="goal_force">Goal Force</Label>
                  <Input
                    id="goal_force"
                    placeholder="e.g., 150N"
                    value={planForm.goal_force}
                    onChange={(e) => setPlanForm({ ...planForm, goal_force: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reps_per_day">Reps per Day</Label>
                  <Input
                    id="reps_per_day"
                    type="number"
                    placeholder="e.g., 10"
                    value={planForm.reps_per_day}
                    onChange={(e) => setPlanForm({ ...planForm, reps_per_day: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hold_time">Hold Time (seconds)</Label>
                  <Input
                    id="hold_time"
                    type="number"
                    placeholder="e.g., 5"
                    value={planForm.hold_time}
                    onChange={(e) => setPlanForm({ ...planForm, hold_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Enter detailed instructions for the patient..."
                  rows={6}
                  value={planForm.instructions}
                  onChange={(e) => setPlanForm({ ...planForm, instructions: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Patient Contact Info</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Patient ID:</span> {patient.patient_id}</p>
                  <p><span className="text-muted-foreground">Name:</span> {patient.name}</p>
                  <p><span className="text-muted-foreground">Age:</span> {patient.age} years</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appointments"><Card className="p-8 text-center"><Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">Coming soon</p></Card></TabsContent>
        </Tabs>
      </div>

      {/* BiteForce Monitor Modal */}
      {showMonitor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <BiteForceMonitor
              onSave={handleSaveMeasurement}
              onCancel={() => setShowMonitor(false)}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
