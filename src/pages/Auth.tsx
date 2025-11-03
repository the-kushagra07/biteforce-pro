import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, UserPlus, Loader2, ArrowLeft, Upload } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isDoctorSignup, setIsDoctorSignup] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const { signIn, signUp, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      navigate(role === "doctor" ? "/doctor" : "/patient-dashboard");
    } else if (user && !role) {
      navigate("/role-selection");
    }
  }, [user, role, navigate]);

  const handleLicenseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid image file (JPG, PNG, or WEBP)");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      
      setLicenseFile(file);
    }
  };

  const uploadLicenseAndExtractData = async (userId: string) => {
    if (!licenseFile) return { doctorName: null, licenseNumber: null };

    setUploadingLicense(true);
    try {
      // Upload to storage
      const fileExt = licenseFile.name.split('.').pop();
      const filePath = `${userId}/license.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('doctor-licenses')
        .upload(filePath, licenseFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('doctor-licenses')
        .getPublicUrl(filePath);

      // Convert image to base64 for OCR
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(licenseFile);
      });
      
      const imageBase64 = await base64Promise;

      // Call OCR edge function
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('extract-license-ocr', {
        body: { imageBase64 }
      });

      if (ocrError) {
        console.error('OCR error:', ocrError);
        toast.warning("License uploaded but automatic extraction failed. Manual verification required.");
      }

      // Insert into doctor_verifications table
      const { error: insertError } = await supabase
        .from('doctor_verifications')
        .insert({
          user_id: userId,
          doctor_name: ocrData?.doctorName || fullName,
          license_number: ocrData?.licenseNumber,
          license_image_url: publicUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      return { doctorName: ocrData?.doctorName, licenseNumber: ocrData?.licenseNumber };
    } catch (error: any) {
      console.error('License upload error:', error);
      toast.error("Failed to upload license. Please try again.");
      throw error;
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Logged in successfully!");
        }
      } else {
        // Sign up
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }

        toast.success("Account created! Please select your role.");
        
        // If doctor signup with license, handle upload in background
        if (isDoctorSignup && licenseFile) {
          // Wait briefly for auth state to update and get user
          setTimeout(async () => {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
                await uploadLicenseAndExtractData(currentUser.id);
                toast.success("License uploaded! Pending verification.");
              }
            } catch (uploadError) {
              console.error("License upload error:", uploadError);
              toast.warning("Please upload your license from settings later.");
            }
          }, 1000);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-medical flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md p-8 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">BiteForce</h1>
          <p className="text-muted-foreground">
            {isLogin ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  placeholder="Dr. John Doe"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDoctorSignup"
                  checked={isDoctorSignup}
                  onChange={(e) => setIsDoctorSignup(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isDoctorSignup" className="text-sm font-normal">
                  I am a doctor (upload medical license)
                </Label>
              </div>

              {isDoctorSignup && (
                <div className="space-y-2">
                  <Label htmlFor="license">Medical License (Required for doctors)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="license"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleLicenseUpload}
                      className="cursor-pointer"
                    />
                    {licenseFile && (
                      <Upload className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a clear photo of your medical license. AI will automatically extract your information.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={loading || uploadingLicense || (!isLogin && isDoctorSignup && !licenseFile)}
          >
            {loading || uploadingLicense ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadingLicense ? "Uploading license..." : isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : isLogin ? (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setIsLogin(!isLogin);
              setIsDoctorSignup(false);
              setLicenseFile(null);
            }}
            className="text-sm"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
