/// <reference path="../types/bluetooth.d.ts" />

import { useState, useEffect, useRef } from "react";
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

const BluetoothBiteForceMonitor = ({ patientId, onMeasurementSaved }: BluetoothBiteForceMonitorProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentForce, setCurrentForce] = useState<number>(0);
  const [measurements, setMeasurements] = useState<{
    unilateralLeft: number[];
    unilateralRight: number[];
    bilateralLeft: number[];
    bilateralRight: number[];
    incisors: number[];
  }>({
    unilateralLeft: [],
    unilateralRight: [],
    bilateralLeft: [],
    bilateralRight: [],
    incisors: [],
  });
  const [currentMeasurementType, setCurrentMeasurementType] = useState<
    "unilateralLeft" | "unilateralRight" | "bilateralLeft" | "bilateralRight" | "incisors"
  >("unilateralLeft");
  const [isSaving, setIsSaving] = useState(false);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connectToESP32 = async () => {
    if (!navigator.bluetooth) {
      toast.error("Web Bluetooth is not supported in this browser");
      return;
    }

    setIsConnecting(true);
    try {
      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"] }],
        optionalServices: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"],
      });

      deviceRef.current = device;

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect to GATT server");

      // Get service and characteristic
      const service = await server.getPrimaryService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
      const characteristic = await service.getCharacteristic("beb5483e-36e1-4688-b7f5-ea07361b26a8");

      characteristicRef.current = characteristic;

      // Start notifications
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

  const handleForceData = (event: Event) => {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    // Parse the force value (assuming ESP32 sends float as 4 bytes)
    const dataView = new DataView(value.buffer);
    const force = dataView.getFloat32(0, true); // true for little-endian

    setCurrentForce(force);
    console.log("Received force:", force, "N");
  };

  const recordMeasurement = () => {
    if (currentForce > 0) {
      setMeasurements((prev) => ({
        ...prev,
        [currentMeasurementType]: [...prev[currentMeasurementType], currentForce],
      }));
      toast.success(`Recorded ${currentForce.toFixed(2)}N for ${currentMeasurementType}`);
    }
  };

  const saveMeasurements = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from("measurements").insert({
        patient_id: patientId,
        unilateral_left: measurements.unilateralLeft.map((v) => v.toFixed(2)).join(", "),
        unilateral_right: measurements.unilateralRight.map((v) => v.toFixed(2)).join(", "),
        bilateral_left: measurements.bilateralLeft.map((v) => v.toFixed(2)).join(", "),
        bilateral_right: measurements.bilateralRight.map((v) => v.toFixed(2)).join(", "),
        incisors: measurements.incisors.map((v) => v.toFixed(2)).join(", "),
        notes: "Recorded via Bluetooth ESP32",
      });

      if (error) throw error;

      toast.success("Measurements saved successfully!");
      setMeasurements({
        unilateralLeft: [],
        unilateralRight: [],
        bilateralLeft: [],
        bilateralRight: [],
        incisors: [],
      });
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">ESP32 BiteForce Monitor</h3>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Measurement Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "unilateralLeft", label: "Unilateral Left" },
                  { value: "unilateralRight", label: "Unilateral Right" },
                  { value: "bilateralLeft", label: "Bilateral Left" },
                  { value: "bilateralRight", label: "Bilateral Right" },
                  { value: "incisors", label: "Incisors" },
                ].map((type) => (
                  <Button
                    key={type.value}
                    variant={currentMeasurementType === type.value ? "default" : "outline"}
                    onClick={() =>
                      setCurrentMeasurementType(
                        type.value as typeof currentMeasurementType
                      )
                    }
                    className="text-xs"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={recordMeasurement}
              className="w-full"
              variant="secondary"
              size="lg"
            >
              Record Current Reading
            </Button>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Recorded Measurements:</p>
              {Object.entries(measurements).map(([key, values]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1")}:
                  </span>
                  <span className="font-mono">
                    {values.length > 0
                      ? values.map((v) => v.toFixed(2)).join(", ")
                      : "No data"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={disconnectFromESP32}
                variant="outline"
                className="flex-1"
              >
                Disconnect
              </Button>
              <Button
                onClick={saveMeasurements}
                disabled={
                  isSaving ||
                  Object.values(measurements).every((arr) => arr.length === 0)
                }
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save to Database"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950">
        <h4 className="font-semibold mb-2 text-sm">Instructions:</h4>
        <ol className="text-xs space-y-1 text-muted-foreground">
          <li>1. Power on your ESP32 BiteForce sensor</li>
          <li>2. Click "Connect to ESP32" and select your device</li>
          <li>3. Select the measurement type (e.g., Unilateral Left)</li>
          <li>4. Have the patient bite on the FSR sensor</li>
          <li>5. Click "Record Current Reading" to save the value</li>
          <li>6. Repeat for different measurement types</li>
          <li>7. Click "Save to Database" to store all measurements</li>
        </ol>
      </Card>
    </div>
  );
};

export default BluetoothBiteForceMonitor;
