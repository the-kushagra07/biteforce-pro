import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings, Plus, Users, Calendar, Loader2, Search, AlertCircle, TrendingDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);

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
        await fetchAlerts(data);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to load patients"} (Code: ${error.code || 'UNKNOWN'})`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async (patientsData: any[]) => {
    try {
      const alertsData = [];
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      for (const patient of patientsData) {
        // Check for recent measurements
        const { data: recentMeasurements, error } = await supabase
          .from("measurements")
          .select("*")
          .eq("patient_id", patient.id)
          .gte("created_at", threeDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(2);

        if (error) continue;

        // Alert if no measurements in 3 days
        if (!recentMeasurements || recentMeasurements.length === 0) {
          alertsData.push({
            type: "no_test",
            patientName: patient.name,
            patientId: patient.id,
            message: `${patient.name} hasn't tested in over 3 days`,
          });
        }

        // Alert if force dropped significantly
        if (recentMeasurements && recentMeasurements.length >= 2) {
          const latest = parseFloat(recentMeasurements[0]?.incisors || "0");
          const previous = parseFloat(recentMeasurements[1]?.incisors || "0");
          if (previous > 0 && latest < previous * 0.8) {
            alertsData.push({
              type: "force_drop",
              patientName: patient.name,
              patientId: patient.id,
              message: `${patient.name}'s force dropped ${Math.round((1 - latest/previous) * 100)}%`,
            });
          }
        }
      }

      setAlerts(alertsData);
    } catch (error) {
      console.error("Error fetching alerts:", error);
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
          email,
          date_of_birth: dateOfBirth,
          phone: phone || null,
          age: parseInt(age),
        },
      ]);

      if (error) throw error;
      
      toast.success("Patient added successfully! An invitation email will be sent to the patient.");
      setPatientId("");
      setName("");
      setEmail("");
      setDateOfBirth("");
      setPhone("");
      setAge("");
      setShowAddPatient(false);
      fetchPatients();
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to add patient"} (Code: ${error.code || 'UNKNOWN'})`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-medical px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white">
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
        {/* Patient Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search patients by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Actionable Alerts */}
        {alerts.length > 0 && (
          <Card className="p-6 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Actionable Alerts ({alerts.length})</h3>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, index) => (
                <Alert 
                  key={index} 
                  className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors" 
                  onClick={() => navigate(`/patient/${alert.patientId}`)}
                >
                  <AlertDescription className="flex items-center gap-2">
                    {alert.type === "force_drop" && <TrendingDown className="h-4 w-4" />}
                    {alert.type === "no_test" && <Clock className="h-4 w-4" />}
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </Card>
        )}

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
                  placeholder="e.g., P-1001"
                />
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jane.doe@email.com"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
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
          <h2 className="text-2xl font-bold mb-4">My Patient List</h2>
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
            ) : filteredPatients.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">
                  {searchQuery ? "No patients found matching your search." : "No patients yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "" : "Add your first patient to get started"}
                </p>
              </Card>
            ) : (
              filteredPatients.map((patient) => (
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
