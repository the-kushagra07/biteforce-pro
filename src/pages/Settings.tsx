import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, LogOut, User, Bell, Shield } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
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
        <Card className="p-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
