import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3, Calendar, ArrowLeft, Settings } from "lucide-react";
import BiteForceMonitor from "@/components/BiteForceMonitor";
import { toast } from "sonner";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchPatientData();
  }, [patientId, user]);

  const fetchPatientData = async () => {
    try {
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      setPatient(patientData);

      const { data: measurementsData } = await supabase
        .from("measurements")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      setMeasurements(measurementsData || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeasurement = async (data: any) => {
    await supabase.from("measurements").insert([
      {
        patient_id: patientId,
        unilateral_left: data.unilateralLeft,
        unilateral_right: data.unilateralRight,
        bilateral_left: data.bilateralLeft,
        bilateral_right: data.bilateralRight,
        incisors: data.incisors,
      },
    ]);
    toast.success("Measurement saved!");
    setShowMonitor(false);
    fetchPatientData();
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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  if (!patient) return <div className="min-h-screen bg-background flex items-center justify-center"><Button onClick={() => navigate("/doctor")}>Back</Button></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-purple px-6 py-8 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/doctor")} className="text-white hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-3xl font-bold">Patient Details</h1>
            </div>
            <div className="flex gap-2"><ThemeToggle /><Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="text-white hover:bg-white/10"><Settings className="h-5 w-5" /></Button></div>
          </div>
          <div className="space-y-1 text-lg"><p>ID: {patient.patient_id}</p><p>Name: {patient.name}</p><p>Age: {patient.age}</p></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <Button variant="medical" size="lg" className="w-full" onClick={() => setShowMonitor(true)}>Add Measurement</Button>

        <Tabs defaultValue="readings"><TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="readings"><FileText className="w-4 h-4 mr-2" />Readings</TabsTrigger>
          <TabsTrigger value="graphs"><BarChart3 className="w-4 h-4 mr-2" />Graphs</TabsTrigger>
          <TabsTrigger value="appointments"><Calendar className="w-4 h-4 mr-2" />Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="readings" className="space-y-4 mt-6">
          {measurements.length === 0 ? <p className="text-center text-muted-foreground py-8">No measurements</p> : measurements.map((m, i) => (
            <Card key={m.id} className="p-6 space-y-3"><p className="font-semibold">Measurement #{measurements.length - i}</p><p className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</p><div className="space-y-2"><p>UL: {m.unilateral_left}</p><p>UR: {m.unilateral_right}</p><p>BL: {m.bilateral_left}</p><p>BR: {m.bilateral_right}</p><p>Inc: {m.incisors}</p></div></Card>
          ))}
        </TabsContent>

        <TabsContent value="graphs" className="mt-6">
          {measurements.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">No data</p></Card> : (
            <Card className="p-6"><h3 className="text-lg font-semibold mb-4">Bite Force Over Time</h3><ResponsiveContainer width="100%" height={400}><LineChart data={prepareChartData()}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="UL" stroke="#8884d8" strokeWidth={2} /><Line type="monotone" dataKey="UR" stroke="#82ca9d" strokeWidth={2} /><Line type="monotone" dataKey="BL" stroke="#ffc658" strokeWidth={2} /><Line type="monotone" dataKey="BR" stroke="#ff7c7c" strokeWidth={2} /><Line type="monotone" dataKey="Inc" stroke="#a78bfa" strokeWidth={2} /></LineChart></ResponsiveContainer></Card>
          )}
        </TabsContent>

        <TabsContent value="appointments"><Card className="p-8 text-center"><Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">Coming soon</p></Card></TabsContent>
        </Tabs>
      </div>

      {/* BiteForce Monitor Modal */}
      {showMonitor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BiteForceMonitor
              onSave={handleSaveMeasurement}
              onCancel={() => setShowMonitor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
