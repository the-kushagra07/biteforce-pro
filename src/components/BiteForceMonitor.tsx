import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface BiteForceData {
  unilateralLeft: string;
  unilateralRight: string;
  bilateralLeft: string;
  bilateralRight: string;
  incisors: string;
}

interface BiteForceMonitorProps {
  onSave: (data: BiteForceData) => void;
  onCancel: () => void;
}

const BiteForceMonitor = ({ onSave, onCancel }: BiteForceMonitorProps) => {
  const [data, setData] = useState<BiteForceData>({
    unilateralLeft: "",
    unilateralRight: "",
    bilateralLeft: "",
    bilateralRight: "",
    incisors: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">BiteForce Monitor</h2>

      <Card className="p-6 bg-muted/30">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Unilateral Left:</Label>
            <Input
              type="text"
              placeholder="60, 43, 65, 32, 80"
              className="h-12 text-base rounded-lg"
              value={data.unilateralLeft}
              onChange={(e) =>
                setData({ ...data, unilateralLeft: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Unilateral Right:</Label>
            <Input
              type="text"
              placeholder="43, 67, 54"
              className="h-12 text-base rounded-lg"
              value={data.unilateralRight}
              onChange={(e) =>
                setData({ ...data, unilateralRight: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Bilateral Left:</Label>
            <Input
              type="text"
              placeholder="20"
              className="h-12 text-base rounded-lg"
              value={data.bilateralLeft}
              onChange={(e) =>
                setData({ ...data, bilateralLeft: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Bilateral Right:</Label>
            <Input
              type="text"
              placeholder="10"
              className="h-12 text-base rounded-lg"
              value={data.bilateralRight}
              onChange={(e) =>
                setData({ ...data, bilateralRight: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Incisors:</Label>
            <Input
              type="text"
              placeholder="32, 54, 76, 87, 92"
              className="h-12 text-base rounded-lg"
              value={data.incisors}
              onChange={(e) =>
                setData({ ...data, incisors: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              size="lg"
              className="flex-1 text-lg font-bold"
            >
              Save Data
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default BiteForceMonitor;
