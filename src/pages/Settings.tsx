import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, LogOut, User, Bell, Trash2, Loader2, Mail, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [notifications, setNotifications] = useState({
    measurements: true,
    appointments: true,
    updates: true,
  });

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      setDeleting(true);
      
      // Call the edge function to delete the user account completely
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("No active session found");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      toast.success("Account deleted successfully");
      await signOut();
      navigate("/");
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(`Error: ${error.message || "Failed to delete account"} (Code: ${error.code || 'UNKNOWN'})`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-medical px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(role === "doctor" ? "/doctor" : "/patient-dashboard")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
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

        {/* Notifications */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="measurements">New Measurements</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new measurements are recorded
                </p>
              </div>
              <Switch
                id="measurements"
                checked={notifications.measurements}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, measurements: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="appointments">Appointments</Label>
                <p className="text-sm text-muted-foreground">
                  Reminders for upcoming appointments
                </p>
              </div>
              <Switch
                id="appointments"
                checked={notifications.appointments}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, appointments: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="updates">Patient Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Updates about your {role === "doctor" ? "patients" : "treatment"}
                </p>
              </div>
              <Switch
                id="updates"
                checked={notifications.updates}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, updates: checked })
                }
              />
            </div>
          </div>
        </Card>

        {/* Contact Us */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Contact Us</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href="mailto:support@biteforce.app" className="text-primary hover:underline">
                support@biteforce.app
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Have questions or need help? We're here to assist you with any concerns about your account or the app.
            </p>
          </div>
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
