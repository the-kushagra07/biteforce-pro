import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      navigate(role === "doctor" ? "/doctor" : "/patient-dashboard");
    } else if (user && !role) {
      navigate("/role-selection");
    }
  }, [user, role, navigate]);

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
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account created! Please select your role.");
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
      <Card className="w-full max-w-md p-8 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">BiteForce</h1>
          <p className="text-muted-foreground">
            {isLogin ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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
            disabled={loading}
          >
            {loading ? (
              "Please wait..."
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
            onClick={() => setIsLogin(!isLogin)}
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
