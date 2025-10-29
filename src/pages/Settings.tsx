import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, LogOut, User, Bell, Shield, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      setDeleting(true);
      
      // Delete user data based on role
      if (role === "doctor") {
        // Delete all patients and their measurements
        const { data: patients } = await supabase
          .from("patients")
          .select("id")
          .eq("doctor_id", user.id);
        
        if (patients) {
          for (const patient of patients) {
            await supabase.from("measurements").delete().eq("patient_id", patient.id);
          }
          await supabase.from("patients").delete().eq("doctor_id", user.id);
        }
        await supabase.from("appointments").delete().eq("doctor_id", user.id);
      } else if (role === "patient") {
        // For patients, delete their patient record if it exists
        const { data: patient } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (patient) {
          await supabase.from("measurements").delete().eq("patient_id", patient.id);
          await supabase.from("appointments").delete().eq("patient_id", patient.id);
          await supabase.from("patients").delete().eq("user_id", user.id);
        }
      }
      
      // Delete user roles
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      
      // Delete profile
      await supabase.from("profiles").delete().eq("id", user.id);
      
      toast.success("Account data deleted successfully");
      await signOut();
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account data");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-purple px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(role === "doctor" ? "/doctor" : "/patient-dashboard")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {/* Profile Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Profile</h2>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Email: {user?.email}</p>
            <p className="text-muted-foreground">
              Role: <span className="capitalize">{role}</span>
            </p>
          </div>
        </Card>

        {/* Theme Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>
            <ThemeToggle />
          </div>
          <p className="text-sm text-muted-foreground">
            Toggle between light and dark mode
          </p>
        </Card>

        {/* Notifications Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Notification preferences (Coming soon)
          </p>
        </Card>

        {/* Sign Out */}
        <Card className="p-6 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </Card>

        {/* Delete Account */}
        <Card className="p-6 border-destructive/50">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. All your data will be permanently deleted.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={deleting}>
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
