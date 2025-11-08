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
import { LogIn, Loader2, Upload } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  const { signIn, user, role } = useAuth();
  const navigate = useNavigate();

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  useEffect(() => {
    if (user && role) {
      navigate(role === "doctor" ? "/doctor" : "/patient-dashboard");
    }
  }, [user, role, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024) {
        toast.error("Image must be less than 200KB");
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

    if (isDoctor && (!doctorName || !licenseNumber || !licenseImage)) {
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
            license_number: licenseNumber,
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
      setLicenseNumber("");
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
                  <div className="space-y-2">
                    <Label htmlFor="doctor-name">Doctor Name</Label>
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
                    <Label htmlFor="license-number">License Number</Label>
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
                    <Label htmlFor="license-image">
                      License Image (max 200KB)
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
                      Upload a clear photo of your medical license
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
