"use client";

import { useState } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateMonthlyReport } from "./actions";

export function ReportsClient() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await generateMonthlyReport();
      if (res.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(res.error || "Unknown error occurred");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Generate Monthly Report
        </CardTitle>
        <CardDescription>
          Instantly generate a highly detailed AI performance report analyzing your tasks, habits, and mood over the past 30 days. The PDF will be emailed to your connected Caspian email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Generate & Email Report
              </>
            )}
          </Button>
          
          {status === "success" && (
            <p className="text-green-600 font-medium">Successfully generated and emailed!</p>
          )}
          {status === "error" && (
            <p className="text-red-500 font-medium">Error: {errorMessage}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
