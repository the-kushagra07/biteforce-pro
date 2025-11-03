import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DoctorVerification {
  id: string;
  user_id: string;
  doctor_name: string | null;
  license_number: string | null;
  license_image_url: string | null;
  status: string;
  created_at: string;
}

const DoctorVerifications = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [verifications, setVerifications] = useState<DoctorVerification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "doctor") {
      navigate("/");
      return;
    }
    fetchVerifications();
  }, [user, role]);

  const fetchVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from("doctor_verifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error: any) {
      toast.error(`Error loading verifications: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("doctor_verifications")
        .update({
          status: newStatus,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Verification ${newStatus}!`);
      fetchVerifications();
    } catch (error: any) {
      toast.error(`Error updating status: ${error.message}`);
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
      <div className="bg-gradient-medical px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="theme" 
                onClick={() => navigate("/doctor")} 
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-white">Doctor Verifications</h1>
            </div>
            <ThemeToggle />
          </div>
          <p className="text-lg text-white/90">Review and approve doctor license submissions</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {verifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No verifications found</p>
            <p className="text-sm text-muted-foreground">Doctor license submissions will appear here</p>
          </Card>
        ) : (
          verifications.map((verification) => (
            <Card key={verification.id} className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* License Image */}
                {verification.license_image_url && (
                  <div className="lg:w-1/3">
                    <img
                      src={verification.license_image_url}
                      alt="Medical License"
                      className="w-full rounded-lg border border-border object-cover"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => window.open(verification.license_image_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">
                      {verification.doctor_name || "Name not extracted"}
                    </h3>
                    <Badge
                      variant={
                        verification.status === "approved"
                          ? "default"
                          : verification.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {verification.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">License Number</p>
                      <p className="font-medium">
                        {verification.license_number || "Not extracted"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {new Date(verification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {verification.status === "pending" && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="default"
                        onClick={() => handleUpdateStatus(verification.id, "approved")}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleUpdateStatus(verification.id, "rejected")}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorVerifications;
