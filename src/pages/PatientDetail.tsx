import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, BarChart3 } from "lucide-react";
import BiteForceMonitor from "@/components/BiteForceMonitor";
import { toast } from "sonner";

interface Measurement {
  id: string;
  unilateralLeft: string;
  unilateralRight: string;
  bilateralLeft: string;
  bilateralRight: string;
  incisors: string;
  date: string;
}

const PatientDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"readings" | "graphs">("readings");
  const [showMonitor, setShowMonitor] = useState(false);
  
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    const stored = localStorage.getItem(`measurements_${patientId}`);
    return stored ? JSON.parse(stored) : [];
  });

  // Get patient info
  const patients = JSON.parse(localStorage.getItem("patients") || "[]");
  const patient = patients.find((p: any) => p.patientId === patientId);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Patient not found</h1>
          <Button onClick={() => navigate("/doctor")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveMeasurement = (data: Omit<Measurement, "id" | "date">) => {
    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      ...data,
      date: new Date().toISOString(),
    };

    const updatedMeasurements = [...measurements, newMeasurement];
    setMeasurements(updatedMeasurements);
    localStorage.setItem(
      `measurements_${patientId}`,
      JSON.stringify(updatedMeasurements)
    );
    
    setShowMonitor(false);
    toast.success("Measurement saved successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Purple Header */}
      <div className="bg-gradient-purple px-6 py-8 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto space-y-4 text-white animate-fade-in">
          <h1 className="text-3xl font-bold">Patient Details</h1>
          <div className="space-y-1 text-lg">
            <p>Patient ID: {patient.patientId}</p>
            <p>Name: {patient.name}</p>
            <p>Age: {patient.age}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <Button
          variant="medical"
          size="lg"
          className="w-full text-lg font-bold"
          onClick={() => setShowMonitor(true)}
        >
          Add New Slot
        </Button>

        {/* Tabs */}
        <Card className="p-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab("readings")}
              className={`flex items-center justify-center gap-2 py-4 rounded-lg transition-all ${
                activeTab === "readings"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Readings</span>
            </button>
            <button
              onClick={() => setActiveTab("graphs")}
              className={`flex items-center justify-center gap-2 py-4 rounded-lg transition-all ${
                activeTab === "graphs"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-semibold">Graphs</span>
            </button>
          </div>
        </Card>

        {/* Content */}
        {activeTab === "readings" && (
          <div className="space-y-4">
            {measurements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No measurements recorded yet
              </p>
            ) : (
              measurements.map((measurement) => (
                <Card key={measurement.id} className="p-6 space-y-3">
                  <p className="font-semibold text-lg">
                    Slot ID: {measurement.id.slice(-6)}
                  </p>
                  <div className="space-y-2 text-base">
                    <p>Unilateral Left: {measurement.unilateralLeft}</p>
                    <p>Unilateral Right: {measurement.unilateralRight}</p>
                    <p>Bilateral Left: {measurement.bilateralLeft}</p>
                    <p>Bilateral Right: {measurement.bilateralRight}</p>
                    <p>Incisors: {measurement.incisors}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "graphs" && (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              Graph view coming soon
            </p>
          </Card>
        )}
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
