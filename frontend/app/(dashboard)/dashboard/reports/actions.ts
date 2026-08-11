"use server"

import { auth } from "@/auth";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function generateMonthlyReport() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    // Determine the absolute path to the backend directory where the virtual environment is
    // This assumes the frontend and backend are siblings in the same project root
    const backendDir = path.resolve(process.cwd(), "../backend");
    
    // We execute the report_agent.py script from the backend virtual environment
    // The python script will write the PDF and send the email
    const pythonExecutable = process.platform === "win32" 
      ? path.join(backendDir, "env", "Scripts", "python.exe")
      : path.join(backendDir, "env", "bin", "python");

    const scriptPath = path.join(backendDir, "agents", "report_agent.py");

    console.log(`Executing report generation for ${session.user.id}`);
    const { stdout, stderr } = await execAsync(`"${pythonExecutable}" "${scriptPath}" "${session.user.id}"`, {
      cwd: backendDir,
    });

    console.log(stdout);
    if (stderr) console.error(stderr);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to generate report:", error);
    return { success: false, error: error.message };
  }
}
