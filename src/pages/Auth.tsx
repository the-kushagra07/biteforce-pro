import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, Loader2, Upload, KeyRound } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issuingBoard, setIssuingBoard] = useState("");
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const { signIn, user, role } = useAuth();
  const navigate = useNavigate();

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  // Listen for PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Don't redirect if in password recovery mode
    if (isPasswordRecovery) return;
    
    if (user && role) {
      navigate(role === "doctor" ? "/doctor" : "/patient-dashboard");
    }
  }, [user, role, navigate, isPasswordRecovery]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error("Image must be less than 500KB");
        e.target.value = "";
        return;
      }
      setLicenseImage(file);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (isDoctor && (!doctorName || !clinicName || !practiceAddress || !licenseNumber || !issuingBoard || !licenseImage)) {
      toast.error("Please fill in all doctor verification fields");
      return;
    }

    setLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        toast.error(signUpError.message);
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create account");
        return;
      }

      // If doctor, upload license and create verification record
      if (isDoctor && licenseImage) {
        const fileExt = licenseImage.name.split('.').pop();
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('doctor-licenses')
          .upload(fileName, licenseImage);

        if (uploadError) {
          toast.error("Failed to upload license image");
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('doctor-licenses')
          .getPublicUrl(fileName);

        const { error: verificationError } = await supabase
          .from('doctor_verifications')
          .insert({
            user_id: authData.user.id,
            doctor_name: doctorName,
            clinic_name: clinicName,
            practice_address: practiceAddress,
            license_number: licenseNumber,
            issuing_board: issuingBoard,
            license_image_url: publicUrl,
            status: 'pending',
          });

        if (verificationError) {
          toast.error("Failed to submit verification");
          return;
        }

        toast.success("Account created! Your doctor verification is pending approval.");
      } else {
        toast.success("Account created successfully! Please check your email to verify.");
      }

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDoctorName("");
      setClinicName("");
      setPracticeAddress("");
      setLicenseNumber("");
      setIssuingBoard("");
      setLicenseImage(null);
      setIsDoctor(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        setIsPasswordRecovery(false);
        setNewPassword("");
        setConfirmNewPassword("");
        // Sign out and let them sign in with new password
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Password Recovery Form
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen bg-gradient-medical flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <KeyRound className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="medical"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-medical flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">BiteForce</h1>
          <p className="text-muted-foreground">
            Welcome! Sign in or create an account.
          </p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <Button
                type="button"
                variant="link"
                className="px-0 text-sm text-primary"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot Password?
              </Button>

              <Button
                type="submit"
                className="w-full"
                variant="medical"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-doctor"
                  checked={isDoctor}
                  onCheckedChange={(checked) => setIsDoctor(checked as boolean)}
                />
                <Label htmlFor="is-doctor" className="cursor-pointer">
                  I am a doctor
                </Label>
              </div>

              {isDoctor && (
                <div className="space-y-4 p-4 border border-border rounded-md bg-muted/50">
                  <p className="text-sm font-medium text-muted-foreground mb-2">All fields are mandatory for doctor verification</p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="doctor-name">Full Legal Name *</Label>
                    <Input
                      id="doctor-name"
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      required={isDoctor}
                      placeholder="Dr. John Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinic-name">Clinic/Hospital Name *</Label>
                    <Input
                      id="clinic-name"
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      required={isDoctor}
                      placeholder="City Medical Center"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="practice-address">Practice Address *</Label>
                    <Input
                      id="practice-address"
                      type="text"
                      value={practiceAddress}
                      onChange={(e) => setPracticeAddress(e.target.value)}
                      required={isDoctor}
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license-number">Medical License Number *</Label>
                    <Input
                      id="license-number"
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required={isDoctor}
                      placeholder="12345678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuing-board">Issuing State/Country Medical Board *</Label>
                    <Input
                      id="issuing-board"
                      type="text"
                      value={issuingBoard}
                      onChange={(e) => setIssuingBoard(e.target.value)}
                      required={isDoctor}
                      placeholder="e.g., National Medical Commission (India)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license-image">
                      License Image (max 500KB) *
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="license-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        required={isDoctor}
                        className="cursor-pointer"
                      />
                      {licenseImage && (
                        <Upload className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a clear photo of your medical license for manual verification
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                variant="medical"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign Up
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
