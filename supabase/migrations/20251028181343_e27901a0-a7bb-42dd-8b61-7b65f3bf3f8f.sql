
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('doctor', 'patient');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create measurements table
CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  unilateral_left TEXT,
  unilateral_right TEXT,
  bilateral_left TEXT,
  bilateral_right TEXT,
  incisors TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only system can manage roles" ON public.user_roles FOR ALL USING (false);

-- RLS Policies for patients
CREATE POLICY "Doctors can view their patients" ON public.patients FOR SELECT 
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());
  
CREATE POLICY "Patients can view their own record" ON public.patients FOR SELECT 
  USING (public.has_role(auth.uid(), 'patient') AND user_id = auth.uid());
  
CREATE POLICY "Doctors can create patients" ON public.patients FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());
  
CREATE POLICY "Doctors can update their patients" ON public.patients FOR UPDATE 
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());
  
CREATE POLICY "Doctors can delete their patients" ON public.patients FOR DELETE 
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());

-- RLS Policies for measurements
CREATE POLICY "Doctors can view measurements of their patients" ON public.measurements FOR SELECT 
  USING (
    public.has_role(auth.uid(), 'doctor') AND 
    EXISTS (SELECT 1 FROM public.patients WHERE patients.id = measurements.patient_id AND patients.doctor_id = auth.uid())
  );

CREATE POLICY "Patients can view their own measurements" ON public.measurements FOR SELECT 
  USING (
    public.has_role(auth.uid(), 'patient') AND 
    EXISTS (SELECT 1 FROM public.patients WHERE patients.id = measurements.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Doctors can create measurements" ON public.measurements FOR INSERT 
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') AND 
    EXISTS (SELECT 1 FROM public.patients WHERE patients.id = measurements.patient_id AND patients.doctor_id = auth.uid())
  );

-- RLS Policies for appointments
CREATE POLICY "Doctors can view their appointments" ON public.appointments FOR SELECT 
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());
  
CREATE POLICY "Patients can view their appointments" ON public.appointments FOR SELECT 
  USING (
    public.has_role(auth.uid(), 'patient') AND 
    EXISTS (SELECT 1 FROM public.patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Doctors can create appointments" ON public.appointments FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());

CREATE POLICY "Doctors can update their appointments" ON public.appointments FOR UPDATE 
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());

CREATE POLICY "Doctors can delete their appointments" ON public.appointments FOR DELETE 
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());

-- Create function and trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
