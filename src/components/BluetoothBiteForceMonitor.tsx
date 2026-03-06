/// <reference path="../types/bluetooth.d.ts" />

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, BluetoothOff, Activity, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BluetoothBiteForceMonitorProps {
  patientId: string;
  onMeasurementSaved?: () => void;
}

const MEASUREMENT_TYPES = [
  { value: "unilateralLeft", label: "Unilateral Left" },
  { value: "unilateralRight", label: "Unilateral Right" },
  { value: "bilateralLeft", label: "Bilateral Left" },
  { value: "bilateralRight", label: "Bilateral Right" },
  { value: "incisors", label: "Incisors" },
] as const;

type MeasurementType = typeof MEASUREMENT_TYPES[number]["value"];

const BluetoothBiteForceMonitor = ({ patientId, onMeasurementSaved }: BluetoothBiteForceMonitorProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentForce, setCurrentForce] = useState<number>(0);
  const [measurements, setMeasurements] = useState<Record<MeasurementType, number[]>>({
    unilateralLeft: [],
    unilateralRight: [],
    bilateralLeft: [],
    bilateralRight: [],
    incisors: [],
  });
  const [currentMeasurementType, setCurrentMeasurementType] = useState<MeasurementType>("unilateralLeft");
  const [isSaving, setIsSaving] = useState(false);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const measurementTypeRef = useRef<MeasurementType>(currentMeasurementType);

  // Keep ref in sync with state
  useEffect(() => {
    measurementTypeRef.current = currentMeasurementType;
  }, [currentMeasurementType]);

  const handleForceData = useCallback((event: Event) => {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    // Decode as UTF-8 string from ESP32
    const decoder = new TextDecoder("utf-8");
    const decoded = decoder.decode(value).trim();

    // Check if ESP32 is sending a menu/type change command (e.g., "TYPE:unilateralRight")
    if (decoded.startsWith("TYPE:")) {
      const newType = decoded.substring(5).trim();
      const validType = MEASUREMENT_TYPES.find(t => t.value === newType);
      if (validType) {
        setCurrentMeasurementType(validType.value);
        console.log("Menu changed to:", validType.label);
      }
      return;
    }

    // Parse as force value
    const force = parseFloat(decoded);
    if (isNaN(force)) {
      console.warn("Received non-numeric data:", decoded);
      return;
    }

    console.log("Received force:", force, "N");
    setCurrentForce(force);

    // Auto-record: automatically add every valid reading to the current measurement type
    if (force > 0) {
      setMeasurements(prev => ({
        ...prev,
        [measurementTypeRef.current]: [...prev[measurementTypeRef.current], force],
      }));
    }
  }, []);

  const connectToESP32 = async () => {
    if (!navigator.bluetooth) {
      toast.error("Web Bluetooth is not supported in this browser");
      return;
    }

    setIsConnecting(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"],
      });

      deviceRef.current = device;

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect to GATT server");

      const service = await server.getPrimaryService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
      const characteristic = await service.getCharacteristic("beb5483e-36e1-4688-b7f5-ea07361b26a8");

      characteristicRef.current = characteristic;

      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", handleForceData);

      setIsConnected(true);
      toast.success("Connected to ESP32 BiteForce Sensor");
    } catch (error: any) {
      console.error("Bluetooth connection error:", error);
      toast.error(error.message || "Failed to connect to device");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromESP32 = () => {
    if (characteristicRef.current) {
      characteristicRef.current.removeEventListener("characteristicvaluechanged", handleForceData);
      characteristicRef.current = null;
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    setIsConnected(false);
    toast.info("Disconnected from ESP32");
  };

  const clearMeasurements = () => {
    setMeasurements({
      unilateralLeft: [],
      unilateralRight: [],
      bilateralLeft: [],
      bilateralRight: [],
      incisors: [],
    });
  };

  const saveMeasurements = async () => {
    const hasData = Object.values(measurements).some(arr => arr.length > 0);
    if (!hasData) {
      toast.error("No data recorded yet.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("measurements").insert({
        patient_id: patientId,
        unilateral_left: measurements.unilateralLeft.map(v => v.toFixed(2)).join(", "),
        unilateral_right: measurements.unilateralRight.map(v => v.toFixed(2)).join(", "),
        bilateral_left: measurements.bilateralLeft.map(v => v.toFixed(2)).join(", "),
        bilateral_right: measurements.bilateralRight.map(v => v.toFixed(2)).join(", "),
        incisors: measurements.incisors.map(v => v.toFixed(2)).join(", "),
        notes: "Recorded via Bluetooth ESP32 (auto)",
      });

      if (error) throw error;

      toast.success("Measurements saved successfully!");
      clearMeasurements();
      onMeasurementSaved?.();
    } catch (error: any) {
      console.error("Error saving measurements:", error);
      toast.error("Failed to save measurements");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      disconnectFromESP32();
    };
  }, []);

  const totalReadings = Object.values(measurements).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">ESP32 Monitor</h3>
          </div>
          {isConnected ? (
            <Badge variant="default" className="bg-green-500">
              <Bluetooth className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              <BluetoothOff className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>

        {!isConnected ? (
          <Button
            onClick={connectToESP32}
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            <Bluetooth className="mr-2 h-5 w-5" />
            {isConnecting ? "Connecting..." : "Connect to ESP32"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Current Force Reading</p>
              <p className="text-4xl font-bold text-primary">{currentForce.toFixed(2)} N</p>
              <p className="text-xs text-muted-foreground mt-2">
                Auto-recording to: <span className="font-semibold text-foreground">{MEASUREMENT_TYPES.find(t => t.value === currentMeasurementType)?.label}</span>
              </p>
              <p className="text-xs text-muted-foreground">Total readings: {totalReadings}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Active Measurement Type (synced with OLED)</label>
              <div className="grid grid-cols-2 gap-2">
                {MEASUREMENT_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant={currentMeasurementType === type.value ? "default" : "outline"}
                    onClick={() => setCurrentMeasurementType(type.value)}
                    className="text-xs"
                  >
                    {type.label}
                    {measurements[type.value].length > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">({measurements[type.value].length})</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Recorded Measurements:</p>
              {MEASUREMENT_TYPES.map(({ value, label }) => (
                <div key={value} className="flex justify-between">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-mono text-xs max-w-[60%] text-right truncate">
                    {measurements[value].length > 0
                      ? measurements[value].map(v => v.toFixed(2)).join(", ")
                      : "No data"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={disconnectFromESP32} variant="outline" className="flex-1">
                Disconnect
              </Button>
              <Button onClick={clearMeasurements} variant="outline" className="flex-1">
                Clear
              </Button>
              <Button
                onClick={saveMeasurements}
                disabled={isSaving || totalReadings === 0}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950">
        <h4 className="font-semibold mb-2 text-sm">How it works:</h4>
        <ol className="text-xs space-y-1 text-muted-foreground">
          <li>1. Connect to your ESP32 BiteForce sensor</li>
          <li>2. The active measurement type syncs with your OLED menu automatically</li>
          <li>3. All force readings are auto-recorded in real-time</li>
          <li>4. Click "Save" when you're done to store all measurements</li>
        </ol>
      </Card>
    </div>
  );
};

export default BluetoothBiteForceMonitor;
